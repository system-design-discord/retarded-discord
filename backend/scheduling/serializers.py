from django.utils import timezone
from rest_framework import serializers

from common import messages
from messaging.serializers import MessageSerializer


class ScheduledMessageSerializer(MessageSerializer):
    """A message persisted now but intentionally delivered later."""

    scheduled_at = serializers.DateTimeField(required=True)

    class Meta(MessageSerializer.Meta):
        read_only_fields = [
            field
            for field in MessageSerializer.Meta.read_only_fields
            if field != 'scheduled_at'
        ]

    def validate_scheduled_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError(
                messages.SCHEDULE_MUST_BE_IN_THE_FUTURE
            )

        return value
