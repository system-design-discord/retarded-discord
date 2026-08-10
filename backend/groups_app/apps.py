from django.apps import AppConfig


class GroupsAppConfig(AppConfig):
    """Groups — architecture.tex §5.

    Create / edit / delete a group, add and remove members directly (SH.1),
    and group-admin moderation.

    Named groups_app, not groups, to avoid confusion with
    django.contrib.auth.Group.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'groups_app'
