"""RT-03 — a notification reaches its recipient's socket and nobody else's.

The fan-out half of US-B1.2. `notifications/tests/test_announcement.py` covers
the other half — that every write publishes on the seam — and the two meet at
`common.events` without either module importing the other.

Everything goes through `WebsocketCommunicator` against the real ASGI
application, so `JWTAuthMiddleware` and the routing under test are the ones
that ship.
"""

import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import AccessToken

from config.asgi import application
from notifications.models import Notification
from realtime.consumers import CLOSE_UNAUTHENTICATED


def url(user=None):
    path = '/ws/notifications/'
    return f'{path}?token={AccessToken.for_user(user)}' if user else path


async def connect(user=None):
    communicator = WebsocketCommunicator(application, url(user))
    connected, _ = await communicator.connect()
    return communicator, connected


async def _notify(user, content='سلام', actor=None):
    """`notify` is sync and touches the ORM, so it runs off-loop.

    Deliberately the real `notifications.services.notify` rather than a
    hand-built event: the point of the card is that the two modules meet at the
    seam, and a test that published the event itself would not prove that.
    """
    from notifications.services import notify

    return await sync_to_async(notify)(user, Notification.Kind.MESSAGE, content, actor=actor)


async def _make(user_factory, username):
    return await sync_to_async(user_factory)(username=username)


# ------------------------------------------------------------ authentication

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_socket_with_no_token_is_refused():
    communicator, _ = await connect()

    assert (await communicator.receive_output())['code'] == CLOSE_UNAUTHENTICATED
    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_valid_token_subscribes(user):
    communicator, connected = await connect(user)

    assert connected
    assert await communicator.receive_json_from() == {'type': 'subscribed', 'notifications': True}
    await communicator.disconnect()


# ------------------------------------------------------------------- fan-out

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_notification_reaches_its_recipient(user, other_user):
    communicator, _ = await connect(user)
    await communicator.receive_json_from()

    notification = await _notify(user, 'پیام جدید', actor=other_user)

    event = await communicator.receive_json_from()
    assert event['type'] == 'notification.created'
    assert event['notification']['id'] == notification.pk
    # The push carries the REST endpoint's shape, so the client needs one
    # renderer and not two — `title` and `body` are the serializer's derived
    # fields, and their presence is what proves the payload came through it.
    assert event['notification']['body'] == 'پیام جدید'
    assert event['notification']['title']
    assert event['notification']['is_read'] is False

    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_another_users_socket_receives_nothing(user, other_user, user_factory):
    """The criterion that matters most: a notification is addressed to one
    person's group, so somebody else's socket is not in it and no check on
    arrival is what keeps them out."""
    stranger = await _make(user_factory, 'stranger')

    watcher, _ = await connect(stranger)
    await watcher.receive_json_from()

    await _notify(user, 'not yours', actor=other_user)

    assert await watcher.receive_nothing(timeout=0.5)
    await watcher.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_every_tab_the_recipient_has_open_receives_it(user, other_user):
    """`user_group` is per person, not per socket, so two tabs both update."""
    first, _ = await connect(user)
    await first.receive_json_from()
    second, _ = await connect(user)
    await second.receive_json_from()

    await _notify(user, 'دو تب', actor=other_user)

    for tab in (first, second):
        assert (await tab.receive_json_from())['notification']['body'] == 'دو تب'

    await first.disconnect()
    await second.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_recipient_with_no_socket_open_loses_nothing(user, other_user):
    """The row is the product; the push is a convenience over it."""
    notification = await _notify(user, 'آفلاین', actor=other_user)

    assert notification is not None
    assert await Notification.objects.filter(pk=notification.pk).aexists()


# ------------------------------------------------------- the socket is read-only

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_the_socket_refuses_writes(user):
    communicator, _ = await connect(user)
    await communicator.receive_json_from()

    await communicator.send_json_to({'type': 'read', 'id': 1})

    answer = await communicator.receive_json_from()
    assert answer['type'] == 'error'
    assert 'POST /api/notifications/' in answer['detail']
    await communicator.disconnect()
