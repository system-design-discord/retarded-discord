"""A message aimed at something that is no longer there — A-3's other half.

`recipient`, `group` and `topic` are `PrimaryKeyRelatedField`s, so an id that
resolves to nothing is refused at `to_internal_value`, before `validate()` and
before the view's membership check. That was always right; what was wrong was
the sentence. DRF's stock `does_not_exist` is `Invalid pk "5" - object does not
exist.`, and the way to reach it is to have a topic deleted out from under you
and then press send — so the product answered a database noun to somebody who
had done nothing but be slightly too slow.

Every other user-facing string in the product is in `common/messages.py` (#127)
and these three were the only ones that were not.
"""

import pytest

from channels_app.models import Channel, ChannelMember, Topic
from common import messages
from groups_app.models import Group


@pytest.fixture
def topic(db, user):
    channel = Channel.objects.create_with_owner(owner=user, name='general')
    return Topic.objects.create(channel=channel, name='announcements')


@pytest.mark.django_db
def test_posting_to_a_deleted_topic_is_refused_in_the_catalogue_s_words(auth_client, user, topic):
    topic_id = topic.pk
    topic.delete()

    response = auth_client(user).post(
        '/api/messages/', {'topic': topic_id, 'text': 'anyone there?'}, format='json'
    )

    assert response.status_code == 400
    assert response.data['topic'] == [messages.MESSAGE_TARGET_GONE]


@pytest.mark.django_db
def test_the_refusal_names_no_database_concept(auth_client, user, topic):
    """The regression this file exists for, stated as the thing a reader sees.

    Asserting the catalogue string above would still pass if somebody put
    `Invalid pk ...` *into* the catalogue, so this asserts the shape of the old
    message rather than the identity of the new one.
    """
    topic_id = topic.pk
    topic.delete()

    response = auth_client(user).post(
        '/api/messages/', {'topic': topic_id, 'text': 'anyone there?'}, format='json'
    )

    assert 'Invalid pk' not in str(response.data)


@pytest.mark.django_db
def test_a_deleted_group_is_refused_the_same_way(auth_client, user):
    group = Group.objects.create_with_admin(admin=user, name='team')
    group_id = group.pk
    group.delete()

    response = auth_client(user).post(
        '/api/messages/', {'group': group_id, 'text': 'hello'}, format='json'
    )

    assert response.status_code == 400
    assert response.data['group'] == [messages.MESSAGE_TARGET_GONE]


@pytest.mark.django_db
def test_a_deleted_recipient_is_refused_the_same_way(auth_client, user, user_factory):
    other = user_factory()
    other_id = other.pk
    other.delete()

    response = auth_client(user).post(
        '/api/messages/', {'recipient': other_id, 'text': 'hello'}, format='json'
    )

    assert response.status_code == 400
    assert response.data['recipient'] == [messages.MESSAGE_TARGET_GONE]


@pytest.mark.django_db
def test_a_live_target_is_unaffected(auth_client, user, topic):
    """The declared fields must behave exactly as the generated ones did.

    All three columns are `null=True, blank=True`, so the generated fields were
    `required=False, allow_null=True` and these say so explicitly. A post that
    worked before this change has to still work, which is the half of a
    hand-written field that is easy to get wrong.
    """
    ChannelMember.objects.filter(channel=topic.channel, user=user).exists()

    response = auth_client(user).post(
        '/api/messages/', {'topic': topic.pk, 'text': 'still here'}, format='json'
    )

    assert response.status_code == 201
    assert response.data['topic'] == topic.pk
