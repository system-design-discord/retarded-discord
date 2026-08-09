from django.apps import AppConfig


class SchedulingConfig(AppConfig):
    """Scheduling & background — architecture.tex §5 (bonus).

    Persists scheduled messages and dispatches them at the requested time even
    if the author is offline; hosts other background jobs.

    Skeleton — filled by the SC cards.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'scheduling'
