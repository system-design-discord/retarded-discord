"""Channel, topic and membership serialization.

Nothing here decides access. Validation is about *shape* — a name that is not
blank, a topic name that is unique inside its channel — and every question of
*who may* is answered by `roles.services` in the view's permission class.
"""

from rest_framework import serializers

from accounts.serializers import PublicUserSerializer
from common import messages
from common.signed_media import SignedImageField

# `roles.services` reaches `channels_app.models`, never this module, so the
# import is one-directional and safe at module scope.
from roles import services as roles

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

    # A-2 — the owner's email is not part of a channel's public shape.
    owner = PublicUserSerializer(read_only=True)
    avatar = SignedImageField(required=False, allow_null=True)
    topics = TopicSerializer(many=True, read_only=True)
    member_count = serializers.IntegerField(source='memberships.count', read_only=True)
    my_permissions = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = [
            'id', 'owner', 'name', 'description', 'avatar',
            'media_restricted', 'created_at', 'member_count', 'topics',
            'my_permissions',
        ]
        read_only_fields = [
            'id', 'owner', 'created_at', 'member_count', 'topics', 'my_permissions',
        ]

    def get_my_permissions(self, obj):
        """What the caller may do here — `roles.permissions_for`, unchanged.

        **This exists so the SPA stops deciding for itself.** The channel list
        drew its Delete button from `channel.owner.id === user.id`, which is the
        one comparison `architecture.tex` §5.1 forbids: it is the client
        answering a permission question, and it answered it wrong — the owner is
        *a* holder of `can_delete_channel`, not the only one, so a member granted
        the permission by a role saw no control anywhere in the product.

        `/api/channels/<id>/me/permissions/` already answers this for one
        channel and stays where it is; a list of channels cannot afford a
        request each. The dict is the same eight keys from the same function, so
        there is one definition of the answer and two ways to ask for it.

        Anonymous or contextless — a serializer used outside a request, as the
        structural events do — gets `None` rather than a fabricated set of
        denials, because "I was not asked" and "you may do nothing" are
        different facts and a client should not have to guess which it got.
        """
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return None
        return roles.permissions_for(user, obj)

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

    user = PublicUserSerializer(read_only=True)
    role = serializers.CharField(source='role.name', read_only=True, allow_null=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = ChannelMember
        fields = ['id', 'user', 'role', 'is_owner', 'joined_at']
        read_only_fields = fields

    def get_is_owner(self, obj):
        return obj.channel.owner_id == obj.user_id
