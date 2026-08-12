"""M-06 — editing a message. US-3.1 and US-3.2.

Editing is deliberately the *opposite* shape to deleting. `test_delete_message`
next door proves that a channel owner, a group admin and a holder of
`can_delete_message` may all remove somebody else's message; this file proves
that none of them may change one. US-3.2: "only and exclusively myself".

Everything goes through the endpoint rather than calling `roles.services`
directly, because the criterion is that the server refuses.
"""

import pytest

from channels_app.models import Channel, ChannelMember, Topic
from groups_app.models import Group
from messaging.models import Message
from roles.models import Role


@pytest.fixture
def group(db, user, other_user):
    g = Group.objects.create_with_admin(admin=other_user, name='team')
    g.members.add(user)
    return g


@pytest.fixture
def channel(db, other_user):
    """Owned by `other_user`, so the owner is never the message author."""
    return Channel.objects.create_with_owner(owner=other_user, name='general')


@pytest.fixture
def topic(channel, user):
    ChannelMember.objects.create(channel=channel, user=user)
    return Topic.objects.create(channel=channel, name='announcements')


def url(message):
    return f'/api/messages/{message.pk}/'


# --- the author, in all three contexts -----------------------------------


@pytest.mark.django_db
def test_the_author_may_edit_a_direct_message(auth_client, user, other_user):
    message = Message.objects.create(sender=user, recipient=other_user, text='helo')

    response = auth_client(user).patch(url(message), {'text': 'hello'}, format='json')

    assert response.status_code == 200
    assert response.data['text'] == 'hello'
    message.refresh_from_db()
    assert message.text == 'hello'


@pytest.mark.django_db
def test_the_author_may_edit_a_group_message(auth_client, user, group):
    message = Message.objects.create(sender=user, group=group, text='helo')

    response = auth_client(user).patch(url(message), {'text': 'hello'}, format='json')

    assert response.status_code == 200


@pytest.mark.django_db
def test_the_author_may_edit_a_topic_message(auth_client, user, topic):
    message = Message.objects.create(sender=user, topic=topic, text='helo')

    response = auth_client(user).patch(url(message), {'text': 'hello'}, format='json')

    assert response.status_code == 200


# --- an edited message is labelled, and keeps its original timestamp ------


@pytest.mark.django_db
def test_an_edit_is_flagged_and_the_original_timestamp_survives(auth_client, user, other_user):
    message = Message.objects.create(sender=user, recipient=other_user, text='helo')
    created_at = message.created_at

    assert message.is_edited is False

    response = auth_client(user).patch(url(message), {'text': 'hello'}, format='json')

    assert response.data['is_edited'] is True
    message.refresh_from_db()
    assert message.is_edited is True
    assert message.edited_at is not None
    assert message.created_at == created_at


@pytest.mark.django_db
def test_an_unedited_message_is_not_flagged(auth_client, user, other_user):
    message = Message.objects.create(sender=user, recipient=other_user, text='hello')

    response = auth_client(user).get(url(message))

    assert response.data['is_edited'] is False
    assert response.data['edited_at'] is None


# --- nobody else, however privileged -------------------------------------


@pytest.mark.django_db
def test_the_recipient_of_a_direct_message_may_not_edit_it(auth_client, user, other_user):
    message = Message.objects.create(sender=user, recipient=other_user, text='hello')

    response = auth_client(other_user).patch(url(message), {'text': 'nope'}, format='json')

    assert response.status_code == 403
    message.refresh_from_db()
    assert message.text == 'hello'


@pytest.mark.django_db
def test_the_group_admin_may_not_edit_a_members_message(auth_client, user, other_user, group):
    """`other_user` is the group's admin and may *delete* this message."""
    message = Message.objects.create(sender=user, group=group, text='hello')

    response = auth_client(other_user).patch(url(message), {'text': 'nope'}, format='json')

    assert response.status_code == 403


@pytest.mark.django_db
def test_the_channel_owner_may_not_edit_a_members_message(auth_client, user, other_user, topic):
    """`other_user` owns the channel and holds all eight permissions."""
    message = Message.objects.create(sender=user, topic=topic, text='hello')

    response = auth_client(other_user).patch(url(message), {'text': 'nope'}, format='json')

    assert response.status_code == 403


@pytest.mark.django_db
def test_can_delete_message_does_not_grant_editing(auth_client, user, user_factory, channel, topic):
    """The permission that unlocks moderation unlocks removal, not rewriting."""
    moderator = user_factory('mod')
    role = Role.objects.create(channel=channel, name='Moderator', can_delete_message=True)
    ChannelMember.objects.create(channel=channel, user=moderator, role=role)
    message = Message.objects.create(sender=user, topic=topic, text='hello')

    response = auth_client(moderator).patch(url(message), {'text': 'nope'}, format='json')

    assert response.status_code == 403
    assert auth_client(moderator).delete(url(message)).status_code == 204


@pytest.mark.django_db
def test_a_stranger_gets_404_not_403(auth_client, user, other_user, user_factory):
    """A message outside `visible_to` must not confirm that it exists."""
    outsider = user_factory('eve')
    message = Message.objects.create(sender=user, recipient=other_user, text='hello')

    response = auth_client(outsider).patch(url(message), {'text': 'nope'}, format='json')

    assert response.status_code == 404


# --- an edit changes the text and nothing else ---------------------------


@pytest.mark.django_db
def test_an_edit_cannot_move_the_message_to_another_conversation(
    auth_client, user, other_user, group
):
    message = Message.objects.create(sender=user, recipient=other_user, text='hello')

    response = auth_client(user).patch(
        url(message), {'text': 'hello', 'group': group.pk, 'recipient': None}, format='json'
    )

    assert response.status_code == 200
    message.refresh_from_db()
    assert message.group_id is None
    assert message.recipient_id == other_user.pk


@pytest.mark.django_db
def test_an_edit_cannot_change_the_author(auth_client, user, other_user):
    message = Message.objects.create(sender=user, recipient=other_user, text='hello')

    auth_client(user).patch(url(message), {'text': 'x', 'sender': other_user.pk}, format='json')

    message.refresh_from_db()
    assert message.sender_id == user.pk


@pytest.mark.django_db
def test_an_empty_edit_is_rejected(auth_client, user, other_user):
    message = Message.objects.create(sender=user, recipient=other_user, text='hello')

    response = auth_client(user).patch(url(message), {'text': '   '}, format='json')

    assert response.status_code == 400
    message.refresh_from_db()
    assert message.text == 'hello'
