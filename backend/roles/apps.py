from django.apps import AppConfig


class RolesConfig(AppConfig):
    """Roles & Access Control — architecture.tex §5.

    The cross-cutting authorization authority. See roles/README.md: no other
    module decides permissions for itself.

    Skeleton — filled by R-01 (Role model) and R-04 (permission service).
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'roles'
