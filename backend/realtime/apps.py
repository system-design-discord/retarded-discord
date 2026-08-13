from django.apps import AppConfig


class RealtimeConfig(AppConfig):
    """Real-time gateway — architecture.tex §5 (bonus).

    Maintains WebSocket connections and pushes new messages and notifications
    to connected clients. Owns no entities of its own.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'realtime'

    def ready(self):
        """Subscribe once, at startup.

        The import is inside `ready()` because `publisher` reaches the message
        serializer, and an app config runs before the registry is populated —
        the same reason `notifications/apps.py` does it this way.
        """
        from common import events

        from . import publisher

        events.subscribe(events.MESSAGE_CREATED, publisher.on_message_created)
