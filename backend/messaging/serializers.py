from rest_framework import serializers

from accounts.serializers import UserSerializer
from common import messages
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
            'text', 'media', 'media_id', 'created_at',
            'is_edited', 'edited_at', 'scheduled_at', 'is_delivered',
        ]
        # `scheduled_at` is read-only *here* and writable only through
        # `scheduling.ScheduledMessageSerializer`, which re-opens it: posting to
        # /api/messages/ sends now, and scheduling is a different endpoint
        # rather than a flag on this one.
        read_only_fields = [
            'id', 'sender', 'created_at', 'is_edited', 'edited_at',
            'scheduled_at', 'is_delivered',
        ]

    def validate(self, attrs):
        """Exactly one target — US-2.1 (DM), US-2.2 (group), US-2.3 (topic).

        The same rule is enforced as a database check constraint, so a shell
        script cannot create a shape the API refuses.
        """
        targets = [field for field in TARGET_FIELDS if attrs.get(field)]

        if not targets:
            raise serializers.ValidationError(
                messages.MESSAGE_NEEDS_A_TARGET
            )
        if len(targets) > 1:
            raise serializers.ValidationError(
                messages.MESSAGE_NEEDS_ONE_TARGET
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
            'text', 'media', 'created_at', 'is_edited', 'edited_at',
            'scheduled_at', 'is_delivered',
        ]
        read_only_fields = [
            field for field in fields if field != 'text'
        ]

    def validate_text(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(messages.MESSAGE_TEXT_REQUIRED)
        return value


class MessageSearchSerializer(MessageSerializer):
    """A search hit — a message, plus which conversation it is in.

    "Results say which conversation each hit is in" is one of `M-08`'s
    acceptance criteria, and it is the whole reason a search result is a
    different shape from a message: in a chat you already know where you are,
    and in a list of hits across three kinds of conversation you do not.
    """

    conversation = serializers.SerializerMethodField()

    class Meta(MessageSerializer.Meta):
        fields = [*MessageSerializer.Meta.fields, 'conversation']

    def get_conversation(self, message):
        """`kind` is what the client routes on; `name` is what it shows.

        `id` is the id of the thing the SPA navigates to, which for a direct
        message is *the other person* — not the message, and not the caller.
        """
        if message.group_id is not None:
            return {'kind': 'group', 'id': message.group_id, 'name': message.group.name}

        if message.topic_id is not None:
            topic = message.topic
            return {
                'kind': 'topic',
                'id': topic.pk,
                'name': f'{topic.channel.name} › {topic.name}',
                'channel_id': topic.channel_id,
            }

        request = self.context.get('request')
        me = getattr(request, 'user', None)
        other = message.recipient if (me and message.sender_id == me.pk) else message.sender
        return {'kind': 'dm', 'id': other.pk, 'name': other.username}
