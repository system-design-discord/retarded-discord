from django.urls import path
from .views import (
    ProfileDetailView, 
    PrivacySettingsView, 
    GroupListCreateView, 
    MediaUploadView
)

urlpatterns = [
    path('profile/', ProfileDetailView.as_view(), name='profile-detail'),
    path('settings/privacy/', PrivacySettingsView.as_view(), name='privacy-settings'),
    path('groups/', GroupListCreateView.as_view(), name='group-list-create'),
    path('media/upload/', MediaUploadView.as_view(), name='media-upload'),
]