"""DRF glue for roles.services — architecture.tex §5.1.

A view declares which permission it needs instead of writing an `if`:

    class ChannelDeleteView(DestroyAPIView):
        permission_classes = [IsAuthenticated, HasChannelPermission]
        required_permission = 'can_delete_channel'

        def get_channel(self):
            return get_object_or_404(Channel, pk=self.kwargs['channel_id'])

The check itself still happens in roles.services — this class only carries the
answer back to DRF in the shape it expects.
"""

from rest_framework.permissions import BasePermission

from roles import services


class HasChannelPermission(BasePermission):
    """Grants access when the caller holds `view.required_permission` in the
    channel `view.get_channel()` returns."""

    message = "شما دسترسی لازم برای این عملیات را ندارید."

    def has_permission(self, request, view):
        permission = getattr(view, 'required_permission', None)
        if permission is None:
            raise AssertionError(
                f"{view.__class__.__name__} uses HasChannelPermission but does not set required_permission"
            )
        return services.has_permission(request.user, view.get_channel(), permission)


class IsChannelMember(BasePermission):
    """Reading a channel needs membership, not a permission."""

    message = "شما عضو این کانال نیستید."

    def has_permission(self, request, view):
        return services.is_channel_member(request.user, view.get_channel())
