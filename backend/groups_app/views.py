from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Profile
from common import events
from roles import services as roles

from .models import Group, GroupMember
from .serializers import GroupSerializer

User = get_user_model()


class GroupListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(members=self.request.user)

    def perform_create(self, serializer):
        # US-5.1 — the creator is the admin. One write, in GroupMember, which is
        # now the only place that fact is recorded.
        group = serializer.save()
        GroupMember.objects.create(group=group, user=self.request.user, is_admin=True)


class GroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(members=self.request.user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        # architecture.tex §5.1: this module does not decide, it asks roles.
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            permission = 'can_delete_channel' if request.method == 'DELETE' else 'can_edit_channel'
            if not roles.has_group_permission(request.user, obj, permission):
                self.permission_denied(request, message="شما دسترسی لازم برای تغییر این گروه را ندارید.")


class GroupAddRemoveMemberView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        group = get_object_or_404(Group, pk=pk)

        # architecture.tex §5.1: this module does not decide, it asks roles.
        # The coarse gate runs before validation so a non-admin gets 403 rather
        # than a hint about which parameters the endpoint wants.
        if not any(roles.has_group_permission(request.user, group, p)
                   for p in ('can_add_member', 'can_remove_member')):
            return Response(
                {"error": "تنها ادمین گروه می‌تواند اعضا را مدیریت کند."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get("user_id")
        action = request.data.get("action")  # 'add' یا 'remove'

        if not user_id or action not in ['add', 'remove']:
            return Response({"error": "پارامترهای ارسال شده معتبر نیستند."}, status=status.HTTP_400_BAD_REQUEST)

        # ...and then the permission that actually matches what was asked for.
        roles.require_group_permission(
            request.user, group, 'can_add_member' if action == 'add' else 'can_remove_member'
        )

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

            # The same event channels_app publishes when a channel gains a
            # member. US-11.1 names being added to a *group or channel*, so both
            # sides have to say so; notifications subscribes, and this module
            # does not import it (architecture.tex §5.1).
            events.publish(
                events.MEMBER_ADDED,
                group=group,
                user=target_user,
                actor=request.user,
            )

            return Response({"message": f"کاربر {target_user.username} به گروه اضافه شد."}, status=status.HTTP_200_OK)
        elif action == 'remove':
            if target_user == group.admin:
                return Response({"error": "امکان حذف ادمین اصلی وجود ندارد."}, status=status.HTTP_400_BAD_REQUEST)
            group.members.remove(target_user)
            return Response({"message": f"کاربر {target_user.username} از گروه حذف شد."}, status=status.HTTP_200_OK)
