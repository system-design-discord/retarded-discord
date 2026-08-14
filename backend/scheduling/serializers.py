from django.utils import timezone
from rest_framework import serializers

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
                "زمان‌بندی پیام باید برای زمانی در آینده باشد."
            )

        return value
