"""Fan what just happened out to the sockets that care about it.

**This is the whole reason `common/events.py` exists.** `messaging` publishes
`MESSAGE_CREATED` and does not know who is listening; `notifications` subscribed
to it in `N-02`, and this module subscribes to the same event without either of
them importing the other. `architecture.tex` §5.1 is the rule, and
`tests/test_decoupling.py` asserts it rather than trusting it — the same test
`notifications` already carries.

The payload is `MessageSerializer`'s, so a message arriving over the socket has
the identical shape to one read from `GET /api/messages/`. A client that had to
reconcile two shapes for the same object would end up with two renderers, which
is the mistake `F-00` spent three points undoing on the other side of the wire.

A handler that raises is logged and skipped by `events.publish`, so a Redis
outage degrades to "no live delivery" rather than "messages cannot be sent".
That is deliberate: the socket is a convenience over a REST write that has
already succeeded and been persisted by the time this runs.

**Structural changes are the second family here and they are shaped
differently on purpose.** A message is addressed to a *conversation*, so
`group_for_message` can name one channel-layer group and one `group_send` does
the whole fan-out. A renamed topic, a deleted channel, a group somebody was
just added to — none of those is a conversation, and the screens that have to
correct themselves are lists, rails and headers rather than a message list. The
only connection open on every one of those screens is `/ws/notifications/`, so
the fan-out is one `group_send` per member to `user_group(member)`, and the
audience is read by the publishing module *before* the write rather than looked
up here. `common/events.py` says why that is not laziness: after a delete there
is no membership left to read.

They also share **one wire type**, `structure.changed`, where messages use
three. Channels resolves a channel-layer `type` to a method of the same name
and a frame with no matching method raises and takes the socket down with it,
so eight types would be eight chances to forget one. The client branches on
`scope` and `action` inside the frame instead.
"""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .groups import broadcast_group, group_for_message, user_group

logger = logging.getLogger(__name__)


def on_message_created(message, **_):
    """Subscriber for `common.events.MESSAGE_CREATED`."""
    group_name = group_for_message(message)
    if group_name is None:
        # A message with no target cannot exist — the serializer and a database
        # check constraint both refuse it — so this is unreachable rather than
        # tolerated, and it is logged as the anomaly it would be.
        logger.warning("message %s has no target; nothing to fan out", message.pk)
        return

    layer = get_channel_layer()
    if layer is None:
        return

    # Imported here, not at module scope: the serializer pulls in accounts and
    # media_app, and this module is imported from RealtimeConfig.ready().
    from messaging.serializers import MessageSerializer

    async_to_sync(layer.group_send)(
        group_name,
        {
            # Matches ConversationConsumer.message_created — channels turns a
            # `type` of "message.created" into a call to `message_created`.
            'type': 'message.created',
            'message': MessageSerializer(message).data,
        },
    )


def on_message_updated(message, **_):
    """Subscriber for `common.events.MESSAGE_UPDATED` — US-3.1.

    The same group and the same serializer as `on_message_created`, because an
    edited message *is* the message: a client that had to reconcile a second
    shape for it would need a second renderer, which is the mistake the create
    path already avoids. The `type` is all that differs, and it differs so the
    client can tell "a new message arrived" from "one you already have has
    changed" without comparing ids.
    """
    group_name = group_for_message(message)
    if group_name is None:
        logger.warning("message %s has no target; nothing to fan out", message.pk)
        return

    layer = get_channel_layer()
    if layer is None:
        return

    from messaging.serializers import MessageSerializer

    async_to_sync(layer.group_send)(
        group_name,
        {
            'type': 'message.updated',
            'message': MessageSerializer(message).data,
        },
    )


def on_message_deleted(message, message_id, **_):
    """Subscriber for `common.events.MESSAGE_DELETED` — US-3.3 to US-3.6.

    The one frame here that is not a serialized message, and it cannot be: the
    row is gone by the time this runs. An id is also all a client needs, since
    the only correct reaction to a deletion is to drop what it is already
    holding.

    The instance is still the argument because `group_for_message` reads
    `recipient_id` / `group_id` / `topic_id`, and Django leaves those populated
    after `delete()` even though it nulls `pk`. That is why the publisher takes
    the id separately rather than reading `message.pk` here.
    """
    group_name = group_for_message(message)
    if group_name is None:
        logger.warning("message %s has no target; nothing to fan out", message_id)
        return

    layer = get_channel_layer()
    if layer is None:
        return

    async_to_sync(layer.group_send)(
        group_name,
        {
            'type': 'message.deleted',
            'id': message_id,
        },
    )


def on_profile_updated(user_id, payload, **_):
    """Subscriber for `common.events.PROFILE_UPDATED` — US-10.1.

    Addressed to `broadcast_group()` and not to a conversation, because a
    username and an avatar are rendered on every screen that has ever mentioned
    that person: message bubbles, member lists, the direct-message rail. Working
    out which of those a given client currently has open is the client's
    business and not the gateway's, so the gateway tells everybody and each
    client re-reads what it is actually showing.

    Like `on_notification_created`, the payload arrives already serialized.
    `accounts` decides which fields of a profile are public; a frame that goes
    to every connected socket is the last place to re-derive that.
    """
    layer = get_channel_layer()
    if layer is None:
        return

    async_to_sync(layer.group_send)(
        broadcast_group(),
        {
            'type': 'profile.updated',
            'user_id': int(user_id),
            'profile': payload,
        },
    )


