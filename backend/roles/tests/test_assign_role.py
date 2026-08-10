"""R-03 — assigning a role, and reading the one you hold.

US-4.9 (change a member's role) and US-8.3 (read the roles assigned to me).
"""

import pytest

from channels_app.models import Channel, ChannelMember
from common import events
from roles.models import Role


@pytest.fixture
def owner(user_factory):
    return user_factory('owner')


@pytest.fixture
def member(user_factory):
    return user_factory('member')


@pytest.fixture
def channel(db, owner):
    return Channel.objects.create(owner=owner, name='general')


@pytest.fixture
def membership(channel, member):
    return ChannelMember.objects.create(user=member, channel=channel)


@pytest.fixture
def moderator(channel):
    return Role.objects.create(channel=channel, name='Moderator', can_delete_message=True)


def role_url(channel, user):
    return f'/api/channels/{channel.pk}/members/{user.pk}/role/'


def permissions_url(channel):
    return f'/api/channels/{channel.pk}/me/permissions/'


@pytest.mark.django_db
def test_the_owner_can_assign_a_role(auth_client, owner, channel, member, membership, moderator):
    response = auth_client(owner).patch(role_url(channel, member), {'role': moderator.pk}, format='json')

    assert response.status_code == 200
    membership.refresh_from_db()
    assert membership.role == moderator


@pytest.mark.django_db
def test_assigning_a_role_needs_can_change_role(auth_client, channel, member, membership, moderator):
    """The member holds can_delete_message, which is not can_change_role."""
    membership.role = moderator
    membership.save(update_fields=['role'])

    response = auth_client(member).patch(role_url(channel, member), {'role': None}, format='json')

    assert response.status_code == 403


@pytest.mark.django_db
def test_the_change_takes_effect_on_the_next_request_with_no_restart(
    auth_client, owner, channel, member, membership, moderator
):
    before = auth_client(member).get(permissions_url(channel))
    assert before.data['permissions']['can_delete_message'] is False

    auth_client(owner).patch(role_url(channel, member), {'role': moderator.pk}, format='json')

    after = auth_client(member).get(permissions_url(channel))
    assert after.data['permissions']['can_delete_message'] is True
    assert after.data['role'] == 'Moderator'


@pytest.mark.django_db
def test_clearing_a_role_leaves_the_member_in_the_channel(
    auth_client, owner, channel, member, membership, moderator
):
    membership.role = moderator
    membership.save(update_fields=['role'])

    response = auth_client(owner).patch(role_url(channel, member), {'role': None}, format='json')

    assert response.status_code == 200
    membership.refresh_from_db()
    assert membership.role is None
    assert ChannelMember.objects.filter(pk=membership.pk).exists()


@pytest.mark.django_db
def test_a_role_from_another_channel_cannot_be_assigned(auth_client, owner, channel, member, membership):
    other = Channel.objects.create(owner=owner, name='random')
    elsewhere = Role.objects.create(channel=other, name='Elsewhere')

    response = auth_client(owner).patch(role_url(channel, member), {'role': elsewhere.pk}, format='json')

    assert response.status_code == 400
    membership.refresh_from_db()
    assert membership.role is None


@pytest.mark.django_db
def test_a_role_granting_more_than_the_actor_holds_cannot_be_assigned(
    auth_client, channel, member, membership, user_factory
):
    """US-8.2 from the assignment side — otherwise the create-side check is
    trivially bypassed by assigning somebody else's powerful role."""
    manager = user_factory('manager')
    ChannelMember.objects.create(
        user=manager, channel=channel,
        role=Role.objects.create(channel=channel, name='RoleManager', can_change_role=True),
    )
    powerful = Role.objects.create(channel=channel, name='Owner-ish', can_delete_channel=True)

    response = auth_client(manager).patch(role_url(channel, member), {'role': powerful.pk}, format='json')

    assert response.status_code == 400
    membership.refresh_from_db()
    assert membership.role is None


@pytest.mark.django_db
def test_assigning_a_role_publishes_role_changed(auth_client, owner, channel, member, membership, moderator):
    """N-02 and RT-02 subscribe to this rather than being called directly."""
    seen = []
    events.subscribe(events.ROLE_CHANGED, lambda **payload: seen.append(payload))

    auth_client(owner).patch(role_url(channel, member), {'role': moderator.pk}, format='json')

    assert len(seen) == 1
    assert seen[0]['user'] == member
    assert seen[0]['role'] == moderator
    assert seen[0]['actor'] == owner


@pytest.mark.django_db
def test_a_member_can_read_their_own_permissions(auth_client, channel, member, membership, moderator):
    membership.role = moderator
    membership.save(update_fields=['role'])

    response = auth_client(member).get(permissions_url(channel))

    assert response.status_code == 200
    assert response.data['role'] == 'Moderator'
    assert response.data['is_owner'] is False
    assert response.data['permissions']['can_delete_message'] is True
    assert response.data['permissions']['can_delete_channel'] is False


@pytest.mark.django_db
def test_a_member_with_no_role_reads_an_empty_permission_set(auth_client, channel, member, membership):
    response = auth_client(member).get(permissions_url(channel))

    assert response.status_code == 200
    assert response.data['role'] is None
    assert set(response.data['permissions'].values()) == {False}


@pytest.mark.django_db
def test_the_owner_reads_all_eight(auth_client, owner, channel):
    response = auth_client(owner).get(permissions_url(channel))

    assert response.data['is_owner'] is True
    assert set(response.data['permissions'].values()) == {True}


@pytest.mark.django_db
def test_a_non_member_cannot_read_the_channels_permissions(auth_client, user_factory, channel):
    outsider = user_factory('outsider')

    assert auth_client(outsider).get(permissions_url(channel)).status_code == 403


@pytest.mark.django_db
def test_there_is_no_endpoint_for_reading_somebody_elses_permissions(auth_client, owner, channel, member, membership):
    """US-8.3 is 'the roles assigned to *me*'. Reading a member's row is part of
    role management and needs can_change_role."""
    assert auth_client(owner).get(role_url(channel, member)).status_code == 200
    assert auth_client(member).get(role_url(channel, member)).status_code == 403
