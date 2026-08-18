"""Drop the one log record we have understood — B-1.

Channels' `await_many_dispatch` cancels a pending `channel_receive` on every
ordinary WebSocket teardown. Under redis 8 that cancellation comes back as a
`redis.exceptions.TimeoutError` rather than a `CancelledError`,
`channels_redis==4.3.0` does not catch it, and daphne logs sixty lines of
traceback for a socket that was already closing. `backend/requirements.txt`
carries the bisect and pins `redis` below the change; this is the second half,
so a machine that resolves past the pin is quiet too.

**Silence something you have understood, never something you have not**, so the
filter is as narrow as it can be made:

* the exception must be a redis one, and
* a `TimeoutError`, and
* its traceback must pass through `await_many_dispatch`.

A Redis outage that actually loses a message does not satisfy the third
condition — its timeout is raised from `group_send`, `send` or the layer's
connection setup, which is a path the socket teardown never takes — so a real
fault still reaches the log. That is the property this file exists to keep, and
the reason the frame name is checked rather than the message text.
"""

import logging

# The dispatch loop whose cancellation is the whole cause. `channels.utils`.
TEARDOWN_FRAME = 'await_many_dispatch'


def _is_redis_timeout(exception):
    """A `redis.exceptions.TimeoutError`, identified without importing redis.

    The channel layer is optional — `REDIS_URL` unset falls back to the
    in-process layer (RT-01) — and a logging filter is not a good reason to make
    a dependency mandatory at settings-import time.
    """
    return (
        isinstance(exception, Exception)
        and type(exception).__name__ == 'TimeoutError'
        and type(exception).__module__.startswith('redis.')
    )


def _raised_during_teardown(exception):
    traceback = exception.__traceback__
    while traceback is not None:
        if traceback.tb_frame.f_code.co_name == TEARDOWN_FRAME:
            return True
        traceback = traceback.tb_next
    return False


class SuppressRedisTeardownTimeout(logging.Filter):
    def filter(self, record):
        exception = (record.exc_info or (None, None, None))[1]
        if exception is None:
            return True
        return not (_is_redis_timeout(exception) and _raised_during_teardown(exception))
