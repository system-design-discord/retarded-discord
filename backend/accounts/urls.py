from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import MeView, PrivacySettingsView, ProfileDetailView, ProfileRetrieveAPIView, RegisterView

# Mounted under api/ by config/urls.py — do not repeat the prefix here.
urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', MeView.as_view(), name='auth-me'),

    path('profile/', ProfileDetailView.as_view(), name='profile-detail'),
    path('profile/<int:user_id>/', ProfileRetrieveAPIView.as_view(), name='profile-other'),
    path('settings/privacy/', PrivacySettingsView.as_view(), name='privacy-settings'),
]
