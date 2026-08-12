"""View glue shared by every channel-scoped endpoint.

Four modules put a channel id in the URL — `roles` did it first, `channels_app`
does it for topics and members — and all of them need the same two things: the
`Channel` the URL names, and a way to hand it to `common.permissions`. One
definition, here, so a second module cannot resolve it slightly differently.
"""

from django.shortcuts import get_object_or_404


class ChannelScopedMixin:
    """Resolves the channel in the URL and hands it to the permission class.

    The channel id is read from `channel_id` when the view is nested under a
    channel (`channels/<channel_id>/roles/`) and from `pk` when the channel
    *is* the resource (`channels/<pk>/`). Resolving once per request and
    caching it keeps the permission check and the queryset looking at the same
    row.
    """

    channel_url_kwargs = ('channel_id', 'pk')

    def get_channel(self):
        if not hasattr(self, '_channel'):
            from channels_app.models import Channel

            for kwarg in self.channel_url_kwargs:
                if kwarg in self.kwargs:
                    self._channel = get_object_or_404(Channel, pk=self.kwargs[kwarg])
                    break
            else:
                raise AssertionError(
                    f"{self.__class__.__name__} uses ChannelScopedMixin but no URL kwarg "
                    f"among {self.channel_url_kwargs} names a channel"
                )
        return self._channel

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'channel': self.get_channel()}
