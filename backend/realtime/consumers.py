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
