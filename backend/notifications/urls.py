from django.urls import path

from .views import MarkAllReadView, MarkReadView, NotificationListView, UnreadCountView

# Mounted under api/ by config/urls.py — do not repeat the prefix here.
# `unread-count/` and `mark-all-read/` precede `<int:pk>/read/`; they cannot
# collide, but keeping the literal paths first is the habit that stops the next
# one from colliding.
urlpatterns = [
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/unread-count/', UnreadCountView.as_view(), name='notification-unread-count'),
    path('notifications/mark-all-read/', MarkAllReadView.as_view(), name='notification-mark-all-read'),
    path('notifications/<int:pk>/read/', MarkReadView.as_view(), name='notification-mark-read'),
]
