from django.urls import path

from .views import (
    ScheduledMessageCancelView,
    ScheduledMessageCreateView,
    ScheduledMessageListView,
)

# Mounted under api/ by config/urls.py — do not repeat the prefix here.
urlpatterns = [
    path(
        'messages/schedule/',
        ScheduledMessageCreateView.as_view(),
        name='scheduled-message-create',
    ),
    path(
        'messages/scheduled/',
        ScheduledMessageListView.as_view(),
        name='scheduled-message-list',
    ),
    path(
        'messages/scheduled/<int:pk>/cancel/',
        ScheduledMessageCancelView.as_view(),
        name='scheduled-message-cancel',
    ),
]
