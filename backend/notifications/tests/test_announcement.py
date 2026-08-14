"""RT-03, first half — every notification written is announced on the seam.

`services.py` is the only place a `Notification` row is created, so it is the
only place that has to publish `NOTIFICATION_CREATED`. These tests hold that
true from both ends: the write publishes, and the payload it publishes is the
same shape `GET /api/notifications/` returns.

The subscriber that consumes this lives in `realtime`, and neither module may
import the other — `realtime/tests/test_decoupling.py` asserts that. So nothing
here imports the gateway either; the seam is exercised directly.
"""

import pytest

from common import events
from notifications.models import Notification
from notifications.serializers import NotificationSerializer
from notifications.services import notify, notify_many


@pytest.fixture
def announcements():
    """Everything published as NOTIFICATION_CREATED during the test.

    `conftest.py`'s autouse `isolated_event_subscribers` snapshots and restores
    the registry, so subscribing here cannot leak into another test.
    """
    captured = []
    events.subscribe(events.NOTIFICATION_CREATED, lambda **payload: captured.append(payload))
    return captured


@pytest.mark.django_db
def test_notify_announces_the_row_it_wrote(user, other_user, announcements):
    notification = notify(user, Notification.Kind.MESSAGE, 'سلام', link='/dms', actor=other_user)

    assert len(announcements) == 1
    assert announcements[0]['user_id'] == user.pk
    assert announcements[0]['payload']['id'] == notification.pk


@pytest.mark.django_db
def test_the_payload_is_what_the_rest_endpoint_would_return(user, other_user, announcements):
    """One serializer, one shape — so the client needs one renderer, not two."""
    notification = notify(user, Notification.Kind.MESSAGE, 'سلام', link='/dms', actor=other_user)

    assert announcements[0]['payload'] == NotificationSerializer(notification).data


@pytest.mark.django_db
def test_notify_many_announces_once_per_recipient(user, other_user, user_factory, announcements):
    third = user_factory(username='carol')

    notify_many([user, other_user, third], Notification.Kind.MEMBER_ADDED, 'اضافه شدید')

    assert sorted(item['user_id'] for item in announcements) == sorted(
        [user.pk, other_user.pk, third.pk]
    )
    # Every announcement carries a real primary key: without one the client
    # cannot tell a pushed notification from the same row read over REST.
    assert all(item['payload']['id'] is not None for item in announcements)


@pytest.mark.django_db
def test_the_skipped_self_notification_is_not_announced(user, announcements):
    """`notify` refuses to tell somebody about their own action, and a refusal
    that still published would put a notification on their socket that is in
    nobody's list."""
    assert notify(user, Notification.Kind.MESSAGE, 'سلام', actor=user) is None
    assert announcements == []


@pytest.mark.django_db
def test_a_failing_subscriber_does_not_fail_the_write(user, other_user, announcements):
    """RT-03's fifth criterion. A Redis outage in the gateway must cost the live
    push and nothing else — the row is committed before anyone is told."""

    def explode(**_):
        raise RuntimeError('the channel layer is down')

    events.subscribe(events.NOTIFICATION_CREATED, explode)

    notification = notify(user, Notification.Kind.MESSAGE, 'سلام', actor=other_user)

    assert notification is not None
    assert Notification.objects.filter(pk=notification.pk).exists()
