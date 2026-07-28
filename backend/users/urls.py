from django.urls import path
from .views import (
    ProfileDetailView, 
    PrivacySettingsView, 
    GroupListCreateView, 
    GroupDetailView,
    GroupAddRemoveMemberView,
    MediaUploadView,
    MediaDetailView,
    MessageListCreateView,
    MessageDetailView
)

urlpatterns = [
    # Profile , Settings
    path('profile/', ProfileDetailView.as_view(), name='profile-detail'),
    path('settings/privacy/', PrivacySettingsView.as_view(), name='privacy-settings'),
    
    # Groups
    path('groups/', GroupListCreateView.as_view(), name='group-list-create'),
    path('groups/<int:pk>/', GroupDetailView.as_view(), name='group-detail'),
    path('groups/<int:pk>/members/', GroupAddRemoveMemberView.as_view(), name='group-manage-members'),
    
    # Media
    path('media/upload/', MediaUploadView.as_view(), name='media-upload'),
    path('media/<int:pk>/', MediaDetailView.as_view(), name='media-detail'),

    path('messages/', MessageListCreateView.as_view(), name='message-list-create'),
    path('messages/<int:pk>/', MessageDetailView.as_view(), name='message-detail'),
]