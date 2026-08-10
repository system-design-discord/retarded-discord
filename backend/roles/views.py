"""The roles API — R-02.

Every endpoint here is gated by `can_change_role`, which the channel owner
holds implicitly. The gate is a call into `roles.services`, not an inline owner
comparison, for the same reason every other module calls in here.
"""

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from channels_app.models import Channel, ChannelMember
from common import events
from common.permissions import HasChannelPermission, IsChannelMember
from roles import services
from roles.models import Role
from roles.serializers import MemberRoleSerializer, RoleSerializer


class ChannelScopedMixin:
    """Resolves the channel in the URL and hands it to the permission class."""

    def get_channel(self):
        if not hasattr(self, '_channel'):
            self._channel = get_object_or_404(Channel, pk=self.kwargs['channel_id'])
        return self._channel

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'channel': self.get_channel()}


class RoleListCreateView(ChannelScopedMixin, generics.ListCreateAPIView):
    """US-8.1 — define roles with names of your own choosing."""

    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasChannelPermission]
    required_permission = 'can_change_role'

    def get_queryset(self):
        return Role.objects.filter(channel=self.get_channel())

    def perform_create(self, serializer):
        serializer.save(channel=self.get_channel())


class RoleDetailView(ChannelScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    """Rename a role, change what it grants, or delete it.

    Deleting does not remove anybody from the channel — `ChannelMember.role` is
    SET_NULL, so its holders survive holding nothing.
    """

    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasChannelPermission]
    required_permission = 'can_change_role'

    def get_queryset(self):
        return Role.objects.filter(channel=self.get_channel())


class MemberRoleView(ChannelScopedMixin, generics.RetrieveUpdateAPIView):
    """Assign or change the role a member holds — R-03, US-4.9.

    The change is a single column write, and `roles.services` reads that column
    on every call, so it takes effect on the member's very next request with no
    restart.
    """

    serializer_class = MemberRoleSerializer
    permission_classes = [permissions.IsAuthenticated, HasChannelPermission]
    required_permission = 'can_change_role'
    http_method_names = ['get', 'put', 'patch', 'head', 'options']

    def get_object(self):
        return get_object_or_404(
            ChannelMember, channel=self.get_channel(), user_id=self.kwargs['user_id']
        )

    def perform_update(self, serializer):
        membership = serializer.save()
        # Notifications and the real-time gateway subscribe to this rather than
        # being imported here (architecture.tex §5.1, common/events.py).
        events.publish(
            events.ROLE_CHANGED,
            channel=membership.channel,
            user=membership.user,
            role=membership.role,
            actor=self.request.user,
        )


class MyPermissionsView(ChannelScopedMixin, APIView):
    """US-8.3 — "receive the roles assigned to me in a channel, so that I can
    act according to the defined permissions."

    Membership is enough to read this, and you only ever read your own. The
    role management UI uses it to hide controls; the server still refuses the
    request if the UI is bypassed.
    """

    permission_classes = [permissions.IsAuthenticated, IsChannelMember]

    def get(self, request, channel_id):
        channel = self.get_channel()
        membership = ChannelMember.objects.select_related('role').filter(
            user=request.user, channel=channel
        ).first()

        return Response({
            'channel': channel.pk,
            'is_owner': channel.owner_id == request.user.id,
            'role': membership.role.name if membership and membership.role else None,
            'permissions': services.permissions_for(request.user, channel),
        })
