import asyncio
import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

# Imported after get_asgi_application() so the app registry is ready.
import realtime.routing  # noqa: E402
from realtime import presence  # noqa: E402
from realtime.middleware import JWTAuthMiddleware  # noqa: E402

# Presence outlives the process that recorded it — it is kept in Redis, which
# does not restart when daphne does — so a crash would otherwise leave everybody
# who was connected at that moment listed as online for good.
#
# This belongs here and **not** in `RealtimeConfig.ready()`: `celery_worker` and
# `celery_beat` run `ready()` too, and either of them restarting would wipe the
# presence of users who are connected right now. Only daphne imports this file.
asyncio.run(presence.reset())

# JWT rather than AuthMiddlewareStack: the SPA authenticates with a bearer
# token in localStorage and has no Django session, so the session-based stack
# left scope['user'] anonymous on every connection (RT-02).
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(
            realtime.routing.websocket_urlpatterns
        )
    ),
})
