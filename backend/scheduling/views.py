from rest_framework import generics, permissions

from media_app.models import MediaFile
from messaging.models import Message
from roles import services as roles

from .serializers import ScheduledMessageSerializer


class ScheduledMessageCreateView(generics.CreateAPIView):
    """SC-02 — persist a message for future delivery without publishing it."""

    serializer_class = ScheduledMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        group = serializer.validated_data.get('group')
        topic = serializer.validated_data.get('topic')

        if group is not None:
            roles.require_group_membership(
                self.request.user,
                group,
            )

        if topic is not None:
            roles.require_channel_membership(
                self.request.user,
                topic.channel,
            )

        media_id = serializer.validated_data.pop(
            'media_id',
            None,
        )

        media = (
            MediaFile.objects.filter(
                id=media_id,
                user=self.request.user,
            ).first()
            if media_id
            else None
        )

        serializer.save(
            sender=self.request.user,
            media=media,
            is_delivered=False,
        )


class ScheduledMessageListView(generics.ListAPIView):
    """List only the caller's pending scheduled messages."""

    serializer_class = ScheduledMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Message.objects
            .filter(
                sender=self.request.user,
                scheduled_at__isnull=False,
                is_delivered=False,
            )
            .select_related(
                'sender',
                'recipient',
                'group',
                'topic__channel',
                'media',
            )
            .order_by(
                'scheduled_at',
                'pk',
            )
        )


class ScheduledMessageCancelView(generics.DestroyAPIView):
    """Cancel one pending schedule owned by the caller."""

    serializer_class = ScheduledMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(
            sender=self.request.user,
            scheduled_at__isnull=False,
            is_delivered=False,
        )
