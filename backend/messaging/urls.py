from django.urls import path

from .views import MessageDetailView, MessageListCreateView

# Mounted under api/ by config/urls.py — do not repeat the prefix here.
urlpatterns = [
    path('messages/', MessageListCreateView.as_view(), name='message-list-create'),
    path('messages/<int:pk>/', MessageDetailView.as_view(), name='message-detail'),
]
