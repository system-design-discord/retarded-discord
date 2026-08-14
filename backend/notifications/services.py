"""Writing notifications — the only place a `Notification` row is created.

`handlers.py` decides *who* hears about an event; this module decides what a
row looks like and refuses the one case that is always wrong: telling somebody
about something they did themselves.

**And it is the only place a notification is announced** (`RT-03`, US-B1.2).
Every write below publishes `NOTIFICATION_CREATED` so the gateway can push it to
an open socket. Three things about that are decisions rather than details:

  * **The row is serialized here, not by the subscriber.** `realtime` may not
    import `notifications` and vice versa — they are peers on the seam, and
    `realtime/tests/test_decoupling.py` asserts both directions. Handing over
    `NotificationSerializer(...).data` is what lets the gateway forward a
    notification it is forbidden to know the shape of, and it is why the push
    and `GET /api/notifications/` cannot drift apart: one serializer, one shape.
  * **Announcing is not delivering.** `events.publish` logs and swallows
    whatever a handler raises, so a Redis outage costs the live push and nothing
    else — the row is already committed and the recipient still finds it in the
    REST list. A user with no socket open loses nothing at all.
  * **Publication follows the write, never precedes it.** A push for a row that
    then failed to save would be a notification the recipient can see once and
    never again.
"""

from common import events

from .models import Notification
from .serializers import NotificationSerializer


def _announce(notification):
    """Tell the seam a notification exists. See the module docstring."""
    events.publish(
        events.NOTIFICATION_CREATED,
        user_id=notification.user_id,
        payload=NotificationSerializer(notification).data,
    )


def notify(user, kind, content, link=None, actor=None):
    """Record one notification, unless it would be sent to its own cause.

    Returns the row, or `None` when it was skipped. `actor` is whoever performed
    the action; passing it is how a caller says "not if this is the same
    person", which is otherwise the check every handler would have to remember.
    """
    if user is None or not user.is_authenticated:
        return None
    if actor is not None and actor.pk == user.pk:
        return None

    notification = Notification.objects.create(user=user, type=kind, content=content, link=link)
    _announce(notification)
    return notification


def notify_many(users, kind, content, link=None, actor=None):
    """`notify` for a conversation's worth of recipients, in one INSERT.

    A message in a busy channel notifies every member, and one query for the
    lot keeps the write path of a message roughly as cheap as it was before
    notifications existed.
    """
    recipients = [
        user for user in users
        if user is not None and (actor is None or actor.pk != user.pk)
    ]
    if not recipients:
        return []

    # One INSERT, then one publication per row. `bulk_create` fills in the
    # primary keys on PostgreSQL, which is what makes the rows announceable at
    # all — the client needs the id to dedupe a push against a row it may
    # already have read over REST.
    notifications = Notification.objects.bulk_create([
        Notification(user=user, type=kind, content=content, link=link)
        for user in recipients
    ])

    for notification in notifications:
        _announce(notification)

    return notifications
