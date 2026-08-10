"""Internal event seam — architecture.tex §5.1.

When something notable happens, the owning module raises an event here rather
than importing Notifications or Realtime directly. Those modules subscribe.
This keeps the core write path decoupled from delivery, and it is why the
bonus modules can be added later without touching the messaging code.

    # messaging/views.py
    from common import events
    events.publish(events.MESSAGE_CREATED, message=message)

    # notifications/apps.py — in ready()
    from common import events
    events.subscribe(events.MESSAGE_CREATED, handlers.on_message_created)

Handlers run synchronously, in registration order, in the caller's thread. A
handler that raises is logged and skipped: a failed notification must never
fail the message that triggered it.
"""

import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

# The three events US-11.1 names, plus the one the real-time gateway needs.
MESSAGE_CREATED = 'message.created'
MEMBER_ADDED = 'member.added'
ROLE_CHANGED = 'role.changed'

_subscribers = defaultdict(list)


def subscribe(event, handler):
    """Register handler to be called whenever event is published."""
    _subscribers[event].append(handler)


def publish(event, **payload):
    """Notify every subscriber of event. Never raises."""
    for handler in _subscribers[event]:
        try:
            handler(**payload)
        except Exception:
            logger.exception("event handler failed for %s", event)
