"""The WebSocket gateway — RT-02, US-B1.1.

Three things about this consumer are decisions rather than details.

**The socket is delivery only.** It accepts no writes. The consumer it replaces
created `Message` rows straight from the client's payload, which bypassed
`MessageSerializer.validate`, the `message_has_exactly_one_target` check
constraint and the membership rule in `MessageListCreateView.perform_create` —
three guarantees the REST path spends real code establishing. Persistence stays
`POST /api/messages/`; this pushes what that produced. One write path, one place
that validates.

**Identity is `scope['user']`.** The old consumer read `user_id` and `username`
out of the client's JSON, so the sender was client-asserted and anybody could
speak as anybody. `realtime/middleware.py` puts a real user there or nobody.

**Membership is `roles.services`' answer.** This module does not compare an
owner id to a request user — `architecture.tex` §5.1, the same rule the REST
views follow. If you are about to write `if x.owner_id == user.id` here, call
into `roles` instead.

Close codes, so a client can tell the two apart rather than guessing from a
silent disconnect:

| Code | Means |
|---|---|
| `4401` | no token, or an expired/forged one |
| `4403` | authenticated, but not in this conversation |
| `4404` | the conversation does not exist |
"""

import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model

from channels_app.models import Topic
from groups_app.models import Group
from roles import services as roles

from . import groups as group_names
from . import presence

User = get_user_model()

CLOSE_UNAUTHENTICATED = 4401
CLOSE_FORBIDDEN = 4403
CLOSE_NOT_FOUND = 4404


@database_sync_to_async
def _resolve(kind, target_id, user):
    """The channel-layer group this socket may join, or a refusal code.

    Returns `(group_name, None)` or `(None, close_code)`. Every "may they"
    question is delegated; none is answered here.
    """
    if kind == 'dm':
        # A direct message needs no membership — anyone may open a conversation
        # with anyone, which is what makes US-2.1 work for a new account. The
        # only thing to establish is that the other person exists, so a typo in
        # the URL is 4404 rather than a socket subscribed to nothing.
        if not User.objects.filter(pk=target_id).exists():
            return None, CLOSE_NOT_FOUND
        return group_names.dm_group(user.pk, target_id), None

    if kind == 'group':
        group = Group.objects.filter(pk=target_id).first()
        if group is None:
            return None, CLOSE_NOT_FOUND
        if not roles.is_group_member(user, group):
            return None, CLOSE_FORBIDDEN
        return group_names.group_group(group.pk), None

    if kind == 'topic':
        topic = Topic.objects.select_related('channel').filter(pk=target_id).first()
        if topic is None:
            return None, CLOSE_NOT_FOUND
        if not roles.is_channel_member(user, topic.channel):
            return None, CLOSE_FORBIDDEN
        return group_names.topic_group(topic.pk), None

    return None, CLOSE_NOT_FOUND


