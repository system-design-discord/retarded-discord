"""B-1 — the suppressed record, and the ones that must survive it.

Silencing a log line is only safe if you can say exactly which line. This is
that statement, written as tests rather than as a comment, because the failure
mode of getting it wrong is a Redis outage that loses messages in silence.

The record being dropped is daphne's *"Exception inside application: Timeout
reading from redis"*, raised when Channels' `await_many_dispatch` cancels a
pending read on an ordinary WebSocket teardown. Under redis 8 that cancellation
arrives as a `redis.exceptions.TimeoutError` instead of a `CancelledError`;
`requirements.txt` pins below that and this is the belt to its braces.
"""

import logging

import pytest
from django.conf import settings

from config.logging_filters import SuppressRedisTeardownTimeout


class FakeRedisTimeout(Exception):
    """Shaped like `redis.exceptions.TimeoutError` — the filter identifies it
    by module and name so that importing redis is not a settings-time
    requirement (the channel layer is optional, RT-01)."""

    __module__ = 'redis.exceptions'


FakeRedisTimeout.__name__ = 'TimeoutError'
FakeRedisTimeout.__qualname__ = 'TimeoutError'


def raise_through(frame_name, exception):
    """Raise `exception` from a function literally named `frame_name`, so the
    traceback carries that frame — which is the only thing the filter reads."""
    source = f'def {frame_name}():\n    raise exception\n'
    scope = {'exception': exception}
    exec(compile(source, '<generated>', 'exec'), scope)  # noqa: S102
    try:
        scope[frame_name]()
    except Exception as caught:  # noqa: BLE001
        return caught
    return None


def record_for(exception):
    return logging.LogRecord(
        name='daphne.server',
        level=logging.ERROR,
        pathname=__file__,
        lineno=1,
        msg='Exception inside application: %s',
        args=(exception,),
        exc_info=(type(exception), exception, exception.__traceback__),
    )


@pytest.fixture
def suppress():
    return SuppressRedisTeardownTimeout()


def test_the_teardown_traceback_is_dropped(suppress):
    caught = raise_through('await_many_dispatch', FakeRedisTimeout('Timeout reading from redis:6379'))

    assert suppress.filter(record_for(caught)) is False


def test_a_redis_timeout_from_anywhere_else_survives(suppress):
    """The property this file exists for. A layer that cannot reach Redis at
    all raises from `group_send` or from connection setup — a path the socket
    teardown never takes — and that is a real fault somebody has to see."""
    caught = raise_through('group_send', FakeRedisTimeout('Timeout reading from redis:6379'))

    assert suppress.filter(record_for(caught)) is True


def test_a_non_redis_timeout_during_teardown_survives(suppress):
    """Narrow on the exception as well as on the frame: a plain `TimeoutError`
    in the same place is a different problem."""
    caught = raise_through('await_many_dispatch', TimeoutError('the database went away'))

    assert suppress.filter(record_for(caught)) is True


def test_an_ordinary_error_is_untouched(suppress):
    caught = raise_through('await_many_dispatch', ValueError('something else entirely'))

    assert suppress.filter(record_for(caught)) is True


def test_a_record_carrying_no_exception_is_untouched(suppress):
    record = logging.LogRecord(
        name='daphne.server', level=logging.ERROR, pathname=__file__, lineno=1,
        msg='Listening on TCP address 0.0.0.0:8000', args=(), exc_info=None,
    )

    assert suppress.filter(record) is True


def test_the_filter_is_wired_to_the_logger_that_writes_the_record():
    """`daphne.server` is where the message comes from — `daphne/server.py`'s
    `logger.error("Exception inside application: %s", ..., exc_info=...)`."""
    assert 'daphne.server' in settings.LOGGING['loggers']
    assert settings.LOGGING['loggers']['daphne.server']['filters'] == [
        'suppress_redis_teardown_timeout'
    ]
    assert settings.LOGGING['disable_existing_loggers'] is False
