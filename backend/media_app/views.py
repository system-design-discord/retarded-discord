"""Media endpoints.

Access is not decided here. `A-10` closed the last case in the codebase where a
module answered its own permission question: whether a file may be sent into a
restricted channel is `roles.services.may_send_media`'s answer, and this module
asks for it (architecture.tex §5.1).
"""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.parsers import FormParser, MultiPartParser

from channels_app.models import Topic
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
        user = self.request.user
        return MediaFile.objects.filter(
            Q(user=user)
            | Q(message__sender=user)
            | Q(message__recipient=user)
            | Q(message__group__members=user)
        ).distinct()
