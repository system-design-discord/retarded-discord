"""The channel API — C-02.

This module owns channels, topics and membership. It owns **none** of the
decisions about who may touch them: every gate below is a `required_permission`
read by `common.permissions.HasChannelPermission`, which asks `roles.services`.
architecture.tex §5.1 — no module decides permissions for itself — and there is
deliberately no `if user.id == channel.owner_id` anywhere in this package.

Messages inside a topic are `messaging`'s, not this module's. They are read at
`/api/messages/?topic_id=<id>` and written at `/api/messages/` with a `topic`;
a second message endpoint nested under a channel would be a fourth definition
of "messages this user may see".
"""

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from accounts.models import Profile
from common import events, messages
from common.mixins import ChannelScopedMixin
from common.permissions import HasChannelPermission, IsChannelMember
from roles import services as roles

from .models import Channel, ChannelMember, Topic
from .serializers import ChannelMemberSerializer, ChannelSerializer, TopicSerializer

User = get_user_model()


def _deletion_report(deleted_per_model):
    """Turn Django's `{'app.Model': n}` delete() tally into an API-shaped dict.

    Deleting a channel or a topic cascades. C-03's acceptance criterion is that
    it "does not silently delete its messages without saying so", so both
    endpoints answer 200 with what went with it rather than a bare 204.
    """
    return {
        'topics': deleted_per_model.get('channels_app.Topic', 0),
        'members': deleted_per_model.get('channels_app.ChannelMember', 0),
        'roles': deleted_per_model.get('roles.Role', 0),
        'messages': deleted_per_model.get('messaging.Message', 0),
    }


def _audience(channel):
    """Every user id that should hear about a change to this channel.

    Read **before** a destructive write and passed into the event, because a
    channel's `ChannelMember` rows cascade with it: a subscriber that looked the
    membership up afterwards would find none and tell nobody. `common/events.py`
    documents that as the shape of the whole structural family.

    The owner is unioned in rather than assumed. `Channel.objects.create_with_owner`
    writes them a membership row, but nothing in the schema *requires* one to
    survive, and the one person who implicitly holds every permission is the
    worst one to silently drop from a fan-out.
    """
    return sorted(
        set(channel.memberships.values_list('user_id', flat=True)) | {channel.owner_id}
    )


