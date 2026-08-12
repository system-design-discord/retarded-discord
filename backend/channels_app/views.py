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

from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.response import Response

from common.mixins import ChannelScopedMixin
from common.permissions import HasChannelPermission, IsChannelMember

from .models import Channel
from .serializers import ChannelSerializer


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
            .select_related('owner')
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

    def destroy(self, request, *args, **kwargs):
        """200 with what went with it, not a silent 204.

        A channel takes its topics, memberships, roles and every message in
        them. Django's own delete() tally is the honest source for that count.
        """
        _, deleted_per_model = self.get_object().delete()
        return Response({'deleted': _deletion_report(deleted_per_model)})
