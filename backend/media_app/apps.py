from django.apps import AppConfig


class MediaAppConfig(AppConfig):
    """Media — architecture.tex §5.

    Upload, store and serve image/video/audio/file attachments, and enforce
    per-channel media restrictions (US-7.3, once roles exists).

    Named media_app, not media, to keep it clear of MEDIA_ROOT and the
    settings names around it.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'media_app'
