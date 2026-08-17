from django.contrib import admin
from django.urls import include, path, re_path

from media_app.views import protected_media

# One include per domain module. Each module declares its own paths without
# repeating the api/ prefix.
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('messaging.urls')),
    path('api/', include('groups_app.urls')),
    path('api/', include('channels_app.urls')),
    path('api/', include('roles.urls')),
    path('api/', include('media_app.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('scheduling.urls')),
    # A-1 — uploads are served by the project, not by nginx aliasing the volume,
    # and only to a caller holding the signed link the API rendered. This is
    # mounted here rather than in `media_app/urls.py` because every other module
    # is included under `api/` and `MEDIA_URL` is not; the URL the serializers
    # mint has to keep its shape.
    #
    # It replaces the `static(MEDIA_URL, ...)` helper that used to sit at the
    # bottom of this file behind `if DEBUG` — that helper is the same open
    # alias, just in Python.
    re_path(r'^media/(?P<path>.+)$', protected_media, name='protected-media'),
]
