from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile
from .serializers import (
    ProfileSerializer,
    PublicProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer


class MeView(generics.RetrieveAPIView):
    """The signed-in user, so the SPA can resolve its own id after login."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile


class ProfileRetrieveAPIView(generics.RetrieveAPIView):
    """Another user's profile, by user id — US-10.2.

    Reads through `PublicProfileSerializer`, not `ProfileSerializer`: the second
    one carries `email` and `allow_invites`, which are the caller's own business
    and nobody else's. An unknown user id is a 404 from the lookup.
    """
    serializer_class = PublicProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """404 means *the user* does not exist, not that they never opened
        Settings.

        `Profile` is created lazily — `ProfileDetailView` and the privacy view
        both `get_or_create` it — so looking the profile up directly would 404
        on a real user who has simply never edited theirs, which is every user
        the register endpoint has ever made.
        """
        user = get_object_or_404(User, pk=self.kwargs['user_id'])
        profile, _ = Profile.objects.get_or_create(user=user)
        return profile


class PrivacySettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response({"allow_invites": profile.allow_invites}, status=status.HTTP_200_OK)

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        allow_invites = request.data.get("allow_invites")

        if allow_invites is not None:
            profile.allow_invites = allow_invites
            profile.save()
            return Response({"success": True, "allow_invites": profile.allow_invites}, status=status.HTTP_200_OK)

        return Response({"error": "مقدار نامعتبر است"}, status=status.HTTP_400_BAD_REQUEST)
