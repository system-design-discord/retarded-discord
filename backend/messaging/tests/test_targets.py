"""A message has exactly one target — US-2.1 (DM), US-2.2 (group), US-2.3 (topic).

The rule is enforced twice on purpose: by the serializer at the API boundary,
and by a check constraint at the database, so a shell script or a data migration
cannot create a shape the API forbids.
"""

import pytest
from django.db import IntegrityError, transaction

from channels_app.models import Channel, Topic
from groups_app.models import Group
from messaging.models import Message
from messaging.serializers import MessageSerializer


@pytest.fixture
def group(db, user, other_user):
    g = Group.objects.create_with_admin(admin=user, name='team')
    g.members.add(user, other_user)
    return g


@pytest.fixture
def topic(db, user):
    channel = Channel.objects.create(owner=user, name='general')
    return Topic.objects.create(channel=channel, name='announcements')


# --- the API boundary ----------------------------------------------------


@pytest.mark.django_db
@pytest.mark.parametrize('target', ['recipient', 'group', 'topic'])
def test_exactly_one_target_is_accepted(request, target, other_user, group, topic):
    value = {'recipient': other_user, 'group': group, 'topic': topic}[target]

    serializer = MessageSerializer(data={target: value.pk, 'text': 'hello'})

    assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
def test_a_message_with_no_target_is_refused(db):
    serializer = MessageSerializer(data={'text': 'hello'})

    assert not serializer.is_valid()


@pytest.mark.django_db
@pytest.mark.parametrize(
    'first,second',
    [('recipient', 'group'), ('recipient', 'topic'), ('group', 'topic')],
)
def test_a_message_with_two_targets_is_refused(first, second, other_user, group, topic):
    values = {'recipient': other_user, 'group': group, 'topic': topic}

    serializer = MessageSerializer(
        data={first: values[first].pk, second: values[second].pk, 'text': 'hello'}
    )

    assert not serializer.is_valid()


# --- the database --------------------------------------------------------


@pytest.mark.django_db
def test_the_database_refuses_two_targets(user, other_user, group):
    """Defence in depth: the constraint holds even when nothing goes through DRF."""
    with pytest.raises(IntegrityError), transaction.atomic():
        Message.objects.create(sender=user, recipient=other_user, group=group, text='hello')


@pytest.mark.django_db
def test_the_database_refuses_a_message_with_no_target(user):
    with pytest.raises(IntegrityError), transaction.atomic():
        Message.objects.create(sender=user, text='hello')


@pytest.mark.django_db
def test_a_topic_message_is_reachable_from_its_topic(user, topic):
    message = Message.objects.create(sender=user, topic=topic, text='in the topic')

    assert message in topic.messages.all()
