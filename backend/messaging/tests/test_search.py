"""M-08 — searching message text. US-9.1.

The criterion that matters is the negative one: *"Results never include messages
from conversations the caller is not in — verify by searching a term that only
exists in a stranger's chat and confirming zero results."* That is the first
test here, and it is the reason `search()` composes onto `visible_to()` rather
than doing its own scoping.
"""

import pytest
from django.urls import reverse

from channels_app.models import Channel, ChannelMember, Topic
from groups_app.models import Group
from messaging.models import Message


@pytest.fixture
def group(db, user, other_user):
    g = Group.objects.create_with_admin(admin=user, name='team')
    g.members.add(other_user)
    return g


@pytest.fixture
def topic(db, user):
    channel = Channel.objects.create_with_owner(owner=user, name='general')
    return Topic.objects.create(channel=channel, name='announcements')


def search(client, term):
    return client.get(reverse('message-search'), {'q': term})


# --- the scoping criterion ----------------------------------------------


@pytest.mark.django_db
def test_a_term_only_in_a_strangers_chat_returns_nothing(auth_client, user, user_factory):
    strangers = user_factory('mallory'), user_factory('trent')
    Message.objects.create(sender=strangers[0], recipient=strangers[1], text='pineapple')

    response = search(auth_client(user), 'pineapple')

    assert response.status_code == 200
    assert response.data['count'] == 0


@pytest.mark.django_db
def test_a_group_you_left_out_of_is_not_searchable(auth_client, user, user_factory):
    outsiders = user_factory('mallory'), user_factory('trent')
    private = Group.objects.create_with_admin(admin=outsiders[0], name='secret')
    private.members.add(outsiders[1])
    Message.objects.create(sender=outsiders[0], group=private, text='pineapple')

    assert search(auth_client(user), 'pineapple').data['count'] == 0


@pytest.mark.django_db
def test_a_channel_you_are_not_in_is_not_searchable(auth_client, user, user_factory):
    owner = user_factory('mallory')
    channel = Channel.objects.create_with_owner(owner=owner, name='private')
    hidden = Topic.objects.create(channel=channel, name='plans')
    Message.objects.create(sender=owner, topic=hidden, text='pineapple')

    assert search(auth_client(user), 'pineapple').data['count'] == 0

    # …and the moment you join, it is.
    ChannelMember.objects.create(channel=channel, user=user)
    assert search(auth_client(user), 'pineapple').data['count'] == 1


# --- hits in all three contexts, and what they say about themselves -----


@pytest.mark.django_db
def test_a_direct_message_hit_names_the_other_person(auth_client, user, other_user):
    Message.objects.create(sender=other_user, recipient=user, text='the pineapple is ready')

    hit = search(auth_client(user), 'pineapple').data['results'][0]

    assert hit['conversation'] == {'kind': 'dm', 'id': other_user.pk, 'name': other_user.username}


@pytest.mark.django_db
def test_a_group_hit_names_the_group(auth_client, user, group):
    Message.objects.create(sender=user, group=group, text='pineapple on the roster')

    hit = search(auth_client(user), 'pineapple').data['results'][0]

    assert hit['conversation'] == {'kind': 'group', 'id': group.pk, 'name': 'team'}


@pytest.mark.django_db
def test_a_topic_hit_names_the_channel_and_the_topic(auth_client, user, topic):
    Message.objects.create(sender=user, topic=topic, text='pineapple, again')

    hit = search(auth_client(user), 'pineapple').data['results'][0]

    assert hit['conversation']['kind'] == 'topic'
    assert hit['conversation']['id'] == topic.pk
    assert hit['conversation']['channel_id'] == topic.channel_id
    assert 'general' in hit['conversation']['name']
    assert 'announcements' in hit['conversation']['name']


@pytest.mark.django_db
def test_one_search_spans_all_three_kinds_of_conversation(auth_client, user, other_user, group, topic):
    Message.objects.create(sender=user, recipient=other_user, text='pineapple one')
    Message.objects.create(sender=user, group=group, text='pineapple two')
    Message.objects.create(sender=user, topic=topic, text='pineapple three')

    response = search(auth_client(user), 'pineapple')

    assert response.data['count'] == 3
    assert {hit['conversation']['kind'] for hit in response.data['results']} == {
        'dm', 'group', 'topic'
    }


# --- the query itself ---------------------------------------------------


@pytest.mark.django_db
def test_search_is_case_insensitive(auth_client, user, other_user):
    Message.objects.create(sender=user, recipient=other_user, text='Pineapple')

    assert search(auth_client(user), 'pineapple').data['count'] == 1


@pytest.mark.django_db
def test_a_term_that_matches_nothing_is_an_empty_result_not_an_error(auth_client, user, other_user):
    Message.objects.create(sender=user, recipient=other_user, text='hello')

    response = search(auth_client(user), 'pineapple')

    assert response.status_code == 200
    assert response.data['results'] == []


@pytest.mark.django_db
def test_a_blank_query_returns_nothing_rather_than_everything(auth_client, user, other_user):
    """The failure mode worth guarding: an empty box dumping the caller's
    entire history over the wire."""
    Message.objects.create(sender=user, recipient=other_user, text='hello')

    assert search(auth_client(user), '').data['count'] == 0
    assert search(auth_client(user), '   ').data['count'] == 0
    assert auth_client(user).get(reverse('message-search')).data['count'] == 0


@pytest.mark.django_db
def test_results_are_paginated_like_every_other_list(auth_client, user, other_user):
    for n in range(3):
        Message.objects.create(sender=user, recipient=other_user, text=f'pineapple {n}')

    response = search(auth_client(user), 'pineapple')

    assert set(response.data) >= {'count', 'next', 'previous', 'results'}
    assert response.data['count'] == 3


@pytest.mark.django_db
def test_search_needs_authentication(api_client):
    assert api_client.get(reverse('message-search'), {'q': 'pineapple'}).status_code == 401
