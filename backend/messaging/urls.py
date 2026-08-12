from django.urls import path

from .views import MessageDetailView, MessageListCreateView, MessageSearchView

# Mounted under api/ by config/urls.py — do not repeat the prefix here.
# `messages/search/` is declared before `messages/<int:pk>/`; the converter
# would not match "search" anyway, but the order is the habit that keeps the
# next literal path from being shadowed.
urlpatterns = [
    path('messages/', MessageListCreateView.as_view(), name='message-list-create'),
    path('messages/search/', MessageSearchView.as_view(), name='message-search'),
    path('messages/<int:pk>/', MessageDetailView.as_view(), name='message-detail'),
]