class ChannelListCreateView(generics.ListCreateAPIView):
    """US-4.1 — create a channel and become its admin.

    "Become its admin" needs no role row: `roles.services` treats the owner as
    implicitly holding all eight permissions, so ownership cannot be revoked by
    editing a table.
    """

    serializer_class = ChannelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Only channels the caller owns or has joined.

        The owner clause is not redundant with the membership one — it is what
        keeps the list correct if a membership row is ever removed by hand.
        """
        user = self.request.user
        return (
            Channel.objects
            .filter(Q(owner=user) | Q(memberships__user=user))
            .distinct()
            .select_related('owner__profile')
            .prefetch_related('topics')
        )

    def perform_create(self, serializer):
        # One call, two writes: ERD.tex makes Channel : ChannelMember 1 : 1..N,
        # so the creator's membership is part of creating the channel, not a
        # step a caller can forget.
        serializer.instance = Channel.objects.create_with_owner(
            owner=self.request.user, **serializer.validated_data
        )


class ChannelDetailView(ChannelScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    """Read, edit or delete one channel — US-4.7, US-4.10, US-6.1, US-6.2.

    Three different answers to "may you", so three different gates:

    | Method | Needs |
    |---|---|
    | `GET` | membership |
    | `PUT` / `PATCH` | `can_edit_channel` |
    | `DELETE` | `can_delete_channel` |
    """

    serializer_class = ChannelSerializer

    WRITE_PERMISSIONS = {
        'PUT': 'can_edit_channel',
        'PATCH': 'can_edit_channel',
        'DELETE': 'can_delete_channel',
    }

    @property
    def required_permission(self):
        """Read by HasChannelPermission. A property rather than a constant
        because this one view answers for three different permissions."""
        return self.WRITE_PERMISSIONS[self.request.method]

    def get_permissions(self):
        if self.request.method in self.WRITE_PERMISSIONS:
            return [permissions.IsAuthenticated(), HasChannelPermission()]
        return [permissions.IsAuthenticated(), IsChannelMember()]

    def get_object(self):
        return self.get_channel()

    def perform_update(self, serializer):
        channel = serializer.save()
        # Notifications does not subscribe to this one; the gateway does, so
        # every other member's list, header and settings screen corrects itself
        # instead of waiting for a remount.
        events.publish(
            events.CHANNEL_UPDATED,
            audience=_audience(channel),
            channel_id=channel.pk,
            payload=self.get_serializer(channel).data,
        )

    def destroy(self, request, *args, **kwargs):
        """200 with what went with it, not a silent 204.

        A channel takes its topics, memberships, roles and every message in
        them. Django's own delete() tally is the honest source for that count.
        """
        channel = self.get_object()
        # Before the delete, and that is the whole reason the event carries an
        # audience: `ChannelMember` cascades, so a moment from now there is
        # nobody left to address the news to.
        audience = _audience(channel)
        channel_id = channel.pk

        _, deleted_per_model = channel.delete()

        events.publish(
            events.CHANNEL_DELETED, audience=audience, channel_id=channel_id,
        )
        return Response({'deleted': _deletion_report(deleted_per_model)})


class TopicListCreateView(ChannelScopedMixin, generics.ListCreateAPIView):
    """US-4.5 — create topics so a channel's discussion is categorised.

    Reading needs only membership. `user_stories_en.tex` is explicit that a
    channel is a collection of topics and that **all** members may exchange
    messages in them — the restriction in US-2.4 is on media, not on posting —
    so there is no per-topic read gate to write here.
    """

    serializer_class = TopicSerializer
    required_permission = 'can_create_topic'

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), HasChannelPermission()]
        return [permissions.IsAuthenticated(), IsChannelMember()]

    def get_queryset(self):
        return Topic.objects.filter(channel=self.get_channel())

    def perform_create(self, serializer):
        topic = serializer.save(channel=self.get_channel())
        events.publish(
            events.TOPIC_CREATED,
            audience=_audience(topic.channel),
            channel_id=topic.channel_id,
            topic_id=topic.pk,
            payload=self.get_serializer(topic).data,
        )


class TopicDetailView(ChannelScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    """Read, rename or delete one topic.

    Renaming and deleting are channel administration, so they take
    `can_edit_channel` rather than `can_create_topic`: being trusted to open a
    discussion is not the same as being trusted to close somebody else's.
    """

    serializer_class = TopicSerializer
    required_permission = 'can_edit_channel'

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [permissions.IsAuthenticated(), HasChannelPermission()]
        return [permissions.IsAuthenticated(), IsChannelMember()]

    def get_queryset(self):
        """Scoped to the channel in the URL, so a topic belonging to another
        channel is a 404 here rather than something this gate decides on."""
        return Topic.objects.filter(channel=self.get_channel())

    def perform_update(self, serializer):
        topic = serializer.save()
        events.publish(
            events.TOPIC_UPDATED,
            audience=_audience(topic.channel),
            channel_id=topic.channel_id,
            topic_id=topic.pk,
            payload=self.get_serializer(topic).data,
        )

    def destroy(self, request, *args, **kwargs):
        """C-03: deleting a topic must not silently delete its messages.

        `Topic.messages` is CASCADE, so they go. The response says how many
        rather than answering 204 and leaving the caller to find out.

        It says so to the *caller*. Everybody else hears through TOPIC_DELETED,
        and they have to: a cascade at the database level never reaches
        `MessageDetailView.perform_destroy`, so not one of those messages
        publishes a MESSAGE_DELETED of its own. Another member sitting in this
        topic learns from this event or from nothing at all.
        """
        topic = self.get_object()
        audience = _audience(topic.channel)
        channel_id = topic.channel_id
        topic_id = topic.pk

        _, deleted_per_model = topic.delete()

        events.publish(
            events.TOPIC_DELETED,
            audience=audience,
            channel_id=channel_id,
            topic_id=topic_id,
        )
        return Response({'deleted_messages': _deletion_report(deleted_per_model)['messages']})


class ChannelMemberListCreateView(ChannelScopedMixin, generics.ListCreateAPIView):
    """US-4.4 and SH.1 — add a member to a channel directly.

    SH.1 records the team's decision to add users straight in rather than
    through an invite link, and **SH.2 is the other half of that decision**: the
    target's own `allow_invites` flag can refuse it. Both have to be real, so
    the flag is checked here on the write path, not only rendered in a settings
    screen — exactly as `groups_app` does for US-5.4.
    """

    serializer_class = ChannelMemberSerializer
    required_permission = 'can_add_member'

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), HasChannelPermission()]
        return [permissions.IsAuthenticated(), IsChannelMember()]

    def get_queryset(self):
        return (
            ChannelMember.objects
            .filter(channel=self.get_channel())
            .select_related('user__profile', 'role', 'channel')
        )

    def create(self, request, *args, **kwargs):
        channel = self.get_channel()

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'user_id': messages.USER_ID_REQUIRED}, status=status.HTTP_400_BAD_REQUEST)

        target = get_object_or_404(User, pk=user_id)

        if ChannelMember.objects.filter(channel=channel, user=target).exists():
            return Response(
                {'error': messages.ALREADY_CHANNEL_MEMBER.format(username=target.username)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # SH.2 / US-5.4 — the target's own flag decides, not the actor's rank.
        profile, _ = Profile.objects.get_or_create(user=target)
        if not profile.allow_invites:
            return Response(
                {'error': messages.USER_DISALLOWS_CHANNEL_INVITES.format(username=target.username)},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership = ChannelMember.objects.create(channel=channel, user=target)

        # Notifications and the real-time gateway subscribe to this rather than
        # being imported here (architecture.tex §5.1, common/events.py).
        #
        # The audience is read *after* the write here, unlike everywhere else in
        # this file: the person who was just added is the one who most needs the
        # frame — it is what puts the channel in their list without a reload —
        # and a moment ago they were not in the membership to read.
        events.publish(
            events.MEMBER_ADDED,
            audience=_audience(channel),
            channel=channel,
            user=target,
            actor=request.user,
        )

        return Response(
            self.get_serializer(membership).data, status=status.HTTP_201_CREATED
        )


class ChannelMemberDetailView(ChannelScopedMixin, generics.DestroyAPIView):
    """US-4.3 — remove a member from the channel, and A-10 — leave it.

    The owner cannot be removed: `ERD.tex` makes `Channel : ChannelMember` a
    `1 : 1..N` relationship, and removing the one member who implicitly holds
    every permission would leave a channel nobody can administer. That is a
    statement about the channel's shape rather than about who is asking, which
    is why it is a 400 here and not a refusal from `roles`.

    **No `required_permission`, and that is the A-10 change.** The class-level
    `HasChannelPermission` runs before `destroy` and answered 403 to a member
    trying to leave, so SH.2's *"so that I do not end up in groups or channels I
    do not want to join"* was enforced only up to the moment you were added.
    Whether the caller may remove *this* member depends on which member it is,
    so the question is asked once the URL has said — and it is still asked of
    `roles` (architecture.tex §5.1), which is why there is no `== request.user`
    comparison anywhere in this file.
    """

    serializer_class = ChannelMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(
            ChannelMember, channel=self.get_channel(), user_id=self.kwargs['user_id']
        )

    def destroy(self, request, *args, **kwargs):
        membership = self.get_object()

        roles.require_remove_channel_member(request.user, membership.channel, membership.user)

        if membership.channel.owner_id == membership.user_id:
            return Response(
                {'error': messages.CANNOT_REMOVE_CHANNEL_OWNER},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Before the delete, so the audience still contains whoever is leaving.
        # That is deliberate: their own screen is the one that cannot re-read
        # the channel afterwards to find out what happened to it.
        audience = _audience(membership.channel)
        channel = membership.channel
        target = membership.user

        membership.delete()

        events.publish(
            events.MEMBER_REMOVED,
            audience=audience,
            channel=channel,
            user=target,
            actor=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