def on_notification_created(user_id, payload, **_):
    """Subscriber for `common.events.NOTIFICATION_CREATED` — RT-03, US-B1.2.

    Shorter than its sibling above, and the difference is the whole point of
    the card. `on_message_created` imports `MessageSerializer` and renders the
    row itself; this one cannot, because `realtime` importing `notifications`
    would break the peer rule both modules are held to and
    `tests/test_decoupling.py` would fail. So `notifications.services` hands
    over an already-serialized `payload` and the gateway forwards bytes whose
    shape it never has to know.

    The recipient is addressed directly rather than through a conversation:
    a notification belongs to exactly one person, and `user_group` is the only
    group their sockets are in. Nobody else's socket is in it, which is how
    "a recipient receives only their own" holds without a check here.
    """
    layer = get_channel_layer()
    if layer is None:
        return

    async_to_sync(layer.group_send)(
        user_group(user_id),
        {
            # Channels turns a `type` of "notification.created" into a call to
            # `notification_created` on NotificationConsumer.
            'type': 'notification.created',
            'notification': payload,
        },
    )


# --- Structural changes -----------------------------------------------------


def _fan_out_structure(audience, **frame):
    """Send one `structure.changed` frame to every member of `audience`.

    A loop of `group_send`s rather than one send to a shared group, because
    there is no group that means "the members of this channel": the gateway's
    only membership-shaped address is `user_group`, which is per person. The
    audience is small — it is one channel's or one group's members — and the
    alternative is a channel-layer group per channel that every notification
    socket would have to join and leave as memberships change, which is
    bookkeeping the delete path is in the worst position to get right.

    `audience` is whatever the publishing module read before the write; a
    duplicate id would only send the same frame twice to the same person, so it
    is de-duplicated here rather than being made the caller's problem.
    """
    layer = get_channel_layer()
    if layer is None:
        return

    for user_id in {int(one) for one in audience or ()}:
        async_to_sync(layer.group_send)(
            user_group(user_id),
            {'type': 'structure.changed', **frame},
        )


def on_channel_updated(audience, channel_id, payload, **_):
    """Subscriber for `common.events.CHANNEL_UPDATED`."""
    _fan_out_structure(
        audience, scope='channel', action='updated', id=int(channel_id), object=payload,
    )


def on_channel_deleted(audience, channel_id, **_):
    """Subscriber for `common.events.CHANNEL_DELETED`.

    No `object`, for `on_message_deleted`'s reason: the row is gone by the time
    this runs, and an id is all a client needs to drop what it is holding.
    """
    _fan_out_structure(audience, scope='channel', action='deleted', id=int(channel_id))


def on_topic_created(audience, channel_id, topic_id, payload, **_):
    """Subscriber for `common.events.TOPIC_CREATED`."""
    _fan_out_structure(
        audience,
        scope='topic',
        action='created',
        id=int(topic_id),
        channel_id=int(channel_id),
        object=payload,
    )


def on_topic_updated(audience, channel_id, topic_id, payload, **_):
    """Subscriber for `common.events.TOPIC_UPDATED` — a rename."""
    _fan_out_structure(
        audience,
        scope='topic',
        action='updated',
        id=int(topic_id),
        channel_id=int(channel_id),
        object=payload,
    )


def on_topic_deleted(audience, channel_id, topic_id, **_):
    """Subscriber for `common.events.TOPIC_DELETED`.

    This is the frame that also corrects the *messages*: `Topic.messages` is
    CASCADE, so its rows go at the database level and `MessageDetailView` never
    runs, which means no `MESSAGE_DELETED` is published for any of them. A
    client sitting in the topic learns from this frame or from nothing.
    """
    _fan_out_structure(
        audience,
        scope='topic',
        action='deleted',
        id=int(topic_id),
        channel_id=int(channel_id),
    )


def on_group_updated(audience, group_id, payload, **_):
    """Subscriber for `common.events.GROUP_UPDATED`."""
    _fan_out_structure(
        audience, scope='group', action='updated', id=int(group_id), object=payload,
    )


def on_group_deleted(audience, group_id, **_):
    """Subscriber for `common.events.GROUP_DELETED`."""
    _fan_out_structure(audience, scope='group', action='deleted', id=int(group_id))


def on_member_added(audience, user, channel=None, group=None, **_):
    """Subscriber for `common.events.MEMBER_ADDED`.

    `notifications.handlers` subscribes to this event too and tells the person
    who was added; this tells *their lists*, and everybody else's. The two are
    not the same job — a notification is a row in a centre, and it is the reason
    the badge moves, but nothing in the SPA turns a notification arrival into a
    list refresh and nothing should: a list refresh is about membership, not
    about having been told.

    The audience must already include the new member. They are in the group by
    the time this runs, so the publishing module reads it after the write here —
    the opposite of the delete path, and for the same reason.
    """
    subject = channel if channel is not None else group
    if subject is None:
        logger.warning("member.added names neither a channel nor a group")
        return

    _fan_out_structure(
        audience,
        scope='channel' if channel is not None else 'group',
        action='member_added',
        id=int(subject.pk),
        user_id=int(user.pk),
    )


def on_member_removed(audience, user, channel=None, group=None, **_):
    """Subscriber for `common.events.MEMBER_REMOVED`.

    The audience is read *before* the write and therefore still contains the
    person leaving, which is deliberate: their own screen is the one that most
    needs to hear it, and they are the one client that cannot re-read the
    channel afterwards to find out.
    """
    subject = channel if channel is not None else group
    if subject is None:
        logger.warning("member.removed names neither a channel nor a group")
        return

    _fan_out_structure(
        audience,
        scope='channel' if channel is not None else 'group',
        action='member_removed',
        id=int(subject.pk),
        user_id=int(user.pk),
    )
