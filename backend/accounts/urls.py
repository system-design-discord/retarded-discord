from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    LogoutView,
    MeView,
    PrivacySettingsView,
    ProfileDetailView,
    ProfileRetrieveAPIView,
    RegisterView,
    UserDirectoryView,
)

# Mounted under api/ by config/urls.py — do not repeat the prefix here.
urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    # #128 — an email or a username. `LoginView` resolves the identifier; the
    # password check is still simplejwt's.
    path('auth/login/', LoginView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),

    # A-11 (#90): authenticated public user directory for starting DMs.
    path('users/', UserDirectoryView.as_view(), name='user-directory'),

    path('profile/', ProfileDetailView.as_view(), name='profile-detail'),
    path('profile/<int:user_id>/', ProfileRetrieveAPIView.as_view(), name='profile-other'),
    path('settings/privacy/', PrivacySettingsView.as_view(), name='privacy-settings'),
]
