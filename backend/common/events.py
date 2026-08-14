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

# The three events US-11.1 names, plus the one US-B1.2 added. Their payloads are
# part of the contract — a subscriber written against them must keep working
# when a second publisher appears, which is exactly what happened to
# MEMBER_ADDED.
#
# | Event                | Payload                                    | Published by             |
# |----------------------|--------------------------------------------|--------------------------|
# | MESSAGE_CREATED      | message                                    | messaging                |
# | MEMBER_ADDED         | user, actor, and one of channel= or group= | channels_app, groups_app |
# | ROLE_CHANGED         | channel, user, role, actor                 | roles                    |
# | NOTIFICATION_CREATED | user_id, payload                           | notifications            |
#
# NOTIFICATION_CREATED is the odd one out and deliberately so: it carries an
# `id` and an already-serialized `payload` rather than the `Notification` row.
# Every other event hands over the model and lets the subscriber serialize it —
# `realtime.publisher` imports `MessageSerializer` to do exactly that for
# MESSAGE_CREATED. That cannot happen here. `notifications` and `realtime` are
# peers on this seam and neither may import the other (RT-03's third criterion,
# asserted by `realtime/tests/test_decoupling.py`), so a `Notification` row on
# the wire would be a row the only interested subscriber is forbidden to render.
# The owning module serializes instead, and the gateway forwards bytes it does
# not have to understand.
MESSAGE_CREATED = 'message.created'
MEMBER_ADDED = 'member.added'
ROLE_CHANGED = 'role.changed'
NOTIFICATION_CREATED = 'notification.created'

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
