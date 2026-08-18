"""The presence store — who is connected, and when that changed.

`realtime/presence.py` is deliberately not a database column: presence is
connection state, a `last_seen` timestamp would need a migration and an
`ERD.tex` amendment, and a process that died would leave it saying "online"
for ever. These tests run against **whichever backend the environment configures** —
Redis inside the compose stack, the in-process dict on a bare checkout — because
the two have to answer identically and a test that only ever saw one of them
would not prove that. `reset()` is what clears either.

The property that matters and is easy to get wrong is the **reference count**:
one person with three tabs is three sockets and one presence, so closing one
tab must announce nothing.
"""

import pytest
import pytest_asyncio

from realtime import presence


@pytest_asyncio.fixture(autouse=True)
async def clean_store():
    """Neither store is torn down by the test database.

    The fallback is a module-level dict and Redis outlives the process
    entirely, so without this a leftover from one test is an extra id in the
    next one's snapshot. `reset()` rather than clearing `_local` by hand,
    precisely so this works on both backends.
    """
    await presence.reset()
    yield
    await presence.reset()


@pytest.mark.asyncio
async def test_the_first_connection_brings_a_user_online():
    assert await presence.mark_online(7, 'socket-a') is True
    assert await presence.online_user_ids() == [7]


@pytest.mark.asyncio
async def test_a_second_connection_announces_nothing():
    """Opening a second tab must not tell everybody you came online again."""
    await presence.mark_online(7, 'socket-a')

    assert await presence.mark_online(7, 'socket-b') is False
    assert await presence.online_user_ids() == [7]


@pytest.mark.asyncio
async def test_closing_one_of_two_tabs_leaves_the_user_online():
    """The whole reason connections are counted rather than flagged."""
    await presence.mark_online(7, 'socket-a')
    await presence.mark_online(7, 'socket-b')

    assert await presence.mark_offline(7, 'socket-a') is False
    assert await presence.online_user_ids() == [7]


@pytest.mark.asyncio
async def test_closing_the_last_tab_takes_the_user_offline():
    await presence.mark_online(7, 'socket-a')
    await presence.mark_online(7, 'socket-b')
    await presence.mark_offline(7, 'socket-a')

    assert await presence.mark_offline(7, 'socket-b') is True
    assert await presence.online_user_ids() == []


@pytest.mark.asyncio
async def test_disconnecting_an_unknown_socket_is_not_a_transition():
    """A disconnect can arrive for a socket that never completed a connect —
    an unauthenticated one, for instance. It must not announce anything."""
    assert await presence.mark_offline(7, 'never-connected') is False
    assert await presence.online_user_ids() == []


@pytest.mark.asyncio
async def test_two_users_are_independent():
    await presence.mark_online(7, 'socket-a')
    await presence.mark_online(8, 'socket-b')

    assert await presence.online_user_ids() == [7, 8]

    await presence.mark_offline(7, 'socket-a')

    assert await presence.online_user_ids() == [8]


@pytest.mark.asyncio
async def test_ids_are_ints_whatever_the_caller_passes():
    """`scope['user'].id` is an int, but a Redis round trip is strings. The
    frontend compares these against `user.id`, so a string here is a dot that
    silently never lights up."""
    await presence.mark_online('7', 'socket-a')

    assert await presence.online_user_ids() == [7]


@pytest.mark.asyncio
async def test_reset_forgets_everything():
    """What `config/asgi.py` calls, so a restart does not leave the people who
    were connected when the process died listed as online for good."""
    await presence.mark_online(7, 'socket-a')
    await presence.mark_online(8, 'socket-b')

    await presence.reset()

    assert await presence.online_user_ids() == []
