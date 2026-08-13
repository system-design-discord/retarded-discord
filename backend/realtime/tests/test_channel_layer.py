"""RT-01 — the channel layer actually carries a message between two consumers.

The bug this card fixes is invisible in a single-process dev stack: with
`InMemoryChannelLayer` a `group_send` reaches only the sockets held by the
process that sent it, so fan-out appears to work right up until there is a
second worker, and then it fails intermittently for half the users.

These tests pass on either backend on purpose. They pin the *contract* — join a
group, send to it, both members receive — so swapping the backend cannot
silently change what the gateway is allowed to assume.
`test_a_configured_redis_url_selects_the_redis_backend` is the one that asserts
which backend the compose stack actually gets.

**Every name here is unique per test.** Redis outlives the process, so a fixed
channel name leaves a message behind for the next run to read as its own —
which is not a hypothetical: writing this file produced exactly that failure.
`InMemoryChannelLayer` hides it by being rebuilt with the process.
"""

import asyncio
from uuid import uuid4

import pytest
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.test import override_settings


@pytest.fixture
def names():
    """A group and two channel names nothing else will ever use."""
    unique = uuid4().hex[:12]
    return {
        'group': f'test-conversation-{unique}',
        'first': f'first-{unique}',
        'second': f'second-{unique}',
    }


@pytest.mark.django_db
def test_two_consumers_in_one_group_both_receive(names):
    layer = get_channel_layer()

    async_to_sync(layer.group_add)(names['group'], names['first'])
    async_to_sync(layer.group_add)(names['group'], names['second'])
    async_to_sync(layer.group_send)(names['group'], {'type': 'message.created', 'id': 7})

    assert async_to_sync(layer.receive)(names['first'])['id'] == 7
    assert async_to_sync(layer.receive)(names['second'])['id'] == 7


@pytest.mark.django_db
def test_leaving_the_group_stops_delivery(names):
    """`group_discard` is what a disconnect runs; a socket that has gone away
    must not keep a slot in the group.

    The negative half needs a timeout rather than a plain `receive`, because a
    channel with nothing waiting blocks forever — which is exactly the shape of
    the assertion: *nothing arrives*, not *something else arrives*.
    """
    layer = get_channel_layer()

    async_to_sync(layer.group_add)(names['group'], names['first'])
    async_to_sync(layer.group_add)(names['group'], names['second'])
    async_to_sync(layer.group_discard)(names['group'], names['second'])
    async_to_sync(layer.group_send)(names['group'], {'type': 'message.created', 'id': 9})

    assert async_to_sync(layer.receive)(names['first'])['id'] == 9

    async def nothing_for_the_one_that_left():
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(layer.receive(names['second']), timeout=0.5)

    async_to_sync(nothing_for_the_one_that_left)()


def test_a_configured_redis_url_selects_the_redis_backend(settings):
    """The setting is read from the environment, so the branch is what matters:
    with REDIS_URL set the compose stack must not quietly fall back to a layer
    that cannot leave the process."""
    from config import settings as project_settings

    if project_settings.REDIS_URL:
        assert settings.CHANNEL_LAYERS['default']['BACKEND'] == (
            'channels_redis.core.RedisChannelLayer'
        )
        assert settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'] == [project_settings.REDIS_URL]
    else:
        assert settings.CHANNEL_LAYERS['default']['BACKEND'] == (
            'channels.layers.InMemoryChannelLayer'
        )


@override_settings(
    CHANNEL_LAYERS={'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}
)
@pytest.mark.django_db
def test_the_in_memory_fallback_still_satisfies_the_contract(names):
    """A clone with no REDIS_URL has to boot and behave, which is why the
    fallback exists at all."""
    layer = get_channel_layer()

    async_to_sync(layer.group_add)(names['group'], names['first'])
    async_to_sync(layer.group_send)(names['group'], {'type': 'message.created', 'id': 1})

    assert async_to_sync(layer.receive)(names['first'])['id'] == 1
