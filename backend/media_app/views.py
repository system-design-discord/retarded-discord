"""Media endpoints.

Access is not decided here. `A-10` closed the last case in the codebase where a
module answered its own permission question: whether a file may be sent into a
restricted channel is `roles.services.may_send_media`'s answer, and this module
asks for it (architecture.tex §5.1).
"""

import mimetypes
import posixpath
from urllib.parse import quote

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import Q
from django.http import FileResponse, Http404, HttpResponse, HttpResponseForbidden
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_safe
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser

from channels_app.models import Topic
from common import messages, signed_media
from roles import services as roles

from .models import MediaFile
from .serializers import MediaFileSerializer


class MediaUploadView(generics.ListCreateAPIView):
    serializer_class = MediaFileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return MediaFile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Upload a file, optionally declaring the topic it is destined for.

        An upload carries no conversation of its own — the file is tied to one
        only later, when `media_id` is attached to a message — so `A-10`'s
        restriction has to be checked in both places or it is a bypass. The
        optional `topic` in the multipart body is what lets it be checked here,
        at the moment the composer already knows where the file is going.

        With no `topic` the view behaves exactly as it did before, which is what
        keeps DM and group uploads unaffected: neither has a channel, so neither
        has a restriction to evaluate. The attach-time check in
        `messaging.views` and `scheduling.views` is what closes the gap for an
        upload that declined to say.
        """
        topic_id = self.request.data.get('topic')
        if topic_id:
            topic = get_object_or_404(Topic, pk=topic_id)
            roles.require_channel_membership(self.request.user, topic.channel)
            roles.require_send_media(self.request.user, topic.channel)

        file_obj = self.request.data.get('file')
        content_type = file_obj.content_type if file_obj else None
        serializer.save(user=self.request.user, file_type=content_type)


class MediaDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = MediaFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # US-7.2 — the uploader, plus anyone in a conversation the file was
        # attached to. The check sits in front of the file, not on the path.
        #
        # A-6 — the topic arms were missing, so a channel member who could read
        # a message could not read the record of the image attached to it. The
        # clauses are the ones `MessageQuerySet._audience` already uses; a
        # conversation this view does not know about is a conversation it
        # refuses, which is the failure mode worth naming.
        user = self.request.user
        return MediaFile.objects.filter(
            Q(user=user)
            | Q(message__sender=user)
            | Q(message__recipient=user)
            | Q(message__group__members=user)
            | Q(message__topic__channel__memberships__user=user)
            | Q(message__topic__channel__owner=user)
        ).distinct()

    def perform_destroy(self, instance):
        """Reading a file and destroying it are not the same right.

        The queryset above admits everyone who shares the conversation, which is
        correct for `GET` and would be a data-loss hole for `DELETE`: a DM
        recipient, any group member and — since A-6 widened it — any channel
        member could remove somebody else's upload. Not filed in the audit;
        found while widening the scope, and fixed in the same change rather than
        left as a wider hole than the one being closed.
        """
        if instance.user_id != self.request.user.id:
            raise PermissionDenied(messages.NOT_MEDIA_OWNER)
        instance.delete()


@require_safe
def protected_media(request, path):
    """Serve an upload to whoever holds a signed link to it (A-1).

    Deliberately not an authenticated view: the SPA renders attachments and
    avatars in `<img>` and `<video>` tags, which send no `Authorization`
    header, so the token in the URL is the credential. `common.signed_media`
    explains the trade.

    The bytes themselves are nginx's job — this answers with `X-Accel-Redirect`
    into an `internal` location so daphne is not tied up streaming a file, and
    so the volume stays unreachable by any path a client can ask for directly.
    """
    name = posixpath.normpath(path).lstrip('/')
    if name == '..' or name.startswith('../') or '\\' in path:
        raise Http404

    if not signed_media.verify(name, request.GET.get(signed_media.TOKEN_PARAM)):
        return HttpResponseForbidden(messages.MEDIA_LINK_NOT_VALID)

    content_type = mimetypes.guess_type(name)[0] or 'application/octet-stream'

    if not settings.MEDIA_INTERNAL_REDIRECT:
        if not default_storage.exists(name):
            raise Http404
        return FileResponse(default_storage.open(name, 'rb'), content_type=content_type)

    response = HttpResponse(content_type=content_type)
    response['X-Accel-Redirect'] = settings.MEDIA_INTERNAL_LOCATION + quote(name)
    # nginx fills the body and its length from the file it opens.
    del response['Content-Length']
    # The volume holds whatever users uploaded; never let a browser re-decide
    # what a stored file is.
    response['X-Content-Type-Options'] = 'nosniff'
    return response
