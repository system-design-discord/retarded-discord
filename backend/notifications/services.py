"""Writing notifications — the only place a `Notification` row is created.

`handlers.py` decides *who* hears about an event; this module decides what a
row looks like and refuses the one case that is always wrong: telling somebody
about something they did themselves.
"""

from .models import Notification


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

    return Notification.objects.create(user=user, type=kind, content=content, link=link)


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

    return Notification.objects.bulk_create([
        Notification(user=user, type=kind, content=content, link=link)
        for user in recipients
    ])
