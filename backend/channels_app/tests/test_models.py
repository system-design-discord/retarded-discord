"""Channel, ChannelMember and Topic — the entities the roles chain rests on."""

import pytest
from django.db import IntegrityError

from channels_app.models import Channel, ChannelMember, Topic


@pytest.fixture
def channel(db, user):
    return Channel.objects.create(owner=user, name='general', description='the default channel')


@pytest.mark.django_db
def test_a_channel_has_a_name_description_image_and_owner(channel, user):
    assert channel.owner == user
    assert channel.name == 'general'
    assert channel.description == 'the default channel'
    # avatar is optional; ERD.tex lists it, the API does not require it.
    assert not channel.avatar


@pytest.mark.django_db
def test_channel_member_joins_a_user_to_a_channel(channel, other_user):
    membership = ChannelMember.objects.create(user=other_user, channel=channel)

    assert membership in channel.memberships.all()
    assert membership in other_user.channel_memberships.all()


@pytest.mark.django_db
def test_a_user_cannot_join_the_same_channel_twice(channel, other_user):
    """ERD.tex makes (user, channel) the primary key; we enforce it as a
    uniqueness constraint over a surrogate key."""
    ChannelMember.objects.create(user=other_user, channel=channel)

    with pytest.raises(IntegrityError):
        ChannelMember.objects.create(user=other_user, channel=channel)


@pytest.mark.django_db
def test_deleting_a_channel_removes_its_memberships(channel, other_user):
    ChannelMember.objects.create(user=other_user, channel=channel)
    channel.delete()

    assert ChannelMember.objects.count() == 0


# --- Topic ---------------------------------------------------------------
# Landed under R-05 rather than C-01: a channel message cannot exist without
# it, and R-05's channel branch is untestable without a channel message.


@pytest.mark.django_db
def test_a_topic_belongs_to_a_channel(channel):
    topic = Topic.objects.create(channel=channel, name='announcements')

    assert topic in channel.topics.all()
    assert str(topic) == '#announcements @ general'


@pytest.mark.django_db
def test_two_channels_may_each_have_a_topic_of_the_same_name(channel, other_user):
    """A topic name is unique inside its channel, not across the product."""
    elsewhere = Channel.objects.create(owner=other_user, name='other')

    Topic.objects.create(channel=channel, name='general')
    Topic.objects.create(channel=elsewhere, name='general')

    assert Topic.objects.filter(name='general').count() == 2


@pytest.mark.django_db
def test_one_channel_cannot_have_two_topics_of_the_same_name(channel):
    Topic.objects.create(channel=channel, name='general')

    with pytest.raises(IntegrityError):
        Topic.objects.create(channel=channel, name='general')


@pytest.mark.django_db
def test_deleting_a_channel_removes_its_topics(channel):
    Topic.objects.create(channel=channel, name='general')
    channel.delete()

    assert Topic.objects.count() == 0
