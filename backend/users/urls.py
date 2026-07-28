from django.urls import path
from .views import ProfileDetailView

urlpatterns = [
    # address of the profile
    path('profile/', ProfileDetailView.as_view(), name='profile-detail'),
    path('settings/privacy/', PrivacySettingsView.as_view(), name='privacy-settings')
]