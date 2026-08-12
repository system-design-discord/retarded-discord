"""C-03 — the topic API and its can_create_topic gate.

US-4.5 and US-2.3. The second half of US-2.3 — "send and receive messages in
the channel's topics" — is exercised through `/api/messages/`, because messages
belong to `messaging`; there is deliberately no message endpoint nested under a
channel here.
"""

import pytest

from channels_app.models import Channel, ChannelMember, Topic
from messaging.models import Message
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
    return Channel.objects.create_with_owner(owner=owner, name='general')


@pytest.fixture
def plain_membership(channel, member):
    return ChannelMember.objects.create(user=member, channel=channel)


def topics_url(channel):
    return f'/api/channels/{channel.pk}/topics/'


def grant(channel, user, **permissions):
    role = Role.objects.create(channel=channel, name=f'role-{user.username}', **permissions)
    return ChannelMember.objects.create(user=user, channel=channel, role=role)


# --- create --------------------------------------------------------------


@pytest.mark.django_db
def test_the_owner_can_create_a_topic(auth_client, owner, channel):
    response = auth_client(owner).post(topics_url(channel), {'name': 'announcements'}, format='json')

    assert response.status_code == 201
    assert response.data['name'] == 'announcements'
    assert response.data['channel'] == channel.pk


@pytest.mark.django_db
def test_a_member_without_can_create_topic_is_refused(auth_client, member, channel, plain_membership):
    response = auth_client(member).post(topics_url(channel), {'name': 'sneaky'}, format='json')

    assert response.status_code == 403
    assert not Topic.objects.filter(name='sneaky').exists()


@pytest.mark.django_db
def test_a_holder_of_can_create_topic_may_create_one(auth_client, member, channel):
    grant(channel, member, can_create_topic=True)

    response = auth_client(member).post(topics_url(channel), {'name': 'random'}, format='json')

    assert response.status_code == 201


@pytest.mark.django_db
def test_granting_the_permission_takes_effect_on_the_next_request(auth_client, member, channel, plain_membership):
    """Brief §5.8 — access levels change without editing code or restarting."""
    client = auth_client(member)
    assert client.post(topics_url(channel), {'name': 'first'}, format='json').status_code == 403

    plain_membership.role = Role.objects.create(channel=channel, name='Host', can_create_topic=True)
    plain_membership.save()

    assert client.post(topics_url(channel), {'name': 'first'}, format='json').status_code == 201


@pytest.mark.django_db
def test_a_non_member_cannot_create_or_even_list_topics(auth_client, outsider, channel):
    assert auth_client(outsider).get(topics_url(channel)).status_code == 403
    assert auth_client(outsider).post(topics_url(channel), {'name': 'x'}, format='json').status_code == 403


@pytest.mark.django_db
def test_two_topics_in_one_channel_cannot_share_a_name(auth_client, owner, channel):
    Topic.objects.create(channel=channel, name='general')

    response = auth_client(owner).post(topics_url(channel), {'name': 'general'}, format='json')

    assert response.status_code == 400
    assert 'name' in response.data


@pytest.mark.django_db
def test_an_empty_topic_name_is_refused(auth_client, owner, channel):
    assert auth_client(owner).post(topics_url(channel), {'name': '  '}, format='json').status_code == 400


@pytest.mark.django_db
def test_the_body_cannot_route_a_topic_into_another_channel(auth_client, owner, channel):
    """`channel` is read-only and comes from the URL — the path that was
    permission-checked — so naming a different one in the body does nothing."""
    elsewhere = Channel.objects.create_with_owner(owner=owner, name='elsewhere')

    response = auth_client(owner).post(
        topics_url(channel), {'name': 'here', 'channel': elsewhere.pk}, format='json'
    )

    assert response.status_code == 201
    assert Topic.objects.get(name='here').channel_id == channel.pk


# --- list and read -------------------------------------------------------


@pytest.mark.django_db
def test_listing_returns_only_this_channels_topics(auth_client, owner, channel):
    other = Channel.objects.create_with_owner(owner=owner, name='other')
    Topic.objects.create(channel=channel, name='here')
    Topic.objects.create(channel=other, name='elsewhere')

    response = auth_client(owner).get(topics_url(channel))

    assert [topic['name'] for topic in response.data['results']] == ['here']


@pytest.mark.django_db
def test_a_topic_from_another_channel_is_not_reachable_through_this_url(auth_client, owner, channel):
    other = Channel.objects.create_with_owner(owner=owner, name='other')
    elsewhere = Topic.objects.create(channel=other, name='elsewhere')

    assert auth_client(owner).get(f'{topics_url(channel)}{elsewhere.pk}/').status_code == 404


# --- rename and delete ---------------------------------------------------


@pytest.mark.django_db
def test_renaming_a_topic_needs_can_edit_channel(auth_client, member, channel):
    topic = Topic.objects.create(channel=channel, name='general')
    membership = grant(channel, member, can_create_topic=True)

    url = f'{topics_url(channel)}{topic.pk}/'
    assert auth_client(member).patch(url, {'name': 'renamed'}, format='json').status_code == 403

    membership.role.can_edit_channel = True
    membership.role.save()
    assert auth_client(member).patch(url, {'name': 'renamed'}, format='json').status_code == 200


@pytest.mark.django_db
def test_deleting_a_topic_says_how_many_messages_went_with_it(auth_client, owner, channel):
    """C-03: not silently. Topic.messages is CASCADE, so the count is the
    honest thing to answer with."""
    topic = Topic.objects.create(channel=channel, name='general')
    Message.objects.create(sender=owner, topic=topic, text='one')
    Message.objects.create(sender=owner, topic=topic, text='two')

    response = auth_client(owner).delete(f'{topics_url(channel)}{topic.pk}/')

    assert response.status_code == 200
    assert response.data['deleted_messages'] == 2
    assert not Topic.objects.filter(pk=topic.pk).exists()


@pytest.mark.django_db
def test_deleting_an_empty_topic_reports_zero(auth_client, owner, channel):
    topic = Topic.objects.create(channel=channel, name='general')

    response = auth_client(owner).delete(f'{topics_url(channel)}{topic.pk}/')

    assert response.data['deleted_messages'] == 0


# --- US-2.3, through the messaging API -----------------------------------


@pytest.mark.django_db
def test_a_channel_member_can_post_in_a_topic(auth_client, member, channel, plain_membership):
    """All members may post; no role is needed. user_stories_en.tex is explicit
    that the per-topic restriction in US-2.4 is on media, not on posting."""
    topic = Topic.objects.create(channel=channel, name='general')

    response = auth_client(member).post('/api/messages/', {'topic': topic.pk, 'text': 'hello'}, format='json')

    assert response.status_code == 201


@pytest.mark.django_db
def test_a_non_member_cannot_post_in_a_topic(auth_client, outsider, channel):
    topic = Topic.objects.create(channel=channel, name='general')

    response = auth_client(outsider).post('/api/messages/', {'topic': topic.pk, 'text': 'hi'}, format='json')

    assert response.status_code == 403


@pytest.mark.django_db
def test_messages_posted_in_a_topic_are_only_visible_in_that_topic(auth_client, owner, channel):
    here = Topic.objects.create(channel=channel, name='here')
    there = Topic.objects.create(channel=channel, name='there')
    Message.objects.create(sender=owner, topic=here, text='in here')

    client = auth_client(owner)
    assert [m['text'] for m in client.get(f'/api/messages/?topic_id={here.pk}').data['results']] == ['in here']
    assert client.get(f'/api/messages/?topic_id={there.pk}').data['results'] == []
