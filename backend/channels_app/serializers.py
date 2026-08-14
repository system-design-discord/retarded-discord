"""Channel, topic and membership serialization.

Nothing here decides access. Validation is about *shape* — a name that is not
blank, a topic name that is unique inside its channel — and every question of
*who may* is answered by `roles.services` in the view's permission class.
"""

from rest_framework import serializers

from accounts.serializers import UserSerializer
from common import messages

from .models import Channel, ChannelMember, Topic


class TopicSerializer(serializers.ModelSerializer):
    """A named sub-conversation (US-4.5).

    `channel` is read-only and comes from the URL, not the body: a topic is
    created at `channels/<id>/topics/`, and letting the body name a different
    channel would route around the permission check that resolved that id.
    """

    class Meta:
        model = Topic
        fields = ['id', 'channel', 'name', 'created_at']
        read_only_fields = ['id', 'channel', 'created_at']

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError(messages.TOPIC_NAME_REQUIRED)

        # The database enforces this too. Checking here turns what would be a
        # 500 from the unique constraint into a 400 that says which field.
        channel = self.context['channel']
        clashes = Topic.objects.filter(channel=channel, name=name)
        if self.instance is not None:
            clashes = clashes.exclude(pk=self.instance.pk)
        if clashes.exists():
            raise serializers.ValidationError(messages.TOPIC_NAME_TAKEN)

        return name


class ChannelSerializer(serializers.ModelSerializer):
    """The channel itself, with enough of its contents to render a sidebar.

    `topics` is nested read-only so `F-04` can list channels and their topics in
    one request; writing a topic goes through the topic endpoints, where the
    `can_create_topic` gate lives.

    `media_restricted` is deliberately writable (A-10): `PATCH channels/<id>/`
    is the admin's toggle, and it needs no view of its own because the update
    view is already gated on `can_edit_channel`.
    """

    owner = UserSerializer(read_only=True)
    topics = TopicSerializer(many=True, read_only=True)
    member_count = serializers.IntegerField(source='memberships.count', read_only=True)

    class Meta:
        model = Channel
        fields = [
            'id', 'owner', 'name', 'description', 'avatar',
            'media_restricted', 'created_at', 'member_count', 'topics',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'member_count', 'topics']

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError(messages.CHANNEL_NAME_REQUIRED)
        return name


class ChannelMemberSerializer(serializers.ModelSerializer):
    """A membership row, read-only at the API.

    Joining is not a write to this shape — `POST channels/<id>/members/` takes a
    `user_id` and is gated on `can_add_member`, and the role a member holds is
    changed through the roles API, which owns that column.
    """

    user = UserSerializer(read_only=True)
    role = serializers.CharField(source='role.name', read_only=True, allow_null=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = ChannelMember
        fields = ['id', 'user', 'role', 'is_owner', 'joined_at']
        read_only_fields = fields

    def get_is_owner(self, obj):
        return obj.channel.owner_id == obj.user_id
