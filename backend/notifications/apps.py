from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """Notifications — architecture.tex §5.

    Generates, stores and delivers notifications on the three events US-11.1
    names: a new message, being added to a group or channel, and a role change.
    Subscribes to common.events rather than being called directly.
    """

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'

    def ready(self):
        """Subscribe once, at startup.

        The import is inside `ready()` because `handlers` imports the model, and
        an app config is executed before the registry is populated.
        """
        from common import events

        from . import handlers

        events.subscribe(events.MESSAGE_CREATED, handlers.on_message_created)
        events.subscribe(events.MEMBER_ADDED, handlers.on_member_added)
        events.subscribe(events.ROLE_CHANGED, handlers.on_role_changed)