class ConversationConsumer(AsyncWebsocketConsumer):
    """One socket, one conversation, whichever of the three kinds it is."""

    async def connect(self):
        self.kind = self.scope['url_route']['kwargs']['kind']
        self.target_id = int(self.scope['url_route']['kwargs']['target_id'])
        self.group_name = None

        user = self.scope.get('user')
        if user is None or not user.is_authenticated:
            # Accept first so the close code reaches the client: a handshake
            # rejected outright surfaces in the browser as a generic 1006 and
            # tells the caller nothing about why.
            await self.accept()
            await self.close(code=CLOSE_UNAUTHENTICATED)
            return

        group_name, refusal = await _resolve(self.kind, self.target_id, user)
        if refusal is not None:
            await self.accept()
            await self.close(code=refusal)
            return

        self.group_name = group_name
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'subscribed',
            'conversation': {'kind': self.kind, 'id': self.target_id},
        }))

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        """Nothing sent up this socket is persisted, deliberately.

        A client that tries is told where the write actually lives rather than
        being ignored, because silence here is what the old consumer's
        impersonation bug felt like from the outside.
        """
        await self.send(text_data=json.dumps({
            'type': 'error',
            'detail': 'This socket is delivery only. Send messages with POST /api/messages/.',
        }))

    async def message_created(self, event):
        """Handler for `common.events.MESSAGE_CREATED`, fanned out by
        `realtime/publisher.py`. The name matches the `type` it sends."""
        await self.send(text_data=json.dumps({
            'type': 'message.created',
            'message': event['message'],
        }))

    async def message_updated(self, event):
        """An edit — US-3.1. Same payload as `message_created`, different name.

        A method per `type` is not optional: Channels resolves a channel-layer
        `type` to a method of this name, and a frame arriving with no matching
        method raises and takes the socket down with it.
        """
        await self.send(text_data=json.dumps({
            'type': 'message.updated',
            'message': event['message'],
        }))

    async def message_deleted(self, event):
        """A deletion — US-3.3 to US-3.6. An id, because the row is gone."""
        await self.send(text_data=json.dumps({
            'type': 'message.deleted',
            'id': event['id'],
        }))


