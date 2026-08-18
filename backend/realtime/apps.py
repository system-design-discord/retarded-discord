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
        events.subscribe(events.MESSAGE_UPDATED, publisher.on_message_updated)
        events.subscribe(events.MESSAGE_DELETED, publisher.on_message_deleted)
        events.subscribe(events.NOTIFICATION_CREATED, publisher.on_notification_created)
        events.subscribe(events.PROFILE_UPDATED, publisher.on_profile_updated)

        # The structural family. Eight events, one wire frame — see the module
        # docstring in `publisher.py` for why the shapes differ from the three
        # message events above.
        events.subscribe(events.CHANNEL_UPDATED, publisher.on_channel_updated)
        events.subscribe(events.CHANNEL_DELETED, publisher.on_channel_deleted)
        events.subscribe(events.TOPIC_CREATED, publisher.on_topic_created)
        events.subscribe(events.TOPIC_UPDATED, publisher.on_topic_updated)
        events.subscribe(events.TOPIC_DELETED, publisher.on_topic_deleted)
        events.subscribe(events.GROUP_UPDATED, publisher.on_group_updated)
        events.subscribe(events.GROUP_DELETED, publisher.on_group_deleted)
        events.subscribe(events.MEMBER_ADDED, publisher.on_member_added)
        events.subscribe(events.MEMBER_REMOVED, publisher.on_member_removed)
