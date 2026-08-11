"""R-04 — the permission evaluation service.

The heart of this file is `test_the_permission_matrix`: for each of the eight
permissions, one allowed case and one denied case. That is the sixteen-check
matrix INT-2 runs by hand against the API; running it here as well means a
regression fails in CI rather than on the last afternoon of the sprint.
"""

import pytest
from rest_framework.exceptions import PermissionDenied

from channels_app.models import Channel, ChannelMember
from roles import services
from roles.models import Role


@pytest.fixture
def owner(user_factory):
    return user_factory('owner')


@pytest.fixture
def member(user_factory):
    return user_factory('member')


@pytest.fixture
def outsider(user_factory):
    return user_factory('outsider')


@pytest.fixture
def channel(db, owner):
    return Channel.objects.create(owner=owner, name='general')


@pytest.fixture
def membership(channel, member):
    return ChannelMember.objects.create(user=member, channel=channel)


def grant(channel, membership, permission):
    """Give the member a role granting exactly one permission."""
    role = Role.objects.create(channel=channel, name=f'grants-{permission}', **{permission: True})
    membership.role = role
    membership.save(update_fields=['role'])
    return role


# ---------------------------------------------------------------- the matrix

@pytest.mark.django_db
@pytest.mark.parametrize('permission', services.PERMISSIONS)
def test_the_permission_matrix_allows_a_holder(permission, channel, member, membership):
    grant(channel, membership, permission)

    assert services.has_permission(member, channel, permission) is True


@pytest.mark.django_db
@pytest.mark.parametrize('permission', services.PERMISSIONS)
def test_the_permission_matrix_denies_a_non_holder(permission, channel, member, membership):
    """A role that grants every *other* permission still does not grant this
    one — this is what catches an all-or-nothing implementation."""
    others = {p: True for p in services.PERMISSIONS if p != permission}
    membership.role = Role.objects.create(channel=channel, name='almost-everything', **others)
    membership.save(update_fields=['role'])

    assert services.has_permission(member, channel, permission) is False


# ------------------------------------------------------------ the edge rules

@pytest.mark.django_db
@pytest.mark.parametrize('permission', services.PERMISSIONS)
def test_the_channel_owner_is_never_refused(permission, channel, owner):
    """Ownership is not a role and cannot be revoked by editing a row."""
    assert services.has_permission(owner, channel, permission) is True


@pytest.mark.django_db
@pytest.mark.parametrize('permission', services.PERMISSIONS)
def test_a_member_with_no_role_is_refused_everything(permission, channel, member, membership):
    assert membership.role is None
    assert services.has_permission(member, channel, permission) is False


@pytest.mark.django_db
@pytest.mark.parametrize('permission', services.PERMISSIONS)
def test_a_non_member_is_refused_everything(permission, channel, outsider):
    assert services.has_permission(outsider, channel, permission) is False


@pytest.mark.django_db
def test_an_anonymous_caller_is_refused(channel):
    from django.contrib.auth.models import AnonymousUser

    assert services.has_permission(AnonymousUser(), channel, 'can_send_media') is False
    assert services.has_permission(None, channel, 'can_send_media') is False


@pytest.mark.django_db
def test_an_unknown_permission_name_is_a_programming_error(channel, owner):
    """Silently returning False would let a typo look like a denial."""
    with pytest.raises(ValueError):
        services.has_permission(owner, channel, 'can_do_whatever')


# --------------------------------------------------- the check reads db rows

@pytest.mark.django_db
def test_reassigning_a_role_takes_effect_on_the_very_next_call(channel, member, membership):
    """No restart, no deploy, no cache — brief §5.8."""
    moderator = Role.objects.create(channel=channel, name='Moderator', can_delete_message=True)
    guest = Role.objects.create(channel=channel, name='Guest')

    membership.role = moderator
    membership.save(update_fields=['role'])
    assert services.has_permission(member, channel, 'can_delete_message') is True

    membership.role = guest
    membership.save(update_fields=['role'])
    assert services.has_permission(member, channel, 'can_delete_message') is False


@pytest.mark.django_db
def test_editing_the_role_row_changes_the_answer_without_touching_the_member(channel, member, membership):
    role = grant(channel, membership, 'can_add_member')
    assert services.has_permission(member, channel, 'can_add_member') is True

    Role.objects.filter(pk=role.pk).update(can_add_member=False)

    assert services.has_permission(member, channel, 'can_add_member') is False


# ------------------------------------------------------------------ wrappers

@pytest.mark.django_db
def test_require_permission_raises_for_a_non_holder(channel, member, membership):
    with pytest.raises(PermissionDenied):
        services.require_permission(member, channel, 'can_edit_channel')


@pytest.mark.django_db
def test_require_permission_is_silent_for_a_holder(channel, owner):
    services.require_permission(owner, channel, 'can_edit_channel')


@pytest.mark.django_db
def test_permissions_for_returns_the_whole_set(channel, member, membership):
    grant(channel, membership, 'can_create_topic')

    granted = services.permissions_for(member, channel)

    assert granted['can_create_topic'] is True
    assert sum(granted.values()) == 1
    assert set(granted) == set(services.PERMISSIONS)


@pytest.mark.django_db
def test_permissions_for_gives_the_owner_all_eight(channel, owner):
    assert services.permissions_for(owner, channel) == dict.fromkeys(services.PERMISSIONS, True)


@pytest.mark.django_db
def test_permissions_for_gives_an_outsider_nothing(channel, outsider):
    assert services.permissions_for(outsider, channel) == dict.fromkeys(services.PERMISSIONS, False)


@pytest.mark.django_db
def test_is_channel_member(channel, owner, member, membership, outsider):
    assert services.is_channel_member(owner, channel) is True
    assert services.is_channel_member(member, channel) is True
    assert services.is_channel_member(outsider, channel) is False


# -------------------------------------------------------------- group facade

@pytest.mark.django_db
def test_the_group_admin_holds_the_group_permissions(user_factory):
    from groups_app.models import Group

    admin = user_factory('gadmin')
    group = Group.objects.create_with_admin(admin=admin, name='team')
    group.members.add(admin)

    assert services.has_group_permission(admin, group, 'can_remove_member') is True
    assert services.has_group_permission(admin, group, 'can_delete_message') is True


@pytest.mark.django_db
def test_an_ordinary_group_member_holds_none_of_them(user_factory):
    from groups_app.models import Group

    admin = user_factory('gadmin')
    plain = user_factory('plain')
    group = Group.objects.create_with_admin(admin=admin, name='team')
    group.members.add(admin, plain)

    assert services.has_group_permission(plain, group, 'can_remove_member') is False
    assert services.has_group_permission(plain, group, 'can_add_member') is False


@pytest.mark.django_db
def test_channel_only_permissions_are_never_granted_over_a_group(user_factory):
    """A group has no topics and no per-channel media rule, so asking is always
    a no — better than quietly answering yes because the caller is the admin."""
    from groups_app.models import Group

    admin = user_factory('gadmin')
    group = Group.objects.create_with_admin(admin=admin, name='team')

    assert services.has_group_permission(admin, group, 'can_create_topic') is False
    assert services.has_group_permission(admin, group, 'can_change_role') is False
