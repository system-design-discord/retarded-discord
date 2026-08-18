"""Messaging endpoints.

Two rules, and neither is decided here:

* **What you may read** is `Message.objects.visible_to(user)` — one definition,
  shared by the list view, the detail view and (later) `M-08`'s search.
* **What you may do** is `roles.services`' answer. architecture.tex §5.1: no
  module decides permissions for itself, and that includes this one.
"""

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions

from common import events
from media_app.models import MediaFile
from roles import services as roles

from .models import Message
from .serializers import MessageEditSerializer, MessageSearchSerializer, MessageSerializer


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """One scope, three conversation selectors.

        The scope is always `visible_to`; the query parameter only narrows it to
        a single conversation. Asking for a conversation you are not in
        therefore comes back empty rather than leaking somebody else's history.
        """
        user = self.request.user
        visible = Message.objects.visible_to(user)

        user_id = self.request.query_params.get('user_id')
        group_id = self.request.query_params.get('group_id')
        topic_id = self.request.query_params.get('topic_id')

        if user_id:
            return visible.filter(
                (Q(sender=user) & Q(recipient_id=user_id))
                | (Q(sender_id=user_id) & Q(recipient=user))
            )

        if group_id:
            return visible.filter(group_id=group_id)

        if topic_id:
            return visible.filter(topic_id=topic_id)

        return visible

    def perform_create(self, serializer):
        """A DM needs nothing — US-2.1 lets anyone write to anyone. A group or a
        topic message needs membership, which `roles` decides.

        Before this check any authenticated user could post into any group,
        which contradicted `M-02`'s own acceptance criterion.
        """
        group = serializer.validated_data.get('group')
        topic = serializer.validated_data.get('topic')

        if group is not None:
            roles.require_group_membership(self.request.user, group)
        if topic is not None:
            roles.require_channel_membership(self.request.user, topic.channel)
            # A-10 — attaching a file is the other half of the media
            # restriction. The upload endpoint checks it too, but an upload
            # need not name a topic, so without this line the attach is a
            # bypass. DMs and groups have no channel and are not asked.
            if serializer.validated_data.get('media_id'):
                roles.require_send_media(self.request.user, topic.channel)

        media_id = serializer.validated_data.pop('media_id', None)
        media_obj = MediaFile.objects.filter(id=media_id, user=self.request.user).first() if media_id else None
        message = serializer.save(sender=self.request.user, media=media_obj)

        # Notifications and the real-time gateway subscribe to this rather than
        # being imported here (architecture.tex §5.1, common/events.py). A
        # handler that raises is logged and skipped, so a failed notification
        # can never fail the message that triggered it.
        events.publish(events.MESSAGE_CREATED, message=message)


class MessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        """Reads use the full shape; writes use the text-only one — M-06."""
        if self.request.method in ('PUT', 'PATCH'):
            return MessageEditSerializer
        return MessageSerializer

    def get_queryset(self):
        """Everything the caller may read, PLUS their own unsent scheduled messages.

        This used to be `filter(sender=self.request.user)`, which meant a direct
        message you *received* was unreadable, and an admin could not reach a
        message in order to moderate it.

        This is `readable_by`, not `visible_to`: it also admits the caller's own
        *pending* scheduled messages, which no conversation view shows (SC-02)
        and whose author would otherwise get a 404 editing their own schedule.
        The queryset owns that distinction; this view only picks which of the two
        scopes it wants.
        """
        return Message.objects.readable_by(self.request.user)

    def perform_update(self, serializer):
        """US-3.1 and US-3.2 — only the author, and `roles` says who that is.

        Unlike deletion, no admin and no permission overrides this: a moderator
        removes a message, they do not rewrite it. The rule is
        `roles.services.may_edit_message`; this module only asks.
        """
        roles.require_edit_message(self.request.user, serializer.instance)
        message = serializer.save(is_edited=True, edited_at=timezone.now())

        # The other half of the conversation is looking at the old text. Without
        # this, the only thing that ever corrected it was `useConversation`'s
        # fallback poll — which backs off to thirty seconds precisely *while*
        # the socket is connected, so the edit read as "never, until I
        # refresh". Published on the seam rather than pushed from here, for the
        # same reason the create does it (architecture.tex §5.1).
        events.publish(events.MESSAGE_UPDATED, message=message)

    def perform_destroy(self, instance):
        """US-3.3 to US-3.6. The author, a group admin, a channel owner or a
        holder of `can_delete_message` — and this module decides none of it."""
        roles.require_delete_message(self.request.user, instance)

        # Captured before the write: `Model.delete()` sets `pk` to None, and an
        # announcement nobody can match to a row on screen is worthless. The
        # instance still goes along because its target FKs survive the delete,
        # and those are what name the conversation to fan out to.
        message_id = instance.pk
        instance.delete()

        events.publish(events.MESSAGE_DELETED, message=instance, message_id=message_id)


class MessageSearchView(generics.ListAPIView):
    """US-9.1 — search message text across all three kinds of conversation.

    There is no separate scope here and there must not be: the queryset is
    `visible_to(user).search(q)`, so the criterion "results never include
    messages from conversations the caller is not in" is a property of the
    composition rather than a check somebody has to keep in step with the list
    view. PostgreSQL full-text with a GIN index, which is what
    `architecture.tex` chose over standing up a second datastore.
    """

    serializer_class = MessageSearchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        term = self.request.query_params.get('q', '')

        return (
            Message.objects
            .visible_to(self.request.user)
            .search(term)
            .select_related('sender__profile', 'recipient', 'group', 'topic__channel', 'media')
        )
