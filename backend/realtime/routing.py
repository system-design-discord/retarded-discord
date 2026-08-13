from django.urls import re_path

from . import consumers

# `ws/chat/<group_id>/` is deliberately gone rather than kept alongside these.
# It was the impersonation hole this card exists to close — it took the sender's
# identity from the client's payload and wrote straight to the database — so
# leaving it mounted "for compatibility" would have left the vulnerability
# reachable at its old address. Nothing in the SPA called it (F-07, the client
# that would have, was cut at the Aug 11 gate), so nothing breaks.
#
# The three kinds mirror messaging's three targets exactly. Authentication is
# `?token=<access>`; see realtime/middleware.py for why it is not a header.
websocket_urlpatterns = [
    re_path(
        r'^ws/(?P<kind>dm|group|topic)/(?P<target_id>\d+)/$',
        consumers.ConversationConsumer.as_asgi(),
    ),
    # Last, and matching everything left: an unrouted WebSocket path makes
    # URLRouter raise, which Channels reports as a 500. A removed route should
    # refuse, not error.
    re_path(r'^ws/', consumers.UnknownRouteConsumer.as_asgi()),
]
