"""C-02 — the channel API.

US-4.1, US-4.7, US-4.10, US-6.1, US-6.2. Everything goes over HTTP rather than
calling the service directly: the acceptance criteria are about what the API
refuses, and `INT-2` exercises exactly these paths.
"""

import pytest

from channels_app.models import Channel, ChannelMember, Topic
from roles.models import PERMISSION_FIELDS, Role

CHANNELS = '/api/channels/'


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
    return Channel.objects.create_with_owner(owner=owner, name='general', description='the default one')


def detail(channel):
    return f'{CHANNELS}{channel.pk}/'


def grant(channel, user, **permissions):
    """Put `user` in `channel` holding exactly `permissions`."""
    role = Role.objects.create(channel=channel, name=f'role-{user.username}', **permissions)
    return ChannelMember.objects.create(user=user, channel=channel, role=role)


# --- create --------------------------------------------------------------


@pytest.mark.django_db
def test_a_user_can_create_a_channel(auth_client, owner):
    response = auth_client(owner).post(CHANNELS, {'name': 'general'}, format='json')

    assert response.status_code == 201
    assert response.data['name'] == 'general'
    assert response.data['owner']['id'] == owner.id


@pytest.mark.django_db
def test_the_creator_ends_up_holding_all_eight_permissions(auth_client, owner):
    """US-4.1 — 'create a new channel and become its admin'. Read back through
    the roles API, because that is where the answer actually comes from."""
    created = auth_client(owner).post(CHANNELS, {'name': 'general'}, format='json')

    response = auth_client(owner).get(f'{CHANNELS}{created.data["id"]}/me/permissions/')

    assert response.status_code == 200
    assert response.data['is_owner'] is True
    assert all(response.data['permissions'][field] for field in PERMISSION_FIELDS)


@pytest.mark.django_db
def test_the_creator_is_a_member_of_their_own_channel(auth_client, owner):
    """ERD.tex makes Channel : ChannelMember a 1 : 1..N relationship."""
    created = auth_client(owner).post(CHANNELS, {'name': 'general'}, format='json')

    assert ChannelMember.objects.filter(channel_id=created.data['id'], user=owner).exists()
    assert created.data['member_count'] == 1


@pytest.mark.django_db
def test_a_channel_needs_a_name(auth_client, owner):
    response = auth_client(owner).post(CHANNELS, {'name': '   '}, format='json')

    assert response.status_code == 400
    assert 'name' in response.data


@pytest.mark.django_db
def test_an_unauthenticated_caller_cannot_create_a_channel(api_client):
    assert api_client.post(CHANNELS, {'name': 'general'}, format='json').status_code == 401


# --- list ----------------------------------------------------------------


@pytest.mark.django_db
def test_the_list_shows_only_channels_you_own_or_joined(auth_client, owner, member, outsider, channel):
    ChannelMember.objects.create(user=member, channel=channel)
    Channel.objects.create_with_owner(owner=outsider, name='somewhere else')

    for user, expected in ((owner, ['general']), (member, ['general']), (outsider, ['somewhere else'])):
        response = auth_client(user).get(CHANNELS)
        assert [row['name'] for row in response.data['results']] == expected


@pytest.mark.django_db
def test_a_channel_is_listed_once_even_though_the_owner_is_also_a_member(auth_client, owner, channel):
    """The queryset ORs owner against membership, and the owner is both."""
    response = auth_client(owner).get(CHANNELS)

    assert response.data['count'] == 1


@pytest.mark.django_db
def test_the_list_carries_each_channels_topics(auth_client, owner, channel):
    Topic.objects.create(channel=channel, name='announcements')

    response = auth_client(owner).get(CHANNELS)

    assert [topic['name'] for topic in response.data['results'][0]['topics']] == ['announcements']


# --- read ----------------------------------------------------------------


@pytest.mark.django_db
def test_a_member_can_read_the_channel(auth_client, member, channel):
    ChannelMember.objects.create(user=member, channel=channel)

    assert auth_client(member).get(detail(channel)).status_code == 200


@pytest.mark.django_db
def test_a_non_member_cannot_read_the_channel(auth_client, outsider, channel):
    assert auth_client(outsider).get(detail(channel)).status_code == 403


# --- edit ----------------------------------------------------------------


@pytest.mark.django_db
def test_editing_needs_can_edit_channel(auth_client, member, channel):
    grant(channel, member, can_edit_channel=True)

    response = auth_client(member).patch(detail(channel), {'description': 'edited'}, format='json')

    assert response.status_code == 200
    channel.refresh_from_db()
    assert channel.description == 'edited'


@pytest.mark.django_db
def test_a_member_without_can_edit_channel_is_refused(auth_client, member, channel):
    ChannelMember.objects.create(user=member, channel=channel)

    response = auth_client(member).patch(detail(channel), {'name': 'hijacked'}, format='json')

    assert response.status_code == 403
    channel.refresh_from_db()
    assert channel.name == 'general'


@pytest.mark.django_db
def test_the_owner_can_always_edit(auth_client, owner, channel):
    response = auth_client(owner).patch(detail(channel), {'name': 'renamed'}, format='json')

    assert response.status_code == 200


@pytest.mark.django_db
def test_the_owner_cannot_be_reassigned_through_the_api(auth_client, owner, outsider, channel):
    auth_client(owner).patch(detail(channel), {'owner': outsider.id}, format='json')

    channel.refresh_from_db()
    assert channel.owner_id == owner.id


# --- delete --------------------------------------------------------------


@pytest.mark.django_db
def test_deleting_needs_can_delete_channel(auth_client, member, channel):
    grant(channel, member, can_delete_channel=True)

    response = auth_client(member).delete(detail(channel))

    assert response.status_code == 200
    assert not Channel.objects.filter(pk=channel.pk).exists()


@pytest.mark.django_db
def test_a_member_without_can_delete_channel_is_refused(auth_client, member, channel):
    grant(channel, member, can_edit_channel=True)

    assert auth_client(member).delete(detail(channel)).status_code == 403
    assert Channel.objects.filter(pk=channel.pk).exists()


@pytest.mark.django_db
def test_deleting_a_channel_says_what_went_with_it(auth_client, owner, member, channel):
    """Not a silent 204: a channel takes its topics, members and roles."""
    Topic.objects.create(channel=channel, name='announcements')
    grant(channel, member, can_send_media=True)

    response = auth_client(owner).delete(detail(channel))

    assert response.status_code == 200
    assert response.data['deleted'] == {'topics': 1, 'members': 2, 'roles': 1, 'messages': 0}


@pytest.mark.django_db
def test_a_channel_you_are_not_in_cannot_be_deleted(auth_client, outsider, channel):
    assert auth_client(outsider).delete(detail(channel)).status_code == 403
    assert Channel.objects.filter(pk=channel.pk).exists()
