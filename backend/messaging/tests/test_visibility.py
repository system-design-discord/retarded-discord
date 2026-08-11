"""Who may read a message, and who may write one into a conversation.

`M-02`'s acceptance criterion is that requesting a conversation you are not part
of does not hand you its contents. Before `Message.objects.visible_to` existed
the read side was inconsistent — the detail view only ever showed you your own
messages — and the write side had no check at all.
"""

import pytest

from channels_app.models import Channel, ChannelMember, Topic
from groups_app.models import Group
from messaging.models import Message


@pytest.fixture
def outsider(user_factory):
    return user_factory('outsider')


@pytest.fixture
def group(db, user, other_user):
    g = Group.objects.create_with_admin(admin=user, name='team')
    g.members.add(user, other_user)
    return g


@pytest.fixture
def channel(db, user):
    return Channel.objects.create(owner=user, name='general')


@pytest.fixture
def topic(channel):
    return Topic.objects.create(channel=channel, name='announcements')


# --- reading --------------------------------------------------------------


@pytest.mark.django_db
def test_a_dm_is_visible_to_both_sides_and_to_nobody_else(user, other_user, outsider):
    message = Message.objects.create(sender=user, recipient=other_user, text='hi')

    assert message in Message.objects.visible_to(user)
    assert message in Message.objects.visible_to(other_user)
    assert message not in Message.objects.visible_to(outsider)


@pytest.mark.django_db
def test_the_recipient_of_a_dm_can_read_it_over_the_api(auth_client, user, other_user):
    """The regression this seam fixes: the detail view used to scope to sender."""
    message = Message.objects.create(sender=user, recipient=other_user, text='hi')

    response = auth_client(other_user).get(f'/api/messages/{message.pk}/')

    assert response.status_code == 200


@pytest.mark.django_db
def test_a_group_message_is_visible_to_members_only(user, other_user, outsider, group):
    message = Message.objects.create(sender=user, group=group, text='hi team')

    assert message in Message.objects.visible_to(other_user)
    assert message not in Message.objects.visible_to(outsider)


@pytest.mark.django_db
def test_a_topic_message_is_visible_to_the_owner_and_members_only(
    user, other_user, outsider, channel, topic
):
    ChannelMember.objects.create(user=other_user, channel=channel)
    message = Message.objects.create(sender=user, topic=topic, text='hi channel')

    assert message in Message.objects.visible_to(user)          # the owner
    assert message in Message.objects.visible_to(other_user)    # a member
    assert message not in Message.objects.visible_to(outsider)


@pytest.mark.django_db
def test_an_out_of_scope_message_is_404_not_403(auth_client, user, other_user, outsider):
    """Refusing with 403 would confirm the message exists."""
    message = Message.objects.create(sender=user, recipient=other_user, text='private')

    response = auth_client(outsider).get(f'/api/messages/{message.pk}/')

    assert response.status_code == 404


@pytest.mark.django_db
def test_an_anonymous_caller_sees_nothing(user, other_user):
    from django.contrib.auth.models import AnonymousUser

    Message.objects.create(sender=user, recipient=other_user, text='hi')

    assert Message.objects.visible_to(AnonymousUser()).count() == 0


@pytest.mark.django_db
def test_asking_for_a_group_you_are_not_in_returns_nothing(auth_client, user, outsider, group):
    Message.objects.create(sender=user, group=group, text='hi team')

    response = auth_client(outsider).get(f'/api/messages/?group_id={group.pk}')

    assert response.status_code == 200
    assert response.data['results'] == []


# --- writing --------------------------------------------------------------


@pytest.mark.django_db
def test_a_member_may_post_in_their_group(auth_client, other_user, group):
    response = auth_client(other_user).post(
        '/api/messages/', {'group': group.pk, 'text': 'hello'}, format='json'
    )

    assert response.status_code == 201


@pytest.mark.django_db
def test_a_non_member_may_not_post_in_a_group(auth_client, outsider, group):
    response = auth_client(outsider).post(
        '/api/messages/', {'group': group.pk, 'text': 'let me in'}, format='json'
    )

    assert response.status_code == 403
    assert not Message.objects.filter(group=group).exists()


@pytest.mark.django_db
def test_a_channel_member_may_post_in_a_topic(auth_client, other_user, channel, topic):
    ChannelMember.objects.create(user=other_user, channel=channel)

    response = auth_client(other_user).post(
        '/api/messages/', {'topic': topic.pk, 'text': 'hello'}, format='json'
    )

    assert response.status_code == 201


@pytest.mark.django_db
def test_all_channel_members_may_post_in_a_topic_without_a_role(
    auth_client, other_user, channel, topic
):
    """user_stories_en.tex §Assumptions for section 4 is explicit: a channel is a
    collection of topics and **all** members may exchange messages in them. The
    per-topic restriction in US-2.4 is on media, not on posting."""
    ChannelMember.objects.create(user=other_user, channel=channel, role=None)

    response = auth_client(other_user).post(
        '/api/messages/', {'topic': topic.pk, 'text': 'no role, still allowed'}, format='json'
    )

    assert response.status_code == 201


@pytest.mark.django_db
def test_a_non_member_may_not_post_in_a_topic(auth_client, outsider, topic):
    response = auth_client(outsider).post(
        '/api/messages/', {'topic': topic.pk, 'text': 'let me in'}, format='json'
    )

    assert response.status_code == 403
    assert not Message.objects.filter(topic=topic).exists()


@pytest.mark.django_db
def test_anyone_may_dm_anyone(auth_client, user, outsider):
    """US-2.1 has no membership concept — a DM needs no prior relationship."""
    response = auth_client(outsider).post(
        '/api/messages/', {'recipient': user.pk, 'text': 'hello stranger'}, format='json'
    )

    assert response.status_code == 201
