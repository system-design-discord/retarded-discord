from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Message, Profile, Group, MediaFile
from .serializers import MessageSerializer, ProfileSerializer, GroupSerializer, MediaFileSerializer,RegisterSerializer
from rest_framework.permissions import AllowAny

User = get_user_model()


# PROFILE & SETTINGS VIEWS

class ProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile

class ProfileRetrieveAPIView(generics.RetrieveAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'user__id'
    lookup_url_kwarg = 'user_id'

    def get_queryset(self):
        return Profile.objects.all()

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


# GROUP VIEWS

class GroupListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(members=self.request.user)

    def perform_create(self, serializer):
        group = serializer.save(admin=self.request.user)
        group.members.add(self.request.user)


class GroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(members=self.request.user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # برای تغییر یا حذف گروه، حتماً کاربر باید ادمین باشد
        if request.method in ['PUT', 'PATCH', 'DELETE'] and obj.admin != request.user:
            self.permission_denied(request, message="شما دسترسی لازم برای تغییر این گروه را ندارید.")


class GroupAddRemoveMemberView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        group = get_object_or_404(Group, pk=pk)
        
        if group.admin != request.user:
            return Response({"error": "تنها ادمین گروه می‌تواند اعضا را مدیریت کند."}, status=status.HTTP_403_FORBIDDEN)
            
        user_id = request.data.get("user_id")
        action = request.data.get("action")  # 'add' یا 'remove'

        if not user_id or action not in ['add', 'remove']:
            return Response({"error": "پارامترهای ارسال شده معتبر نیستند."}, status=status.HTTP_400_BAD_REQUEST)

        target_user = get_object_or_404(User, pk=user_id)

        if action == 'add':

            target_profile, _ = Profile.objects.get_or_create(user=target_user)
            if not target_profile.allow_invites:
                return Response(
                    {"error": f"کاربر {target_user.username} اجازه اضافه شدن به گروه‌ها را بسته است."}, 
                    status=status.HTTP_403_FORBIDDEN
                )
                
            group.members.add(target_user)
            return Response({"message": f"کاربر {target_user.username} به گروه اضافه شد."}, status=status.HTTP_200_OK)


# MEDIA FILE VIEWS

class MediaUploadView(generics.ListCreateAPIView):
    serializer_class = MediaFileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return MediaFile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        file_obj = self.request.data.get('file')
        content_type = file_obj.content_type if file_obj else None
        serializer.save(user=self.request.user, file_type=content_type)


class MediaDetailView(generics.RetrieveDestroyAPIView):

    serializer_class = MediaFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return MediaFile.objects.filter(
            Q(user=user) | 
            Q(message__sender=user) | 
            Q(message__recipient=user) | 
            Q(message__group__members=user)
        ).distinct()
    



class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_id = self.request.query_params.get('user_id')
        group_id = self.request.query_params.get('group_id')

        if user_id:
            return Message.objects.filter(
                (Q(sender=user) & Q(recipient_id=user_id)) |
                (Q(sender_id=user_id) & Q(recipient=user))
            )

        if group_id:
            return Message.objects.filter(group_id=group_id, group__members=user)

        return Message.objects.filter(Q(sender=user) | Q(recipient=user) | Q(group__members=user)).distinct()

    def perform_create(self, serializer):
        media_id = serializer.validated_data.pop('media_id', None)
        media_obj = MediaFile.objects.filter(id=media_id, user=self.request.user).first() if media_id else None
        serializer.save(sender=self.request.user, media=media_obj)


class MessageDetailView(generics.RetrieveDestroyAPIView):
#delete massege 
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(sender=self.request.user)
    

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer