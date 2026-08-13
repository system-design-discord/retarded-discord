from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile
from .serializers import (
    ProfileSerializer,
    PublicProfileSerializer,
    PublicUserSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class UserDirectoryView(generics.ListAPIView):
    """PLACEHOLDER — card A-11 owns the real one, issue #90.

    `F-03` needs some way to name another user, and the API offers none: the
    only lookup is `profile/<int:user_id>/`, which wants the id you are trying
    to find. Without this a freshly registered account cannot start a
    conversation with anybody, so US-2.1 is not demonstrable from a clean clone.

    This is the smallest thing that unblocks that view, not a finished endpoint.
    It reads through `PublicUserSerializer`, so nothing private can leak out of
    it, and a blank term answers nothing rather than dumping the user table —
    the same choice `M-08`'s search makes.

    TODO(A-11): honour a discoverability preference rather than listing every
    account, decide what a blank term should mean, order by something a human
    would expect rather than alphabetically, and cover all of it with tests.
    There are none, deliberately: a stub with a passing test suite reads as
    finished work.
    """

    serializer_class = PublicUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        term = self.request.query_params.get('search', '').strip()
        if not term:
            return User.objects.none()

        return (
            User.objects
            .exclude(pk=self.request.user.pk)
            .filter(username__icontains=term)
            .order_by('username')
        )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer


class LogoutView(APIView):
    """US-1.3 — log out for real.

    Dropping the token from `localStorage` is not logging out: the refresh token
    stays valid for its full seven days, so anybody who copied it still has an
    account. Blacklisting it server-side is what makes the logout mean something,
    and `SIMPLE_JWT` is already configured for it — `ROTATE_REFRESH_TOKENS` with
    `BLACKLIST_AFTER_ROTATION`, and `token_blacklist` installed.

    The access token is not revoked, and cannot be: it is stateless and short
    enough that checking a blacklist on every request would cost a query per
    call to save at most one day of exposure. The client clears it.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('refresh')
        if not token:
            return Response(
                {"error": "توکن تازه‌سازی الزامی است."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            RefreshToken(token).blacklist()
        except TokenError:
            # Already blacklisted, expired, or not a token at all. Logging out
            # twice is not an error the caller can act on, and the state they
            # asked for — this token no longer works — holds either way, so it
            # answers the same as the first call.
            pass

        return Response(status=status.HTTP_205_RESET_CONTENT)


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
