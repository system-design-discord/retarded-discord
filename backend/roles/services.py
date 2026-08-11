"""The authorization authority — architecture.tex §5.1.

**No module decides permissions for itself.** Messaging, Channels, Groups and
Media do not check ownership inline; they call in here:

    from roles import services

    services.require_permission(request.user, channel, 'can_delete_message')

Every answer is computed from database rows at call time. Nothing is cached and
nothing is baked into a constant, which is what makes brief §5.8 — access
levels manageable without editing code — literally true: an admin reassigning a
role takes effect on the caller's very next request, with no restart and no
deploy.

Two shapes of subject exist in the product, so there are two shapes of call:

* **Channels** carry real roles. `has_permission(user, channel, permission)`.
* **Groups** have no role table (US-5.x only ever names an admin), so
  `has_group_permission` is a thin facade over that one rule. It lives here
  rather than in groups_app for exactly the reason above — the decision belongs
  to this module even when the rule is simple.
"""

from rest_framework.exceptions import PermissionDenied

from channels_app.models import ChannelMember
from roles.models import PERMISSION_FIELDS

# Re-exported under the name the rest of the codebase reads better with.
PERMISSIONS = PERMISSION_FIELDS

# A group admin is the group's owner, so they hold everything that makes sense
# for a group. There is no group-level media or topic concept, so the four
# channel-only permissions are simply never asked about a group.
GROUP_ADMIN_PERMISSIONS = frozenset({
    'can_delete_message',
    'can_remove_member',
    'can_add_member',
    'can_edit_channel',
    'can_delete_channel',
})


def _validate(permission):
    if permission not in PERMISSIONS:
        raise ValueError(
            f"unknown permission {permission!r}; the eight are {', '.join(PERMISSIONS)}"
        )


def has_permission(user, channel, permission):
    """Does `user` hold `permission` in `channel`?

    The channel owner always does — ownership is not a role that can be revoked
    by editing a row. Everyone else holds exactly what their assigned role
    grants; a member with no role, and a non-member, hold nothing.
    """
    _validate(permission)

    if user is None or not user.is_authenticated:
        return False

    if channel.owner_id == user.id:
        return True

    membership = (
        ChannelMember.objects
        .filter(user=user, channel=channel)
        .select_related('role')
        .first()
    )
    if membership is None or membership.role is None:
        return False

    return getattr(membership.role, permission)


def require_permission(user, channel, permission):
    """`has_permission`, but raises so a view can simply call and continue."""
    if not has_permission(user, channel, permission):
        raise PermissionDenied("شما دسترسی لازم برای این عملیات را ندارید.")


def permissions_for(user, channel):
    """The caller's whole permission set in one query — {name: bool}.

    US-8.3 ("receive the roles assigned to me... so that I can act according to
    the defined permissions") reads this, and so does the role management UI,
    which hides controls the user does not hold. Hiding is presentation; the
    server still refuses the request either way.
    """
    if user is None or not user.is_authenticated:
        return dict.fromkeys(PERMISSIONS, False)

    if channel.owner_id == user.id:
        return dict.fromkeys(PERMISSIONS, True)

    membership = (
        ChannelMember.objects
        .filter(user=user, channel=channel)
        .select_related('role')
        .first()
    )
    if membership is None or membership.role is None:
        return dict.fromkeys(PERMISSIONS, False)

    return membership.role.granted()


def is_channel_member(user, channel):
    """Membership, not permission — reading a channel needs only this."""
    if user is None or not user.is_authenticated:
        return False
    if channel.owner_id == user.id:
        return True
    return ChannelMember.objects.filter(user=user, channel=channel).exists()


def require_channel_membership(user, channel):
    """`is_channel_member`, but raises. Posting into a topic needs this."""
    if not is_channel_member(user, channel):
        raise PermissionDenied("شما عضو این کانال نیستید.")


def is_group_member(user, group):
    """Membership again, group-shaped. Reading or posting in a group needs it.

    It lives here for the same reason `has_group_permission` does: the rule is
    trivial, but the *decision* belongs to this module, so no caller has to
    remember whether the admin is separately a member (they always are).
    """
    if user is None or not user.is_authenticated:
        return False
    return group.members.filter(pk=user.pk).exists()


def require_group_membership(user, group):
    if not is_group_member(user, group):
        raise PermissionDenied("شما عضو این گروه نیستید.")


def has_group_permission(user, group, permission):
    """The group-shaped equivalent. The group admin holds the five permissions
    that mean anything for a group; ordinary members hold none of them."""
    _validate(permission)

    if user is None or not user.is_authenticated:
        return False
    if permission not in GROUP_ADMIN_PERMISSIONS:
        return False

    return group.admin_id == user.id


def require_group_permission(user, group, permission):
    if not has_group_permission(user, group, permission):
        raise PermissionDenied("شما دسترسی لازم برای این عملیات را ندارید.")
