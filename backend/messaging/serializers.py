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
            'is_edited', 'edited_at',
        ]
        read_only_fields = ['id', 'sender', 'created_at', 'is_read', 'is_edited', 'edited_at']

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


class MessageEditSerializer(serializers.ModelSerializer):
    """M-06 — the *only* field an edit may touch is `text`.

    Editing through `MessageSerializer` would leave `recipient`, `group` and
    `topic` writable, so a PATCH could move somebody's message into a different
    conversation while keeping its author and timestamp. US-3.1 is about fixing a
    typo; it is not a re-address facility, and the narrower serializer is what
    makes that structural rather than a rule somebody has to remember.
    """

    sender = UserSerializer(read_only=True)
    media = MediaFileSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'recipient', 'group', 'topic',
            'text', 'media', 'created_at', 'is_read', 'is_edited', 'edited_at',
        ]
        read_only_fields = [
            field for field in fields if field != 'text'
        ]

    def validate_text(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("متن پیام نمی‌تواند خالی باشد.")
        return value
