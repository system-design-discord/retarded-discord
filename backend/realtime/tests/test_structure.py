"""A structural change reaches every member's socket, and nobody else's.

The counterpart of `test_notification_socket.py` for the eight events that say a
channel, a group or a topic changed. Two things are worth pinning here and
neither is obvious from reading `publisher.py`:

**The address is the member, not the conversation.** `ConversationConsumer`
joins `topic.<id>`, so a socket open on a topic hears about *messages* in it —
but the screens that have to correct themselves when a topic is deleted are the
channel list, the tab strip and the dashboard's recent conversations, and none
of those holds a conversation socket. `/ws/notifications/` is the only
connection the SPA has on every screen, so the fan-out is one `group_send` per
member to `user_group(member)` and the audience travels in the event.

**The audience is read before the write.** Deleting a channel cascades its
`ChannelMember` rows, so a subscriber that looked the membership up when it ran
would find none and tell nobody. `test_a_deleted_channel_still_reaches_its_members`
is that assertion: it deletes and then expects the frame anyway.

Everything goes through `WebsocketCommunicator` against the real ASGI
application and through the real REST endpoints, so the events under test are
published by the views that ship rather than by the test.
"""

import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import AccessToken

from channels_app.models import Channel, ChannelMember, Topic
from config.asgi import application
from groups_app.models import Group


async def connect(user):
    """A notification socket with its handshake drained.

    Connecting produces `subscribed`, a `presence.snapshot` and — for a first
    socket — the `presence.changed` it caused, in an order that is not fixed.
    `test_notification_socket.py` explains why; this drains rather than counts
    for the same reason.
    """
    communicator = WebsocketCommunicator(
        application, f'/ws/notifications/?token={AccessToken.for_user(user)}'
    )
    connected, _ = await communicator.connect()
    assert connected
    while not await communicator.receive_nothing(timeout=0.3):
        await communicator.receive_json_from()
    return communicator


async def drain(communicator):
    """Every `structure.changed` frame the socket has waiting."""
    frames = []
    while not await communicator.receive_nothing(timeout=0.4):
        frame = await communicator.receive_json_from()
        if frame.get('type') == 'structure.changed':
            frames.append(frame)
    return frames


def api(user):
    """An authenticated DRF client. Built here rather than through the shared
    `auth_client` fixture because these tests are async and the fixture is
    called from inside `sync_to_async`."""
    from rest_framework.test import APIClient

    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def channel(db, user, other_user):
    made = Channel.objects.create_with_owner(owner=user, name='general')
    ChannelMember.objects.create(channel=made, user=other_user)
    return made


@pytest.fixture
def group(db, user, other_user):
    made = Group.objects.create_with_admin(admin=user, name='team')
    made.members.add(other_user)
    return made


# --- topics -----------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_a_new_topic_reaches_another_member(channel, user, other_user):
    watcher = await connect(other_user)

    response = await sync_to_async(api(user).post)(
        f'/api/channels/{channel.pk}/topics/', {'name': 'announcements'}, format='json'
    )
    assert response.status_code == 201

    frames = await drain(watcher)
    await watcher.disconnect()

    assert len(frames) == 1
    assert frames[0]['scope'] == 'topic'
    assert frames[0]['action'] == 'created'
    assert frames[0]['channel_id'] == channel.pk
    assert frames[0]['object']['name'] == 'announcements'


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_a_renamed_topic_reaches_another_member(channel, user, other_user):
    topic = await sync_to_async(Topic.objects.create)(channel=channel, name='general')
    watcher = await connect(other_user)

    response = await sync_to_async(api(user).patch)(
        f'/api/channels/{channel.pk}/topics/{topic.pk}/', {'name': 'renamed'}, format='json'
    )
    assert response.status_code == 200

    frames = await drain(watcher)
    await watcher.disconnect()

    assert [(f['scope'], f['action']) for f in frames] == [('topic', 'updated')]
    assert frames[0]['object']['name'] == 'renamed'


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_a_deleted_topic_reaches_another_member(channel, user, other_user):
    """The frame that also stands in for every message the cascade took.

    `Topic.messages` is CASCADE, so those rows go at the database level and
    `MessageDetailView.perform_destroy` — the only thing that publishes
    MESSAGE_DELETED — never runs for one of them. A client sitting in the topic
    is corrected by this frame or by nothing.
    """
    topic = await sync_to_async(Topic.objects.create)(channel=channel, name='doomed')
    watcher = await connect(other_user)

    response = await sync_to_async(api(user).delete)(
        f'/api/channels/{channel.pk}/topics/{topic.pk}/'
    )
    assert response.status_code == 200

    frames = await drain(watcher)
    await watcher.disconnect()

    assert [(f['scope'], f['action'], f['id']) for f in frames] == [
        ('topic', 'deleted', topic.pk)
    ]
    # Nothing to render: the row is gone, and an id is all a client needs.
    assert 'object' not in frames[0]


