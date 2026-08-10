"""R-02 — the role CRUD API.

US-4.2, US-8.1, US-8.2. Everything here goes over HTTP rather than calling the
service directly: the acceptance criteria are about what the API refuses, and
INT-2 will exercise exactly these paths.
"""

import pytest

from channels_app.models import Channel, ChannelMember
from roles.models import PERMISSION_FIELDS, Role


@pytest.fixture
def owner(user_factory):
    return user_factory('owner')


@pytest.fixture
def manager(user_factory):
    return user_factory('manager')


@pytest.fixture
def plain(user_factory):
    return user_factory('plain')


@pytest.fixture
def channel(db, owner):
    return Channel.objects.create(owner=owner, name='general')


@pytest.fixture
def manager_membership(channel, manager):
    """A member who may change roles but holds nothing else."""
    role = Role.objects.create(channel=channel, name='RoleManager', can_change_role=True)
    return ChannelMember.objects.create(user=manager, channel=channel, role=role)


@pytest.fixture
def plain_membership(channel, plain):
    return ChannelMember.objects.create(user=plain, channel=channel)


def roles_url(channel):
    return f'/api/channels/{channel.pk}/roles/'


@pytest.mark.django_db
def test_the_owner_can_create_a_role(auth_client, owner, channel):
    response = auth_client(owner).post(
        roles_url(channel), {'name': 'Moderator', 'can_delete_message': True}, format='json'
    )

    assert response.status_code == 201
    assert response.data['name'] == 'Moderator'
    assert response.data['can_delete_message'] is True
    assert Role.objects.filter(channel=channel, name='Moderator').exists()


@pytest.mark.django_db
def test_a_holder_of_can_change_role_can_create_a_role(auth_client, manager, channel, manager_membership):
    response = auth_client(manager).post(roles_url(channel), {'name': 'Greeter'}, format='json')

    assert response.status_code == 201


@pytest.mark.django_db
def test_a_member_without_the_permission_cannot_create_a_role(auth_client, plain, channel, plain_membership):
    response = auth_client(plain).post(roles_url(channel), {'name': 'Sneaky'}, format='json')

    assert response.status_code == 403
    assert not Role.objects.filter(name='Sneaky').exists()


@pytest.mark.django_db
def test_a_non_member_cannot_even_list_the_roles(auth_client, user_factory, channel):
    outsider = user_factory('outsider')

    assert auth_client(outsider).get(roles_url(channel)).status_code == 403


@pytest.mark.django_db
def test_an_unauthenticated_caller_is_refused(api_client, channel):
    assert api_client.get(roles_url(channel)).status_code == 401


@pytest.mark.django_db
def test_a_super_admin_cannot_grant_a_permission_they_do_not_hold(
    auth_client, manager, channel, manager_membership
):
    """US-8.2 — 'capabilities that fall within my own permissions'. The manager
    holds can_change_role and nothing else, so granting can_delete_channel is
    an escalation and must be refused."""
    response = auth_client(manager).post(
        roles_url(channel), {'name': 'Overreach', 'can_delete_channel': True}, format='json'
    )

    assert response.status_code == 400
    assert 'can_delete_channel' in response.data
    assert not Role.objects.filter(name='Overreach').exists()


@pytest.mark.django_db
def test_a_super_admin_may_grant_a_permission_they_do_hold(auth_client, manager, channel, manager_membership):
    response = auth_client(manager).post(
        roles_url(channel), {'name': 'Deputy', 'can_change_role': True}, format='json'
    )

    assert response.status_code == 201


@pytest.mark.django_db
def test_the_owner_may_grant_anything(auth_client, owner, channel):
    """The owner implicitly holds all eight, so US-8.2 never binds them."""
    response = auth_client(owner).post(
        roles_url(channel), {'name': 'Admin', **dict.fromkeys(PERMISSION_FIELDS, True)}, format='json'
    )

    assert response.status_code == 201


@pytest.mark.django_db
def test_a_role_can_be_renamed(auth_client, owner, channel):
    role = Role.objects.create(channel=channel, name='Moderator')

    response = auth_client(owner).patch(
        f'{roles_url(channel)}{role.pk}/', {'name': 'Mod'}, format='json'
    )

    assert response.status_code == 200
    role.refresh_from_db()
    assert role.name == 'Mod'


@pytest.mark.django_db
def test_two_roles_in_one_channel_cannot_share_a_name(auth_client, owner, channel):
    Role.objects.create(channel=channel, name='Moderator')

    response = auth_client(owner).post(roles_url(channel), {'name': 'Moderator'}, format='json')

    assert response.status_code == 400
    assert 'name' in response.data


@pytest.mark.django_db
def test_an_empty_role_name_is_refused(auth_client, owner, channel):
    response = auth_client(owner).post(roles_url(channel), {'name': '   '}, format='json')

    assert response.status_code == 400


@pytest.mark.django_db
def test_deleting_a_role_does_not_orphan_its_members(auth_client, owner, channel, plain):
    role = Role.objects.create(channel=channel, name='Moderator', can_delete_message=True)
    membership = ChannelMember.objects.create(user=plain, channel=channel, role=role)

    response = auth_client(owner).delete(f'{roles_url(channel)}{role.pk}/')

    assert response.status_code == 204
    membership.refresh_from_db()
    assert membership.role is None
    assert ChannelMember.objects.filter(pk=membership.pk).exists()


@pytest.mark.django_db
def test_listing_returns_only_this_channels_roles(auth_client, owner, channel):
    other = Channel.objects.create(owner=owner, name='random')
    Role.objects.create(channel=channel, name='Here')
    Role.objects.create(channel=other, name='Elsewhere')

    response = auth_client(owner).get(roles_url(channel))

    names = [role['name'] for role in response.data['results']]
    assert names == ['Here']


@pytest.mark.django_db
def test_a_role_from_another_channel_is_not_reachable_through_this_url(auth_client, owner, channel):
    other = Channel.objects.create(owner=owner, name='random')
    elsewhere = Role.objects.create(channel=other, name='Elsewhere')

    assert auth_client(owner).get(f'{roles_url(channel)}{elsewhere.pk}/').status_code == 404
