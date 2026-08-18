"""Who is currently connected — the store behind the online indicator.

**Presence is connection state, so it is not a database column.** A `last_seen`
timestamp on `Profile` would be a migration, an `ERD.tex` amendment and a row
written on every socket open and close, and it would still answer the question
wrong: a process that dies leaves the column saying "online" forever. This
module holds the answer where the connections are, and a restart simply starts
from nobody (`reset()`, called from `config/asgi.py`).

**One key per user, and only one.** `presence:conns:<user_id>` is the set of
channel names that user has open: one tab is one socket, and somebody with three
tabs must not go offline when they close one, so **the transitions are
reference-counted rather than boolean**. There is no second "who is online" set
summarising it — `online_user_ids` reads the connection sets themselves, so
being online is derived from the connections rather than asserted beside them
and the two cannot disagree.

That is not a style preference. The first version kept both, and a page load —
which closes the old socket and opens the new one at the same instant, so the
two calls genuinely interleave — left them disagreeing: a user with no open
sockets still listed as online, which is "online for ever" and exactly the bug
presence exists to avoid.

`mark_online` and `mark_offline` answer *whether the user crossed the
boundary*, not whether they are online — the caller broadcasts only on the
crossing, so opening a second tab is silent. Each is **one Lua script**, because
that boolean is a read and a write that must not be separated: two connects
racing could otherwise both decide they were the first.

Redis when `settings.REDIS_URL` is set, a module-level dict when it is not.
That mirrors `CHANNEL_LAYERS` in `config/settings.py` and for the same reason:
`pytest` runs without the compose stack, and `npm run dev` against a bare
`runserver` has to boot. The fallback is per-process, which is exactly as much
as an in-process channel layer can fan out to anyway.
"""

from django.conf import settings

CONNECTIONS_KEY = 'presence:conns:{user_id}'

# The in-process fallback: {user_id: {channel_name, ...}}. Only ever touched
# when REDIS_URL is unset, and never in the container stack.
_local = {}


def _redis():
    """A client, or None when this process has no Redis to talk to."""
    url = getattr(settings, 'REDIS_URL', '')
    if not url:
        return None

    # Imported lazily: a deployment without Redis should not pay for the import,
    # and this module is reached from a consumer rather than at startup.
    import redis.asyncio as redis

    return redis.from_url(url, decode_responses=True)


# KEYS[1] the user's connection set, ARGV[1] the channel name. Answers 1 when
# this connection is the user's first — the add and the count are one step so
# two connects racing cannot both decide they were.
_MARK_ONLINE = """
local added = redis.call('SADD', KEYS[1], ARGV[1])
if added == 1 and redis.call('SCARD', KEYS[1]) == 1 then return 1 else return 0 end
"""

# The mirror. Answers 1 when this was the user's last connection. `removed` is
# checked so a disconnect for a socket that never registered — an
# unauthenticated one, or a repeat — reports no transition.
_MARK_OFFLINE = """
local removed = redis.call('SREM', KEYS[1], ARGV[1])
if redis.call('SCARD', KEYS[1]) > 0 then return 0 end
redis.call('DEL', KEYS[1])
if removed == 1 then return 1 else return 0 end
"""


async def mark_online(user_id, channel_name):
    """Record a connection. True when this is the user's *first* one."""
    user_id = int(user_id)
    client = _redis()

    if client is None:
        connections = _local.setdefault(user_id, set())
        first = not connections
        connections.add(channel_name)
        return first

    try:
        crossed = await client.eval(
            _MARK_ONLINE, 1, CONNECTIONS_KEY.format(user_id=user_id), channel_name,
        )
        return bool(crossed)
    finally:
        await client.aclose()


async def mark_offline(user_id, channel_name):
    """Drop a connection. True when it was the user's *last* one."""
    user_id = int(user_id)
    client = _redis()

    if client is None:
        connections = _local.get(user_id)
        if not connections or channel_name not in connections:
            return False
        connections.discard(channel_name)
        if connections:
            return False
        _local.pop(user_id, None)
        return True

    try:
        crossed = await client.eval(
            _MARK_OFFLINE, 1, CONNECTIONS_KEY.format(user_id=user_id), channel_name,
        )
        return bool(crossed)
    finally:
        await client.aclose()


async def online_user_ids():
    """Everybody with at least one open socket, as a list of ints.

    A connecting client needs this once, to render the state that was already
    true before it arrived. Everything after that is a `presence.changed` frame.

    Read from the connection sets themselves, so what a client renders is
    derived from the connections rather than from a summary that could be stale.
    The scan is over one key per connected user, which is the same order as the
    answer it returns.
    """
    client = _redis()

    if client is None:
        return sorted(user_id for user_id, conns in _local.items() if conns)

    try:
        prefix = CONNECTIONS_KEY.format(user_id='')
        online = []
        async for key in client.scan_iter(match=CONNECTIONS_KEY.format(user_id='*')):
            if await client.scard(key):
                online.append(int(key[len(prefix):]))
        return sorted(online)
    finally:
        await client.aclose()


async def reset():
    """Forget every connection. Called once, from `config/asgi.py`.

    Redis outlives the process that wrote to it, so a daphne restart would
    otherwise leave everybody who was connected at the moment it died listed as
    online for good. The call belongs in `asgi.py` and **not** in
    `RealtimeConfig.ready()`: `celery_worker` and `celery_beat` run `ready()`
    too, and either of them restarting would wipe the presence of users who are
    connected right now. Only daphne imports `asgi.py`.
    """
    _local.clear()

    client = _redis()
    if client is None:
        return

    try:
        keys = [key async for key in client.scan_iter(match=CONNECTIONS_KEY.format(user_id='*'))]
        if keys:
            await client.delete(*keys)
        # An earlier version kept a second `presence:online` set beside these.
        # Redis outlives the code that wrote it, so a stack upgraded in place
        # would carry that key for ever; nothing reads it now, and this is the
        # one place that runs on every start.
        await client.delete('presence:online')
    finally:
        await client.aclose()
