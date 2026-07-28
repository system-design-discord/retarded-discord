from rest_framework import generics, permissions
from .models import Profile
from .serializers import ProfileSerializer

class ProfileDetailView(generics.RetrieveUpdateAPIView):

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # when the user is loged in 
        profile, created = Profile.objects.get_or_create(user=self.request.user)
        return profile
    

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

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