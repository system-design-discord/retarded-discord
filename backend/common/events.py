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

# The three events US-11.1 names, the one US-B1.2 added, and the three that
# followed for live edit, delete and profile propagation. Their payloads are
# part of the contract — a subscriber written against them must keep working
# when a second publisher appears, which is exactly what happened to
# MEMBER_ADDED.
#
# | Event                | Payload                                    | Published by             |
# |----------------------|--------------------------------------------|--------------------------|
# | MESSAGE_CREATED      | message                                    | messaging                |
# | MESSAGE_UPDATED      | message                                    | messaging                |
# | MESSAGE_DELETED      | message, message_id                        | messaging                |
# | MEMBER_ADDED         | audience, user, actor, channel= or group=  | channels_app, groups_app |
# | MEMBER_REMOVED       | audience, user, actor, channel= or group=  | channels_app, groups_app |
# | ROLE_CHANGED         | channel, user, role, actor                 | roles                    |
# | NOTIFICATION_CREATED | user_id, payload                           | notifications            |
# | PROFILE_UPDATED      | user_id, payload                           | accounts                 |
# | CHANNEL_UPDATED      | audience, channel_id, payload              | channels_app             |
# | CHANNEL_DELETED      | audience, channel_id                       | channels_app             |
# | TOPIC_CREATED        | audience, channel_id, topic_id, payload    | channels_app             |
# | TOPIC_UPDATED        | audience, channel_id, topic_id, payload    | channels_app             |
# | TOPIC_DELETED        | audience, channel_id, topic_id             | channels_app             |
# | GROUP_UPDATED        | audience, group_id, payload                | groups_app               |
# | GROUP_DELETED        | audience, group_id                         | groups_app               |
#
# MESSAGE_UPDATED and MESSAGE_DELETED are MESSAGE_CREATED's siblings and carry
# the same `message`, so a subscriber renders all three the same way. The
# deleted one carries `message_id` *as well* because `Model.delete()` sets
# `instance.pk` to None: the row's identity has to be captured before the write
# or it cannot be named afterwards. Everything else on the instance survives —
# `recipient_id`, `group_id` and `topic_id` are still populated, which is what
# lets a subscriber still work out which conversation the message was in.
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
#
# PROFILE_UPDATED follows NOTIFICATION_CREATED's shape rather than
# MESSAGE_CREATED's, for a different reason: it is fanned out to *every*
# connected client, so which fields of a profile are public is a decision that
# belongs to `accounts` and to nobody else. Handing over the row would put that
# decision in the gateway.
#
# **The eight structural events below all carry `audience`, and that is the
# whole of their design.** A structural change is addressed to the people who
# are *in* the thing that changed, and after a delete there is nobody left to
# ask: deleting a channel takes its `ChannelMember` rows with it, so a
# subscriber that tried to look the membership up would find an empty list and
# fan the news out to nobody. The publishing module therefore reads the audience
# **before** the write and hands it over, exactly as MESSAGE_DELETED already
# hands over a `message_id` captured before `delete()` nulled the pk.
#
# They carry a pre-rendered `payload` for the same reason NOTIFICATION_CREATED
# does — the row may not exist by the time a subscriber runs — and `None` where
# there is nothing left to render. `channel_id` rides along on the topic events
# because a topic is only ever meaningful inside its channel, and the client
# holding a topic list is holding the channel's.
MESSAGE_CREATED = 'message.created'
MESSAGE_UPDATED = 'message.updated'
MESSAGE_DELETED = 'message.deleted'
MEMBER_ADDED = 'member.added'
MEMBER_REMOVED = 'member.removed'
ROLE_CHANGED = 'role.changed'
NOTIFICATION_CREATED = 'notification.created'
PROFILE_UPDATED = 'profile.updated'
CHANNEL_UPDATED = 'channel.updated'
CHANNEL_DELETED = 'channel.deleted'
TOPIC_CREATED = 'topic.created'
TOPIC_UPDATED = 'topic.updated'
TOPIC_DELETED = 'topic.deleted'
GROUP_UPDATED = 'group.updated'
GROUP_DELETED = 'group.deleted'

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
