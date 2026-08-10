from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """Notifications — architecture.tex §5.

    Generates, stores and delivers notifications on the three events US-11.1
    names: a new message, being added to a group or channel, and a role change.
    Subscribes to common.events rather than being called directly.

    Skeleton — filled by N-01 (model) and N-02 (API).
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'
