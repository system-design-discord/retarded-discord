import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

# Imported after get_asgi_application() so the app registry is ready.
import realtime.routing  # noqa: E402
from realtime.middleware import JWTAuthMiddleware  # noqa: E402

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
