from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

# One include per domain module. Each module declares its own paths without
# repeating the api/ prefix.
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('groups_app.urls')),
    path('api/', include('media_app.urls')),
    path('api/', include('messaging.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
