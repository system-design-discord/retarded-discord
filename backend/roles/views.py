"""The roles API — R-02.

Every endpoint here is gated by `can_change_role`, which the channel owner
holds implicitly. The gate is a call into `roles.services`, not an inline owner
comparison, for the same reason every other module calls in here.
"""

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions

from channels_app.models import Channel
from common.permissions import HasChannelPermission
from roles.models import Role
from roles.serializers import RoleSerializer


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
