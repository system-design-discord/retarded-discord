"""A-09: the seed command's two load-bearing properties.

`seed_data` runs on every container start (`backend/entrypoint.sh`), so
"idempotent" is not a nicety — a command that stacks a second copy of the demo
data on each restart makes the Review demo worse every time somebody reboots.

The role arrangement is pinned for INT-2's benefit: the sixteen-check matrix
needs an allowed case and a denied case *for the same member*, and it gets them
from the seed rather than from manual setup. A later edit that grants the demo
role everything would leave the matrix with nothing to refuse.
"""

import pytest
from django.core.management import call_command

from channels_app.models import Channel, ChannelMember, Topic
from messaging.models import Message
from roles import services
from roles.models import Role


@pytest.fixture
def seeded(db):
    call_command('seed_data', verbosity=0)


def _counts():
    return {
        'channels': Channel.objects.count(),
        'members': ChannelMember.objects.count(),
        'topics': Topic.objects.count(),
        'roles': Role.objects.count(),
        'topic_messages': Message.objects.filter(topic__isnull=False).count(),
    }


def test_seeding_twice_changes_nothing(seeded):
    """The entrypoint runs this on every start; a re-run must be a no-op."""
    after_first = _counts()

    call_command('seed_data', verbosity=0)

    assert _counts() == after_first


def test_the_seeded_channel_has_topics_and_members(seeded):
    channel = Channel.objects.get()

    assert channel.topics.count() == 2
    assert channel.memberships.count() == 3
    assert channel.memberships.filter(user=channel.owner).exists()


def test_the_demo_role_grants_some_permissions_and_refuses_others(seeded):
    """INT-2's allowed case, denied case and no-role case, from one command."""
    channel = Channel.objects.get()
    owner = channel.owner
    holder = ChannelMember.objects.exclude(user=owner).exclude(role=None).get().user
    roleless = ChannelMember.objects.filter(role=None).exclude(user=owner).get().user

    # The owner implicitly holds all eight, whatever the role table says.
    assert services.has_permission(owner, channel, 'can_send_media')

    # The same member, allowed one thing and refused another — the asymmetry is
    # the whole reason the seeded role is partial.
    assert services.has_permission(holder, channel, 'can_create_topic')
    assert not services.has_permission(holder, channel, 'can_send_media')

    # A member with no role holds nothing.
    assert not services.has_permission(roleless, channel, 'can_create_topic')
