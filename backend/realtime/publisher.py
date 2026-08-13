"""Fan a newly created message out to the sockets watching its conversation.

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
"""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .groups import group_for_message

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