# --- the channel itself -----------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_a_renamed_channel_reaches_another_member(channel, user, other_user):
    watcher = await connect(other_user)

    response = await sync_to_async(api(user).patch)(
        f'/api/channels/{channel.pk}/', {'name': 'renamed'}, format='json'
    )
    assert response.status_code == 200

    frames = await drain(watcher)
    await watcher.disconnect()

    assert [(f['scope'], f['action'], f['id']) for f in frames] == [
        ('channel', 'updated', channel.pk)
    ]
    assert frames[0]['object']['name'] == 'renamed'


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_a_deleted_channel_still_reaches_its_members(channel, user, other_user):
    """The whole reason the events carry an `audience`.

    By the time the subscriber runs there is no `ChannelMember` row left to read
    — the delete took them — so a gateway that looked the membership up here
    would fan the news out to nobody at all, which is precisely the case the
    news matters most.
    """
    watcher = await connect(other_user)

    response = await sync_to_async(api(user).delete)(f'/api/channels/{channel.pk}/')
    assert response.status_code == 200

    frames = await drain(watcher)
    await watcher.disconnect()

    assert [(f['scope'], f['action'], f['id']) for f in frames] == [
        ('channel', 'deleted', channel.pk)
    ]


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_a_stranger_hears_nothing(channel, user, user_factory):
    """`user_group` is the address, so exclusion is a property of *where* the
    frame was sent rather than a check on arrival — the same argument
    `NotificationConsumer` makes about notifications."""
    stranger = await sync_to_async(user_factory)()
    watcher = await connect(stranger)

    await sync_to_async(api(user).patch)(
        f'/api/channels/{channel.pk}/', {'name': 'renamed'}, format='json'
    )

    frames = await drain(watcher)
    await watcher.disconnect()

    assert frames == []


# --- groups -----------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_a_renamed_group_reaches_another_member(group, user, other_user):
    watcher = await connect(other_user)

    response = await sync_to_async(api(user).patch)(
        f'/api/groups/{group.pk}/', {'name': 'renamed'}, format='json'
    )
    assert response.status_code == 200

    frames = await drain(watcher)
    await watcher.disconnect()

    assert [(f['scope'], f['action'], f['id']) for f in frames] == [
        ('group', 'updated', group.pk)
    ]
    assert frames[0]['object']['name'] == 'renamed'


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_a_deleted_group_still_reaches_its_members(group, user, other_user):
    watcher = await connect(other_user)

    response = await sync_to_async(api(user).delete)(f'/api/groups/{group.pk}/')
    assert response.status_code == 204

    frames = await drain(watcher)
    await watcher.disconnect()

    assert [(f['scope'], f['action'], f['id']) for f in frames] == [
        ('group', 'deleted', group.pk)
    ]


# --- membership -------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_being_added_to_a_channel_reaches_the_new_member(channel, user, user_factory):
    """The audience is read *after* this write, unlike every other one.

    The new member is the client for whom the frame is the difference between
    the channel appearing in their list and not, and a moment before the write
    they were not in the membership to read.
    """
    newcomer = await sync_to_async(user_factory)()
    watcher = await connect(newcomer)

    response = await sync_to_async(api(user).post)(
        f'/api/channels/{channel.pk}/members/', {'user_id': newcomer.pk}, format='json'
    )
    assert response.status_code == 201

    frames = await drain(watcher)
    await watcher.disconnect()

    assert [(f['scope'], f['action'], f['id']) for f in frames] == [
        ('channel', 'member_added', channel.pk)
    ]
    assert frames[0]['user_id'] == newcomer.pk


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_leaving_a_channel_reaches_the_leaver(channel, other_user):
    """A-10 — leaving is removing yourself, and the audience is read before the
    write so the person leaving is still in it. Theirs is the one screen that
    cannot re-read the channel afterwards to find out what happened."""
    watcher = await connect(other_user)

    response = await sync_to_async(api(other_user).delete)(
        f'/api/channels/{channel.pk}/members/{other_user.pk}/'
    )
    assert response.status_code == 204

    frames = await drain(watcher)
    await watcher.disconnect()

    assert [(f['scope'], f['action'], f['id']) for f in frames] == [
        ('channel', 'member_removed', channel.pk)
    ]
    assert frames[0]['user_id'] == other_user.pk


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_leaving_a_group_reaches_the_leaver(group, other_user):
    watcher = await connect(other_user)

    response = await sync_to_async(api(other_user).post)(
        f'/api/groups/{group.pk}/members/',
        {'user_id': other_user.pk, 'action': 'remove'},
        format='json',
    )
    assert response.status_code == 200

    frames = await drain(watcher)
    await watcher.disconnect()

    assert [(f['scope'], f['action'], f['id']) for f in frames] == [
        ('group', 'member_removed', group.pk)
    ]
