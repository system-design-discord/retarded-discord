from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Profile

from .models import Group
from .serializers import GroupSerializer

User = get_user_model()


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
            # US-5.4 / SH.2 — the target's own flag decides, not the admin's.
            target_profile, _ = Profile.objects.get_or_create(user=target_user)
            if not target_profile.allow_invites:
                return Response(
                    {"error": f"کاربر {target_user.username} اجازه اضافه شدن به گروه‌ها را بسته است."},
                    status=status.HTTP_403_FORBIDDEN
                )

            group.members.add(target_user)
            return Response({"message": f"کاربر {target_user.username} به گروه اضافه شد."}, status=status.HTTP_200_OK)
        elif action == 'remove':
            if target_user == group.admin:
                return Response({"error": "امکان حذف ادمین اصلی وجود ندارد."}, status=status.HTTP_400_BAD_REQUEST)
            group.members.remove(target_user)
            return Response({"message": f"کاربر {target_user.username} از گروه حذف شد."}, status=status.HTTP_200_OK)
