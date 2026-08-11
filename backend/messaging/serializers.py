from rest_framework import serializers

from accounts.serializers import UserSerializer
from media_app.serializers import MediaFileSerializer

from .models import Message

# The three mutually exclusive targets a message can have. Kept as one tuple so
# the validation below cannot drift out of step with the model's own check
# constraint when a fourth context is added.
TARGET_FIELDS = ('recipient', 'group', 'topic')


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    media = MediaFileSerializer(read_only=True)
    media_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'recipient', 'group', 'topic',
            'text', 'media', 'media_id', 'created_at', 'is_read',
        ]
        read_only_fields = ['id', 'sender', 'created_at', 'is_read']

    def validate(self, attrs):
        """Exactly one target — US-2.1 (DM), US-2.2 (group), US-2.3 (topic).

        The same rule is enforced as a database check constraint, so a shell
        script cannot create a shape the API refuses.
        """
        targets = [field for field in TARGET_FIELDS if attrs.get(field)]

        if not targets:
            raise serializers.ValidationError(
                "پیام باید دارای دریافت‌کننده (کاربر)، گروه یا تاپیک باشد."
            )
        if len(targets) > 1:
            raise serializers.ValidationError(
                "پیام باید تنها یک مقصد داشته باشد: کاربر، گروه یا تاپیک."
            )
        return attrs
