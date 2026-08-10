"""R-01 — the Role model.

The acceptance criteria are about shape, not behaviour: a role is data, a
channel can hold several of them, each carries all eight booleans, and the
migration applies clean. Evaluation is R-04's file.
"""

import pytest
from django.db import IntegrityError

from channels_app.models import Channel, ChannelMember
from roles.models import PERMISSION_FIELDS, Role


@pytest.fixture
def channel(db, user):
    return Channel.objects.create(owner=user, name='general')


def test_the_eight_permissions_are_the_ones_the_user_stories_fix():
    """user_stories_en.tex §Assumptions names exactly these eight. If this list
    ever drifts, the role API and the INT-2 permission matrix drift with it."""
    assert set(PERMISSION_FIELDS) == {
        'can_send_media',
        'can_delete_message',
        'can_create_topic',
        'can_edit_channel',
        'can_remove_member',
        'can_add_member',
        'can_change_role',
        'can_delete_channel',
    }


@pytest.mark.django_db
def test_a_role_is_a_database_row_not_a_code_constant(channel):
    role = Role.objects.create(channel=channel, name='Moderator', can_delete_message=True)

    reloaded = Role.objects.get(pk=role.pk)
    assert reloaded.name == 'Moderator'
    assert reloaded.can_delete_message is True


@pytest.mark.django_db
def test_every_permission_defaults_to_denied(channel):
    """A freshly created role grants nothing until someone says otherwise."""
    role = Role.objects.create(channel=channel, name='Member')

    assert role.granted() == dict.fromkeys(PERMISSION_FIELDS, False)


@pytest.mark.django_db
def test_a_role_carries_all_eight_booleans(channel):
    role = Role.objects.create(channel=channel, name='Admin', **dict.fromkeys(PERMISSION_FIELDS, True))

    assert role.granted() == dict.fromkeys(PERMISSION_FIELDS, True)


@pytest.mark.django_db
def test_a_channel_can_hold_several_differently_named_roles(channel):
    Role.objects.create(channel=channel, name='Moderator')
    Role.objects.create(channel=channel, name='Guest')

    assert sorted(channel.roles.values_list('name', flat=True)) == ['Guest', 'Moderator']


@pytest.mark.django_db
def test_two_roles_in_one_channel_cannot_share_a_name(channel):
    Role.objects.create(channel=channel, name='Moderator')

    with pytest.raises(IntegrityError):
        Role.objects.create(channel=channel, name='Moderator')


@pytest.mark.django_db
def test_the_same_role_name_may_exist_in_a_different_channel(channel, user):
    """Roles are scoped to a channel: 'Moderator' here grants nothing there."""
    other = Channel.objects.create(owner=user, name='random')
    Role.objects.create(channel=channel, name='Moderator')
    Role.objects.create(channel=other, name='Moderator')

    assert Role.objects.filter(name='Moderator').count() == 2


@pytest.mark.django_db
def test_a_member_holds_no_role_until_one_is_assigned(channel, other_user):
    membership = ChannelMember.objects.create(user=other_user, channel=channel)

    assert membership.role is None


@pytest.mark.django_db
def test_deleting_a_role_does_not_orphan_its_members(channel, other_user):
    """R-02's acceptance criterion, enforced at the schema level: SET_NULL, so
    the member stays in the channel holding nothing."""
    role = Role.objects.create(channel=channel, name='Moderator', can_delete_message=True)
    membership = ChannelMember.objects.create(user=other_user, channel=channel, role=role)

    role.delete()
    membership.refresh_from_db()

    assert membership.pk is not None
    assert membership.role is None


@pytest.mark.django_db
def test_deleting_a_channel_removes_its_roles(channel):
    Role.objects.create(channel=channel, name='Moderator')
    channel.delete()

    assert Role.objects.count() == 0