class NotificationConsumer(AsyncWebsocketConsumer):
    """One socket, one person's notifications — RT-03, US-B1.2.

    The simplest consumer here, and the simplicity is load-bearing. A
    conversation socket has to ask whether you may read *that* conversation,
    which is why `_resolve` exists above. A notification socket has no such
    question: a notification belongs to exactly one user, `user_group` names
    only their sockets, and `notifications.services` addresses the group by the
    recipient's own id. So "may I see this" is answered by *where the message
    was sent*, not by a check on arrival — there is nothing to get wrong here
    and nothing to delegate to `roles`.

    It is delivery-only on the same terms as `ConversationConsumer`: marking a
    notification read is `POST /api/notifications/<id>/read/` and stays there.
    """

    async def connect(self):
        self.group_name = None
        self.user_id = None

        user = self.scope.get('user')
        if user is None or not user.is_authenticated:
            # Accept first, as above, so 4401 reaches the client instead of the
            # browser's generic 1006.
            await self.accept()
            await self.close(code=CLOSE_UNAUTHENTICATED)
            return

        self.user_id = user.id
        self.group_name = group_names.user_group(user.id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.channel_layer.group_add(group_names.broadcast_group(), self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({'type': 'subscribed', 'notifications': True}))

        # Presence. This socket is the one the SPA holds open on every screen,
        # so "connected here" and "signed in and using the product" are the same
        # fact — which is why presence lives on this consumer and not on the
        # conversation one, whose sockets come and go with the route.
        if await presence.mark_online(user.id, self.channel_name):
            await self._announce_presence(online=True)

        # The state that was already true before this client arrived. Everything
        # after it is a `presence.changed` frame, so the client never polls and
        # never has to guess about the people it has not yet seen change.
        await self.send(text_data=json.dumps({
            'type': 'presence.snapshot',
            'online': await presence.online_user_ids(),
        }))

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.channel_layer.group_discard(
                group_names.broadcast_group(), self.channel_name
            )

        # Going offline needs no cooperation from the logout endpoint and none
        # was added: logging out clears `AuthContext.user`, which re-runs the
        # effect that opened this socket and closes it on the way. Closing a tab
        # or navigating takes the same path through the client's `pagehide`
        # handler — and it has to, because React does not run effect cleanups
        # when the document is destroyed. Without that handler every page load
        # left a socket open here and the user was online for ever.
        #
        # `mark_offline` is reference-counted, so closing one of several tabs
        # announces nothing.
        if self.user_id is not None:
            if await presence.mark_offline(self.user_id, self.channel_name):
                await self._announce_presence(online=False)

    async def _announce_presence(self, online):
        """Tell every connected client that this user crossed the boundary."""
        await self.channel_layer.group_send(
            group_names.broadcast_group(),
            {'type': 'presence.changed', 'user_id': self.user_id, 'online': online},
        )

    async def receive(self, text_data=None, bytes_data=None):
        await self.send(text_data=json.dumps({
            'type': 'error',
            'detail': 'This socket is delivery only. '
                      'Mark notifications read with POST /api/notifications/<id>/read/.',
        }))

    async def notification_created(self, event):
        """Handler for `common.events.NOTIFICATION_CREATED`, fanned out by
        `realtime/publisher.py`. The name matches the `type` it sends."""
        await self.send(text_data=json.dumps({
            'type': 'notification.created',
            'notification': event['notification'],
        }))

    async def presence_changed(self, event):
        """Somebody came online or went offline. Sent to `broadcast_group()`.

        Unlike a notification, this is addressed to everybody, and that is not a
        leak: it says that a user id is connected, and `GET /api/users/` already
        hands ids and usernames to any signed-in caller.

        **Your own transition is dropped here**, because `group_send` has no way
        to exclude the socket that caused it and a client being told it is
        online is not information — the `presence.snapshot` it received on
        connect already said so. Sending it anyway also raced that snapshot: one
        is a direct send and the other travels through the channel layer, so
        their order was not fixed and a client could see itself flicker.

        Note this drops nothing a *second* tab needed. Coming online and going
        offline are both reference-counted transitions, so the only socket of
        yours that could hear "you came online" is the first one, and the only
        one that could hear "you went offline" has already closed.
        """
        if event['user_id'] == self.user_id:
            return

        await self.send(text_data=json.dumps({
            'type': 'presence.changed',
            'user_id': event['user_id'],
            'online': event['online'],
        }))

    async def profile_updated(self, event):
        """A profile changed — `common.events.PROFILE_UPDATED`.

        Public fields only, and `accounts` is what decided which those are; this
        forwards a payload whose shape it never learns, exactly as
        `notification_created` above does.
        """
        await self.send(text_data=json.dumps({
            'type': 'profile.updated',
            'user_id': event['user_id'],
            'profile': event['profile'],
        }))

    async def structure_changed(self, event):
        """A channel, a group or a topic changed — the structural family.

        **One method for eight events, and that is the point.** Channels turns a
        channel-layer `type` into a call to the method of that name, and a frame
        arriving with no matching method raises and takes the socket down with
        it. Eight types would be eight chances to forget one and eight ways to
        disconnect every client in the product; the client branches on `scope`
        and `action` inside the frame instead.

        Forwarded field by field rather than by splatting `event`, so the
        channel-layer's own `type` key cannot leak onto the wire and a
        publisher cannot widen the frame without this file agreeing.

        This says *that* something changed and not what it now is for anything
        the client has to re-read anyway. `object` carries the row where the
        publisher had one to render, and is absent for a delete because there is
        nothing left to send.
        """
        frame = {
            'type': 'structure.changed',
            'scope': event['scope'],
            'action': event['action'],
            'id': event['id'],
        }
        for optional in ('channel_id', 'user_id', 'object'):
            if optional in event:
                frame[optional] = event[optional]

        await self.send(text_data=json.dumps(frame))


class UnknownRouteConsumer(AsyncWebsocketConsumer):
    """Anything that is not one of the three conversation routes.

    Without this, `URLRouter` raises on an unmatched path and Channels turns
    that into a **500** — so `ws/chat/<group_id>/`, the impersonation route this
    card removed, answered with a server error and a traceback in the log rather
    than a refusal. The route is gone on purpose; saying so plainly is better
    evidence than a stack trace.
    """

    async def connect(self):
        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'error',
            'detail': 'Unknown route. Use /ws/dm/<user_id>/, /ws/group/<group_id>/, '
                      '/ws/topic/<topic_id>/ or /ws/notifications/ with ?token=<access>.',
        }))
        await self.close(code=CLOSE_NOT_FOUND)
