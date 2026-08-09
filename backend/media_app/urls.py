from django.urls import path

from .views import MediaDetailView, MediaUploadView

# Mounted under api/ by config/urls.py — do not repeat the prefix here.
urlpatterns = [
    path('media/upload/', MediaUploadView.as_view(), name='media-upload'),
    path('media/<int:pk>/', MediaDetailView.as_view(), name='media-detail'),
]
