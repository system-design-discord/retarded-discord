"""Isolation for the gateway's process-global state.

`backend/conftest.py` already does this for `common.events._subscribers`, and
presence is the same shape of problem one level worse: it lives in **Redis**,
which outlives not just the test but the process, so a socket left connected by
one test is a user still listed as online in the next one's snapshot. That is
the same warning `test_channel_layer.py` carries about group names.

Sync rather than async on purpose — an async autouse fixture would have to be
applied to `test_decoupling.py`'s ordinary sync tests as well.
"""

import pytest
from asgiref.sync import async_to_sync
from channels.layers import channel_layers

from realtime import presence


@pytest.fixture(autouse=True)
def isolated_presence():
    async_to_sync(presence.reset)()
    yield
    async_to_sync(presence.reset)()


@pytest.fixture(autouse=True)
def fresh_channel_layer():
    """A layer per test, because `RedisChannelLayer` caches loop-bound state.

    `pytest-asyncio` gives every test its own event loop, while
    `channel_layers` memoises one backend for the whole process. The layer
    holds `asyncio.Lock`s created on whichever loop first touched it, so a test
    that opens several sockets at once eventually reaches one bound to a loop
    that has closed and raises *"is bound to a different event loop"* — out of
    the consumer's teardown, which makes it look like the consumer's fault.

    Discarding the cached backends is enough; the next `get_channel_layer()`
    builds one on the current loop. Nothing is lost, because a channel layer
    holds no state worth keeping between tests.
    """
    channel_layers.backends.clear()
    yield
    channel_layers.backends.clear()
