"""RT-02 — the gateway refuses the right people and delivers to the rest.

The card's acceptance criterion is a security fix, so most of this file is about
what does *not* happen: an unauthenticated socket does not connect, a
non-member's does not subscribe, and nothing a client sends up the socket is
ever written down.

Everything goes through `WebsocketCommunicator`, which runs the real ASGI
application including `JWTAuthMiddleware`, so the token handling under test is
the token handling that ships.
"""

import pytest
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import AccessToken

from channels_app.models import Channel, ChannelMember, Topic
from config.asgi import application
from groups_app.models import Group, GroupMember
from messaging.models import Message
from realtime.consumers import CLOSE_FORBIDDEN, CLOSE_NOT_FOUND, CLOSE_UNAUTHENTICATED


def url(kind, target_id, user=None):
    path = f'/ws/{kind}/{target_id}/'
    return f'{path}?token={AccessToken.for_user(user)}' if user else path


async def connect(kind, target_id, user=None):
    communicator = WebsocketCommunicator(application, url(kind, target_id, user))
    connected, _ = await communicator.connect()
    return communicator, connected


# ------------------------------------------------------------ authentication

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_socket_with_no_token_is_refused(other_user):
    communicator, _ = await connect('dm', other_user.pk)

    assert (await communicator.receive_output())['code'] == CLOSE_UNAUTHENTICATED
    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_forged_token_is_refused(other_user):
    communicator = WebsocketCommunicator(
        application, f'/ws/dm/{other_user.pk}/?token=not-a-real-token'
    )
    await communicator.connect()

    assert (await communicator.receive_output())['code'] == CLOSE_UNAUTHENTICATED
    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_valid_token_subscribes(user, other_user):
    communicator, connected = await connect('dm', other_user.pk, user)

    assert connected
    assert (await communicator.receive_json_from())['type'] == 'subscribed'
    await communicator.disconnect()


# ---------------------------------------------------------------- membership

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_non_member_cannot_watch_a_group(user, other_user):
    group = await Group.objects.acreate(name='private')
    await GroupMember.objects.acreate(group=group, user=other_user, is_admin=True)

    communicator, _ = await connect('group', group.pk, user)

    assert (await communicator.receive_output())['code'] == CLOSE_FORBIDDEN
    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_member_can_watch_a_group(user, other_user):
    group = await Group.objects.acreate(name='ours')
    await GroupMember.objects.acreate(group=group, user=other_user, is_admin=True)
    await GroupMember.objects.acreate(group=group, user=user)

    communicator, connected = await connect('group', group.pk, user)

    assert connected
    assert (await communicator.receive_json_from())['type'] == 'subscribed'
    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_non_member_cannot_watch_a_topic(user, other_user):
    channel = await Channel.objects.acreate(owner=other_user, name='general')
    topic = await Topic.objects.acreate(channel=channel, name='random')

    communicator, _ = await connect('topic', topic.pk, user)

    assert (await communicator.receive_output())['code'] == CLOSE_FORBIDDEN
    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_channel_member_can_watch_a_topic(user, other_user):
    channel = await Channel.objects.acreate(owner=other_user, name='general')
    topic = await Topic.objects.acreate(channel=channel, name='random')
    await ChannelMember.objects.acreate(channel=channel, user=user)

    communicator, connected = await connect('topic', topic.pk, user)

    assert connected
    assert (await communicator.receive_json_from())['type'] == 'subscribed'
    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_an_unknown_conversation_is_not_found(user):
    communicator, _ = await connect('group', 999999, user)

    assert (await communicator.receive_output())['code'] == CLOSE_NOT_FOUND
    await communicator.disconnect()


# ------------------------------------------------------------------- fan-out

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_both_ends_of_a_direct_message_receive_it(user, other_user):
    """The two participants open the socket from opposite ends — `alice` watches
    `bob` and `bob` watches `alice` — so this is also the test that the group
    name is symmetric."""
    from realtime.publisher import on_message_created

    alice, _ = await connect('dm', other_user.pk, user)
    await alice.receive_json_from()
    bob, _ = await connect('dm', user.pk, other_user)
    await bob.receive_json_from()

    message = await Message.objects.acreate(sender=user, recipient=other_user, text='hello')
    await _publish(on_message_created, message)

    for who in (alice, bob):
        event = await who.receive_json_from()
        assert event['type'] == 'message.created'
        assert event['message']['text'] == 'hello'
        # The socket payload is MessageSerializer's, so a client needs one
        # renderer rather than two.
        assert event['message']['sender']['username'] == user.username

    await alice.disconnect()
    await bob.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_a_message_in_another_conversation_does_not_arrive(user, other_user, user_factory):
    from realtime.publisher import on_message_created

    stranger = await _make(user_factory, 'stranger')
    watcher, _ = await connect('dm', other_user.pk, user)
    await watcher.receive_json_from()

    elsewhere = await Message.objects.acreate(sender=other_user, recipient=stranger, text='not yours')
    await _publish(on_message_created, elsewhere)

    assert await watcher.receive_nothing(timeout=0.5)
    await watcher.disconnect()


# ------------------------------------------------------- the socket is read-only

@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_the_socket_writes_nothing_whatever_the_client_claims(user, other_user):
    """The bug this card exists to close: the old consumer took `user_id` from
    the payload and created a Message from it."""
    communicator, _ = await connect('dm', other_user.pk, user)
    await communicator.receive_json_from()

    await communicator.send_json_to({
        'message': 'impersonated',
        'user_id': other_user.pk,
        'username': other_user.username,
    })

    answer = await communicator.receive_json_from()
    assert answer['type'] == 'error'
    assert 'POST /api/messages/' in answer['detail']
    assert not await Message.objects.filter(text='impersonated').aexists()

    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_the_removed_impersonation_route_refuses_rather_than_erroring():
    """`ws/chat/<group_id>/` was the route that took its sender from the client
    payload. It is gone; hitting it must be a clean refusal, not a 500."""
    communicator = WebsocketCommunicator(application, '/ws/chat/1/')
    await communicator.connect()

    assert (await communicator.receive_json_from())['type'] == 'error'
    assert (await communicator.receive_output())['code'] == CLOSE_NOT_FOUND
    await communicator.disconnect()


# ------------------------------------------------------------------ helpers

async def _publish(handler, message):
    """`on_message_created` is sync and touches the ORM, so it runs off-loop."""
    from asgiref.sync import sync_to_async

    await sync_to_async(handler, thread_sensitive=False)(message=message)


async def _make(user_factory, username):
    from asgiref.sync import sync_to_async

    return await sync_to_async(user_factory, thread_sensitive=False)(username)
