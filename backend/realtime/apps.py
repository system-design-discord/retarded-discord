from django.apps import AppConfig


class RealtimeConfig(AppConfig):
    """Real-time gateway — architecture.tex §5 (bonus).

    Maintains WebSocket connections and pushes new messages and notifications
    to connected clients. Owns no entities of its own.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'realtime'
