"""JWT authentication for the WebSocket handshake — RT-02.

The consumer this replaces took `user_id` and `username` from the **client's
JSON payload**, so the sender was whoever the client said it was. That is the
acceptance criterion of this card, not a nicety: anyone could post as anyone.

`AuthMiddlewareStack`, which `config/asgi.py` used before, authenticates from a
Django *session*. The SPA does not have one — it holds a JWT in `localStorage`
and sends it as a Bearer header — so `scope['user']` was `AnonymousUser` on
every connection and there was nothing else for the consumer to trust.

**Why the token is in the query string.** A browser's WebSocket constructor
takes a URL and a subprotocol list and nothing else; it cannot set an
`Authorization` header. The three usual answers are a query parameter, an
abuse of the subprotocol field, or a cookie. This uses the query parameter and
accepts what that costs: the token appears in server access logs. It is
mitigated rather than ignored — the access token's lifetime is what bounds the
exposure, and `?token=` never leaves the single origin nginx serves. A
cookie-based handshake is the better answer and is out of scope for a bonus
card being landed after the freeze.

Rejecting is not this middleware's job. An unauthenticated scope reaches the
consumer as `AnonymousUser` and the consumer closes it, so there is one place
that decides who is refused and why.
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@database_sync_to_async
def _user_from(raw_token):
    """The user a valid access token names, or `AnonymousUser`.

    `AccessToken(...)` verifies the signature, the expiry and the token type,
    so an expired or forged token lands in the same place as no token at all.
    """
    try:
        token = AccessToken(raw_token)
    except TokenError:
        return AnonymousUser()

    user_id = token.get(api_settings.USER_ID_CLAIM)
    if user_id is None:
        return AnonymousUser()

    return User.objects.filter(**{api_settings.USER_ID_FIELD: user_id}).first() or AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Puts the token's user on `scope['user']`, or `AnonymousUser`."""

    async def __call__(self, scope, receive, send):
        query = parse_qs((scope.get('query_string') or b'').decode())
        raw_token = (query.get('token') or [None])[0]

        scope['user'] = await _user_from(raw_token) if raw_token else AnonymousUser()

        return await super().__call__(scope, receive, send)
