from django.apps import AppConfig


class MessagingConfig(AppConfig):
    """Messaging (core) — architecture.tex §5.

    Create / receive / edit / delete a message in any of the three contexts,
    ownership and admin delete rules, and full-text search over message text.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'messaging'
