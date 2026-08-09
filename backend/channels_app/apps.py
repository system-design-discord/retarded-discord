from django.apps import AppConfig


class ChannelsAppConfig(AppConfig):
    """Channels & Topics — architecture.tex §5.

    Create / edit / delete a channel, create topics, channel membership and
    direct add (SH.1). Owns Channel, Topic and ChannelMember.

    Named channels_app, not channels, because `channels` is the Django
    Channels package this project already depends on.

    Skeleton — filled by C-01 (models) and C-02/C-03/C-04 (API).
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'channels_app'
