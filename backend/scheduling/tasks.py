"""SC-03 — the dispatcher that actually delivers a scheduled message.

US-B2.2: "as a user, I want my message to be delivered at the time I chose,
even if I am offline." `SC-02` stored the row and `SC-01` stood up Celery; this
is the part that makes the sentence true.

**The whole of "even if I am offline" is one line** — the `events.publish` at
the end. `realtime.publisher.on_message_created` pushes the message to the
conversation group and `notifications.handlers.on_message_created` writes the
recipient's notification, and neither of them touches the request cycle or the
author's connection. This module imports neither: the seam is `common/events.py`
and it is used here exactly as `messaging/views.py` uses it (architecture.tex
§5.1). A scheduled message released by a worker is therefore indistinguishable
from one sent by hand, which is the property that makes it correct.
"""

import logging

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from common import events
from messaging.models import Message

logger = logging.getLogger(__name__)


def due_messages(now=None):
    """The rows this task is responsible for: scheduled, due, not yet sent.

    `scheduled_at` carries `db_index=True` for this query specifically. The
    `select_related` list is `ScheduledMessageListView.get_queryset`'s — both
    subscribers walk `sender`, the target and `media` while rendering, so
    fetching them here turns a per-message fan-out of queries into one join.
    """
    return (
        Message.objects
        .filter(
            scheduled_at__isnull=False,
            scheduled_at__lte=now or timezone.now(),
            is_delivered=False,
        )
        .select_related('sender', 'recipient', 'group', 'topic__channel', 'media')
        .order_by('scheduled_at', 'pk')
    )


def _claim(message, released_at):
    """Take exclusive ownership of one row, or report that somebody else has.

    Delivery is a publish, and a publish cannot be taken back — so the flag has
    to be set *before* it happens and only by one claimant. This is a
    conditional update: it re-tests `is_delivered=False` in the WHERE clause, so
    of two overlapping beat ticks, or a worker retrying after a lost
    acknowledgement, exactly one gets the row and the other is told `0`.

    `created_at` moves to the moment of release, and that is deliberate rather
    than incidental. `Message.Meta.ordering` is `['created_at']`, so a message
    left carrying its authoring time would be inserted *above* messages written
    while it waited — the socket would render it at the bottom of the
    conversation and a refresh would show it in the middle. The delivery moment
    is also the honest answer: as far as every reader is concerned, that is when
    the message arrived.
    """
    claimed = (
        Message.objects
        .filter(pk=message.pk, is_delivered=False)
        .update(is_delivered=True, created_at=released_at)
    )
    return claimed == 1


@shared_task
def dispatch_due_messages():
    """Release every message whose time has come. Returns how many.

    Runs once a minute from `CELERY_BEAT_SCHEDULE`, so a message is delivered
    within a minute of its `scheduled_at` rather than to the second — the
    composer's copy says "around" for that reason.
    """
    released_at = timezone.now()
    dispatched = 0

    for message in due_messages(released_at):
        if not _claim(message, released_at):
            # Another tick got there first. Not an error, and not worth a log
            # line at anything above debug — it is the guard working.
            logger.debug("scheduled message %s was already claimed", message.pk)
            continue

        # Keep the in-memory copy consistent with the row that was just
        # written, because it is what the subscribers are about to serialize.
        message.is_delivered = True
        message.created_at = released_at

        # After the claim commits, never inside it. `events.publish` swallows
        # handler exceptions, so a publish that ran and was then rolled back
        # would have pushed a message over the socket that no longer exists.
        transaction.on_commit(
            lambda released=message: events.publish(
                events.MESSAGE_CREATED, message=released
            )
        )
        dispatched += 1

    # Logged unconditionally at info because `events.publish` never raises: if
    # both subscribers were to fail, every symptom would be silence, and this
    # count is the only evidence the task ran at all.
    if dispatched:
        logger.info("dispatched %s scheduled message(s)", dispatched)

    return dispatched
