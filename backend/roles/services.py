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
  to this module even when the rule is simple. Not every group rule is the
  admin's, though: `may_edit_group` and `may_delete_group` are *member* rights
  (doc.tex §4.6), and they are named rather than reached through a permission so
  that nothing has to borrow a channel's vocabulary to ask.
* **Messages** are the third shape, and the only one that does not carry its own
  rule: a message's *context* decides which of the two above applies.
  `may_delete_message` does that dispatch, so `messaging/` never has to.

Some rules are a *composition* rather than a single row, and they belong here for
the same reason. `may_send_media` is the one: whether a file may be sent depends
on the channel's restriction flag **and** the caller's permission, and a caller
that read the flag itself and decided what it meant would be deciding its own
access. `media_app`, `messaging` and `scheduling` all ask this module instead,
which is what stops the three of them from disagreeing (`A-10`).
"""

from rest_framework.exceptions import PermissionDenied

from channels_app.models import ChannelMember
from common import messages
from groups_app.models import GroupMember
from roles.models import PERMISSION_FIELDS

# Re-exported under the name the rest of the codebase reads better with.
PERMISSIONS = PERMISSION_FIELDS

# What a group admin holds that an ordinary member does not, and it is exactly
# the three powers `user_stories_en.tex` §Assumptions for section 5 names:
# "remove members, add members, and delete others' messages". Editing the group
# and deleting it are deliberately **not** here — doc.tex §4.6 gives both to any
# member, and `may_edit_group` / `may_delete_group` below answer them instead.
GROUP_ADMIN_PERMISSIONS = frozenset({
    'can_delete_message',
    'can_remove_member',
    'can_add_member',
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
        raise PermissionDenied(messages.NO_PERMISSION)


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
        raise PermissionDenied(messages.NOT_CHANNEL_MEMBER)


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
        raise PermissionDenied(messages.NOT_GROUP_MEMBER)


def has_group_permission(user, group, permission):
    """The group-shaped equivalent. The group admin holds the three permissions
    that separate them from a member; ordinary members hold none of them.

    Note what this does *not* answer. Editing and deleting the group are member
    rights, not admin ones, so they are `may_edit_group` and `may_delete_group`
    rather than a permission name asked through here."""
    _validate(permission)

    if user is None or not user.is_authenticated:
        return False
    if permission not in GROUP_ADMIN_PERMISSIONS:
        return False

    # M-04: who administers a group is one row in GroupMember, not a column on
    # Group. There is exactly one source of truth for it and this is the only
    # place in the product that reads it.
    return GroupMember.objects.filter(group=group, user=user, is_admin=True).exists()


def require_group_permission(user, group, permission):
    if not has_group_permission(user, group, permission):
        raise PermissionDenied(messages.NO_PERMISSION)


def may_edit_group(user, group):
    """May `user` edit this group's name, description or image? — US-6.4.

    **Any member may.** doc.tex §4.6 is explicit — "groups can be deleted by any
    of their members. Editing their information is also done by these same
    people" — and `user_stories_en.tex` §Assumptions closes the admin's powers at
    three, none of which is this one. A group is a conversation between equals
    with one member holding the membership list; it is not a channel with an
    owner.

    That is why this is a predicate of its own rather than
    `has_group_permission(user, group, 'can_edit_channel')`. Reusing the
    channel's permission name made a group inherit the channel's *rule* along
    with its vocabulary, and the channel's rule is the wrong one here.
    """
    return is_group_member(user, group)


def require_edit_group(user, group):
    """`may_edit_group`, but raises so a view can simply call and continue."""
    if not may_edit_group(user, group):
        raise PermissionDenied(messages.NO_PERMISSION_TO_EDIT_GROUP)


def may_delete_group(user, group):
    """May `user` delete this group? — US-6.3.

    The same rule and the same sentence of doc.tex §4.6: "so that the group can
    be disbanded upon the members' agreement". The agreement is a thing the
    members reach between themselves, not a thing the product asks for, so any
    one of them may act on it.
    """
    return is_group_member(user, group)


def require_delete_group(user, group):
    """`may_delete_group`, but raises so a view can simply call and continue."""
    if not may_delete_group(user, group):
        raise PermissionDenied(messages.NO_PERMISSION_TO_EDIT_GROUP)


def may_edit_message(user, message):
    """May `user` edit `message`? — US-3.1 and US-3.2.

    **Only the author, in every context, with no exception at all.** US-3.2 is
    unusually explicit about it — *"I want only and exclusively myself to be able
    to edit my own sent message, so that no one can distort my message"* — which
    makes editing the mirror image of `may_delete_message` below: a channel
    owner, a group admin and a holder of `can_delete_message` may all *remove* a
    message, and none of them may *change* it. Moderation is deleting somebody's
    words, not putting different ones in their mouth.

    It lives here rather than as an `if` in `messaging/views.py` for the same
    reason everything else does (architecture.tex §5.1). That the rule is one
    line is not a reason to move the decision back into the module that asks.
    """
    if user is None or not user.is_authenticated:
        return False

    return message.sender_id == user.id


def require_edit_message(user, message):
    """`may_edit_message`, but raises so a view can simply call and continue."""
    if not may_edit_message(user, message):
        raise PermissionDenied(messages.NOT_MESSAGE_AUTHOR)


def may_delete_message(user, message):
    """May `user` delete `message`? — US-3.3 to US-3.6, US-4.6 and US-5.3.

    A message does not have permissions of its own; its target decides which
    rule applies, and both of those rules already live above. That dispatch is
    the whole card, and it is here rather than in `messaging/views.py` because
    architecture.tex §5.1 says the messaging module does not decide this.

    `user_stories_en.tex` §Assumptions for section 3 is exact about the three
    cases:

    * **In a group**, "aside from the message sender themselves, only the group
      admin may delete a sent message."
    * **In a channel**, "aside from the message sender, only the channel admin or
      members holding the *delete members' messages* permission."
    * **In a direct message** neither concept exists, so only the author — a
      recipient deleting the other side's message would be rewriting somebody
      else's history, not moderating a shared space.
    """
    if user is None or not user.is_authenticated:
        return False

    # US-3.3 — the author, in any of the three contexts, always.
    if message.sender_id == user.id:
        return True

    # US-3.5 / US-5.3 — the group admin, and nobody else in the group.
    if message.group_id is not None:
        return has_group_permission(user, message.group, 'can_delete_message')

    # US-3.4 / US-3.6 / US-4.6 — the channel owner implicitly, or a member whose
    # role grants it. Both answers come from has_permission, unchanged.
    if message.topic_id is not None:
        return has_permission(user, message.topic.channel, 'can_delete_message')

    return False


def require_delete_message(user, message):
    """`may_delete_message`, but raises so a view can simply call and continue."""
    if not may_delete_message(user, message):
        raise PermissionDenied(messages.NO_PERMISSION_TO_DELETE_MESSAGE)


def may_send_media(user, channel):
    """May `user` upload or attach a file in `channel`? — US-2.4, US-7.3 (A-10).

    Two rows compose into one answer, and composing them is exactly why this
    lives here rather than in `media_app`: the caller would otherwise have to
    read `channel.media_restricted` itself and then decide what to do about it,
    which is a module deciding permissions for itself (architecture.tex §5.1).

    * An **unrestricted** channel is the default and the common case — every
      member may send media, no role required, the same as posting text.
    * A **restricted** channel narrows that to holders of `can_send_media`.

    The channel admin is never refused, and there is deliberately no branch here
    that says so: `has_permission` short-circuits on ownership, so the owner
    holds `can_send_media` like the other seven.

    Note that this is a channel rule and takes a channel. DMs and groups have no
    equivalent — `GROUP_ADMIN_PERMISSIONS` excludes `can_send_media` on purpose —
    so a caller with a `recipient` or `group` target must not route through here.
    """
    if user is None or not user.is_authenticated:
        return False

    if not channel.media_restricted:
        return True

    return has_permission(user, channel, 'can_send_media')


def require_send_media(user, channel):
    """`may_send_media`, but raises so a view can simply call and continue."""
    if not may_send_media(user, channel):
        raise PermissionDenied(messages.MEDIA_RESTRICTED_IN_CHANNEL)
