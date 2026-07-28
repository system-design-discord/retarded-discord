from rest_framework import generics, permissions
from .models import Profile, Group
from .serializers import ProfileSerializer, GroupSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class ProfileDetailView(generics.RetrieveUpdateAPIView):

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # when the user is loged in 
        profile, created = Profile.objects.get_or_create(user=self.request.user)
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
    

class GroupListCreateView(generics.ListCreateAPIView):

    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(members=self.request.user)

    def perform_create(self, serializer):
        group = serializer.save(admin=self.request.user)
        group.members.add(self.request.user)