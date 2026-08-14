"""SC-03 — the dispatcher, and the criterion it exists to satisfy.

US-B2.2 is "delivered at the time I chose, even if I am offline", so every test
here runs the task directly with no request and no authenticated client: that
absence *is* the criterion. If any of these needed a logged-in caller the
feature would not work.

`transaction.on_commit` is how the publish is deferred, so the tests that assert
delivery capture those callbacks rather than assuming they ran — pytest-django
wraps each test in a transaction that is never committed.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from common import events
from groups_app.models import Group
from messaging.models import Message
from notifications.models import Notification
from scheduling.tasks import dispatch_due_messages


def schedule(sender, recipient=None, group=None, *, minutes, text='later'):
    """A pending scheduled message, due `minutes` from now (negative = overdue)."""
    return Message.objects.create(
        sender=sender,
        recipient=recipient,
        group=group,
        text=text,
        scheduled_at=timezone.now() + timedelta(minutes=minutes),
        is_delivered=False,
    )


@pytest.fixture
def published():
    """Every MESSAGE_CREATED raised during the test, in order."""
    seen = []
    events.subscribe(events.MESSAGE_CREATED, lambda message: seen.append(message))
    return seen


# --- what gets delivered -------------------------------------------------


@pytest.mark.django_db
def test_a_due_message_is_delivered(user, other_user):
    message = schedule(user, other_user, minutes=-1)

    assert dispatch_due_messages() == 1

    message.refresh_from_db()
    assert message.is_delivered is True


@pytest.mark.django_db
def test_a_delivered_message_becomes_visible_to_both_sides(user, other_user):
    """`visible_to` filters `is_delivered=True`, so this is the difference
    between stored and delivered as every reader sees it."""
    message = schedule(user, other_user, minutes=-1)
    assert message not in Message.objects.visible_to(other_user)

    dispatch_due_messages()

    assert message in Message.objects.visible_to(other_user)
    assert message in Message.objects.visible_to(user)


@pytest.mark.django_db
def test_a_message_that_is_not_due_yet_is_left_alone(user, other_user):
    message = schedule(user, other_user, minutes=30)

    assert dispatch_due_messages() == 0

    message.refresh_from_db()
    assert message.is_delivered is False
    assert message not in Message.objects.visible_to(other_user)


@pytest.mark.django_db
def test_an_ordinary_message_is_never_touched(user, other_user):
    """An unscheduled message already has `is_delivered=True` and a null
    `scheduled_at`; the query must not see it at all."""
    Message.objects.create(sender=user, recipient=other_user, text='hi')

    assert dispatch_due_messages() == 0


@pytest.mark.django_db
def test_a_cancelled_row_is_not_delivered(user, other_user):
    """Cancelling deletes the row, so there is nothing left to dispatch."""
    message = schedule(user, other_user, minutes=-1)
    message.delete()

    assert dispatch_due_messages() == 0


@pytest.mark.django_db
def test_a_group_message_is_delivered_the_same_way(user, other_user):
    group = Group.objects.create_with_admin(admin=user, name='team')
    group.members.add(other_user)
    message = schedule(user, group=group, minutes=-1)

    assert dispatch_due_messages() == 1

    assert message in Message.objects.visible_to(other_user)


# --- the claim -----------------------------------------------------------


@pytest.mark.django_db
def test_a_second_tick_does_not_deliver_the_message_again(
    user, other_user, django_capture_on_commit_callbacks, published
):
    schedule(user, other_user, minutes=-1)

    with django_capture_on_commit_callbacks(execute=True):
        assert dispatch_due_messages() == 1
    with django_capture_on_commit_callbacks(execute=True):
        assert dispatch_due_messages() == 0

    assert len(published) == 1


@pytest.mark.django_db
def test_the_recipient_gets_exactly_one_notification(
    user, other_user, django_capture_on_commit_callbacks
):
    """The delivery is a real MESSAGE_CREATED, so `notifications.handlers`
    writes the row — this module does not know that module exists."""
    schedule(user, other_user, minutes=-1)

    with django_capture_on_commit_callbacks(execute=True):
        dispatch_due_messages()
    with django_capture_on_commit_callbacks(execute=True):
        dispatch_due_messages()

    assert Notification.objects.filter(user=other_user).count() == 1


# --- ordering ------------------------------------------------------------


@pytest.mark.django_db
def test_release_moves_created_at_to_the_delivery_moment(user, other_user):
    """`Message.Meta.ordering` is `['created_at']`. Left at the authoring time,
    a released message would sort above everything written while it waited —
    the socket would show it last and a refresh would show it in the middle."""
    scheduled = schedule(user, other_user, minutes=-1)
    authored_at = scheduled.created_at

    written_while_waiting = Message.objects.create(
        sender=other_user, recipient=user, text='meanwhile'
    )

    dispatch_due_messages()
    scheduled.refresh_from_db()

    assert scheduled.created_at > authored_at
    assert scheduled.created_at > written_while_waiting.created_at

    conversation = list(
        Message.objects.visible_to(user).filter(
            recipient__in=[user, other_user], sender__in=[user, other_user]
        )
    )
    assert conversation[-1] == scheduled


# --- the publish ---------------------------------------------------------


@pytest.mark.django_db
def test_delivery_publishes_message_created_after_the_claim_commits(
    user, other_user, django_capture_on_commit_callbacks, published
):
    """The one call that makes 'even if I am offline' true. It is deferred to
    commit so a rolled-back claim cannot leave a message on the socket that no
    longer exists in the database."""
    message = schedule(user, other_user, minutes=-1)

    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        dispatch_due_messages()

    assert len(callbacks) == 1
    assert [m.pk for m in published] == [message.pk]
    assert published[0].is_delivered is True


@pytest.mark.django_db
def test_nothing_is_published_for_a_message_that_is_not_due(
    user, other_user, django_capture_on_commit_callbacks, published
):
    schedule(user, other_user, minutes=30)

    with django_capture_on_commit_callbacks(execute=True):
        dispatch_due_messages()

    assert published == []


@pytest.mark.django_db
def test_several_due_messages_are_all_released_in_one_tick(
    user, other_user, django_capture_on_commit_callbacks, published
):
    for n in range(3):
        schedule(user, other_user, minutes=-(n + 1), text=f'message {n}')

    with django_capture_on_commit_callbacks(execute=True):
        assert dispatch_due_messages() == 3

    assert len(published) == 3
    assert Message.objects.filter(is_delivered=False).count() == 0


@pytest.mark.django_db
def test_a_failing_subscriber_does_not_undo_the_delivery(
    user, other_user, django_capture_on_commit_callbacks
):
    """`events.publish` logs and skips a handler that raises. The message is
    already claimed by then, so a broken notification cannot strand it as
    permanently undelivered."""
    def explode(message):
        raise RuntimeError('subscriber is broken')

    events.subscribe(events.MESSAGE_CREATED, explode)
    message = schedule(user, other_user, minutes=-1)

    with django_capture_on_commit_callbacks(execute=True):
        dispatch_due_messages()

    message.refresh_from_db()
    assert message.is_delivered is True


# --- the beat schedule ---------------------------------------------------


def test_the_beat_schedule_runs_the_dispatcher_every_minute():
    """Deviation 28 — the entry lives in settings rather than in the card's
    stated file list, so it is asserted here where it can be found."""
    from django.conf import settings

    entry = settings.CELERY_BEAT_SCHEDULE['dispatch-due-scheduled-messages']

    assert entry['task'] == 'scheduling.tasks.dispatch_due_messages'
    assert entry['schedule'] == 60.0


def test_the_dispatcher_is_registered_as_a_celery_task():
    """The worker started with an empty task list until this card. If
    autodiscovery ever stops finding the module, this is the test that says so
    rather than a scheduled message silently never arriving."""
    from config.celery import app

    assert 'scheduling.tasks.dispatch_due_messages' in app.tasks
