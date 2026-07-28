from django.urls import path
from .views import ProfileDetailView, PrivacySettingsView, GroupListCreateView

urlpatterns = [
    # address of the profile
    path('profile/', ProfileDetailView.as_view(), name='profile-detail'),
    path('settings/privacy/', PrivacySettingsView.as_view(), name='privacy-settings')
    path('groups/', GroupListCreateView.as_view(), name='group-list-create'),
]