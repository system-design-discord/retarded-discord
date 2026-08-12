"""C-04 — adding and removing channel members.

US-4.3, US-4.4, SH.1 and SH.2. SH.1 is the decision to add users directly
rather than through an invite link; SH.2 is the user's right to refuse it, and
both halves have to be real.
"""

import pytest

from accounts.models import Profile
from channels_app.models import Channel, ChannelMember
from common import events
from roles.models import Role


@pytest.fixture
def owner(user_factory):
    return user_factory('owner')


@pytest.fixture
def manager(user_factory):
    return user_factory('manager')


@pytest.fixture
def target(user_factory):
    return user_factory('target')


@pytest.fixture
def channel(db, owner):
    return Channel.objects.create_with_owner(owner=owner, name='general')


def members_url(channel):
    return f'/api/channels/{channel.pk}/members/'


def grant(channel, user, **permissions):
    role = Role.objects.create(channel=channel, name=f'role-{user.username}', **permissions)
    return ChannelMember.objects.create(user=user, channel=channel, role=role)


# --- add -----------------------------------------------------------------


@pytest.mark.django_db
def test_the_owner_can_add_a_member(auth_client, owner, target, channel):
    response = auth_client(owner).post(members_url(channel), {'user_id': target.id}, format='json')

    assert response.status_code == 201
    assert response.data['user']['id'] == target.id
    assert response.data['role'] is None
    assert ChannelMember.objects.filter(channel=channel, user=target).exists()


@pytest.mark.django_db
def test_adding_needs_can_add_member(auth_client, manager, target, channel):
    grant(channel, manager, can_remove_member=True)

    response = auth_client(manager).post(members_url(channel), {'user_id': target.id}, format='json')

    assert response.status_code == 403
    assert not ChannelMember.objects.filter(channel=channel, user=target).exists()


@pytest.mark.django_db
def test_a_holder_of_can_add_member_may_add(auth_client, manager, target, channel):
    grant(channel, manager, can_add_member=True)

    assert auth_client(manager).post(
        members_url(channel), {'user_id': target.id}, format='json'
    ).status_code == 201


@pytest.mark.django_db
def test_a_user_whose_allow_invites_is_off_is_refused_and_not_added(auth_client, owner, target, channel):
    """SH.2 — the target's own flag decides, not the actor's permission."""
    Profile.objects.create(user=target, allow_invites=False)

    response = auth_client(owner).post(members_url(channel), {'user_id': target.id}, format='json')

    assert response.status_code == 403
    assert not ChannelMember.objects.filter(channel=channel, user=target).exists()


@pytest.mark.django_db
def test_adding_somebody_already_in_the_channel_is_refused(auth_client, owner, target, channel):
    ChannelMember.objects.create(channel=channel, user=target)

    response = auth_client(owner).post(members_url(channel), {'user_id': target.id}, format='json')

    assert response.status_code == 400
    assert ChannelMember.objects.filter(channel=channel, user=target).count() == 1


@pytest.mark.django_db
def test_adding_without_a_user_id_is_a_400(auth_client, owner, channel):
    assert auth_client(owner).post(members_url(channel), {}, format='json').status_code == 400


@pytest.mark.django_db
def test_adding_an_unknown_user_is_a_404(auth_client, owner, channel):
    assert auth_client(owner).post(members_url(channel), {'user_id': 99999}, format='json').status_code == 404


@pytest.mark.django_db
def test_adding_a_member_publishes_member_added(auth_client, owner, target, channel):
    """N-02 and the real-time gateway subscribe to this; channels_app does not
    import either of them (architecture.tex §5.1)."""
    seen = []
    events.subscribe(events.MEMBER_ADDED, lambda **payload: seen.append(payload))

    auth_client(owner).post(members_url(channel), {'user_id': target.id}, format='json')

    assert len(seen) == 1
    assert seen[0]['user'] == target
    assert seen[0]['channel'] == channel
    assert seen[0]['actor'] == owner


# --- list ----------------------------------------------------------------


@pytest.mark.django_db
def test_a_member_can_list_the_membership(auth_client, owner, target, channel):
    ChannelMember.objects.create(channel=channel, user=target)

    response = auth_client(target).get(members_url(channel))

    assert response.status_code == 200
    assert {row['user']['username'] for row in response.data['results']} == {'owner', 'target'}
    assert [row['is_owner'] for row in response.data['results'] if row['user']['username'] == 'owner'] == [True]


@pytest.mark.django_db
def test_a_non_member_cannot_list_the_membership(auth_client, target, channel):
    assert auth_client(target).get(members_url(channel)).status_code == 403


@pytest.mark.django_db
def test_an_unauthenticated_caller_is_refused(api_client, channel):
    assert api_client.get(members_url(channel)).status_code == 401


# --- remove --------------------------------------------------------------


@pytest.mark.django_db
def test_removing_needs_can_remove_member(auth_client, manager, target, channel):
    grant(channel, manager, can_add_member=True)
    ChannelMember.objects.create(channel=channel, user=target)

    url = f'{members_url(channel)}{target.id}/'
    assert auth_client(manager).delete(url).status_code == 403
    assert ChannelMember.objects.filter(channel=channel, user=target).exists()


@pytest.mark.django_db
def test_a_holder_of_can_remove_member_may_remove(auth_client, manager, target, channel):
    grant(channel, manager, can_remove_member=True)
    ChannelMember.objects.create(channel=channel, user=target)

    response = auth_client(manager).delete(f'{members_url(channel)}{target.id}/')

    assert response.status_code == 204
    assert not ChannelMember.objects.filter(channel=channel, user=target).exists()


@pytest.mark.django_db
def test_the_owner_cannot_be_removed(auth_client, owner, channel):
    """ERD.tex makes Channel : ChannelMember 1 : 1..N, and the owner is the one
    member who implicitly holds everything."""
    response = auth_client(owner).delete(f'{members_url(channel)}{owner.id}/')

    assert response.status_code == 400
    assert ChannelMember.objects.filter(channel=channel, user=owner).exists()


@pytest.mark.django_db
def test_removing_somebody_who_is_not_a_member_is_a_404(auth_client, owner, target, channel):
    assert auth_client(owner).delete(f'{members_url(channel)}{target.id}/').status_code == 404


@pytest.mark.django_db
def test_a_removed_member_loses_access_on_their_next_request(auth_client, owner, target, channel):
    """Brief §5.8 again, from the membership side: roles reads rows at call
    time, so removal takes effect immediately with no restart."""
    ChannelMember.objects.create(channel=channel, user=target)
    client = auth_client(target)
    assert client.get(f'/api/channels/{channel.pk}/').status_code == 200

    auth_client(owner).delete(f'{members_url(channel)}{target.id}/')

    assert auth_client(target).get(f'/api/channels/{channel.pk}/').status_code == 403


@pytest.mark.django_db
def test_the_member_role_url_still_reaches_the_roles_api(auth_client, owner, target, channel):
    """channels_app is mounted before roles; `.../members/<id>/role/` must not
    be swallowed by `.../members/<id>/`."""
    ChannelMember.objects.create(channel=channel, user=target)

    response = auth_client(owner).get(f'{members_url(channel)}{target.id}/role/')

    assert response.status_code == 200
    assert response.data['user'] == target.id
