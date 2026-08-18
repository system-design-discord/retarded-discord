from django.contrib.auth import get_user_model
from django.db.models import Case, IntegerField, Value, When
from django.db.models.functions import Lower
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from common import events, messages

from .models import Profile
from .serializers import (
    EmailOrUsernameTokenObtainPairSerializer,
    ProfileSerializer,
    PublicProfileSerializer,
    PublicUserSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class UserDirectoryView(generics.ListAPIView):
    """Search the public user directory by username — A-11 (#90).

    The direct-message picker only needs an id and username, so the endpoint
    deliberately uses ``PublicUserSerializer`` and never exposes email or
    profile privacy fields. A search term is required in practice: an omitted
    or whitespace-only term returns an empty page rather than enumerating the
    account table.

    Results exclude the caller and inactive accounts. Exact username matches
    rank first, prefix matches second, and remaining substring matches last;
    ties are ordered case-insensitively by username for deterministic output.
    """

    serializer_class = PublicUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        term = self.request.query_params.get('search', '').strip()
        if not term:
            return User.objects.none()

        return (
            User.objects
            .filter(is_active=True, username__icontains=term)
            .exclude(pk=self.request.user.pk)
            .annotate(
                search_rank=Case(
                    When(username__iexact=term, then=Value(0)),
                    When(username__istartswith=term, then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                ),
                username_lower=Lower('username'),
            )
            .order_by('search_rank', 'username_lower', 'pk')
        )


class LoginView(TokenObtainPairView):
    """`POST /api/auth/login/` — an email address or a username, plus a password.

    The stock view with the serializer swapped. It stays a subclass rather than
    a `TokenObtainPairView.as_view(serializer_class=…)` in `urls.py` so the
    route reads like every other one in this module and the behaviour is
    findable from the view layer.
    """

    serializer_class = EmailOrUsernameTokenObtainPairSerializer


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
                {"error": messages.REFRESH_TOKEN_REQUIRED}, status=status.HTTP_400_BAD_REQUEST
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

    def perform_update(self, serializer):
        """US-10.1, and the half of it that was missing: telling anybody.

        A username and an avatar are rendered on every screen that has ever
        mentioned this person — message bubbles, member lists, the
        direct-message rail — and each of those screens was holding a copy taken
        when it loaded. Nothing invalidated them, so a rename was invisible
        everywhere until a reload.

        Announced on the seam, like every other cross-module fact
        (architecture.tex §5.1); `realtime` subscribes and this module does not
        know that it does. **`PublicProfileSerializer` and not
        `ProfileSerializer`**: the frame reaches every connected client, so it
        must carry what a stranger may see and not the caller's own email or
        their invitation setting.
        """
        profile = serializer.save()

        events.publish(
            events.PROFILE_UPDATED,
            user_id=profile.user_id,
            payload=PublicProfileSerializer(profile).data,
        )


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
            return Response(
                {"success": True, "allow_invites": profile.allow_invites},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"error": messages.INVALID_VALUE},
            status=status.HTTP_400_BAD_REQUEST,
        )
