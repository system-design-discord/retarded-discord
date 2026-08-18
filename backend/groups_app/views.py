from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Profile
from common import events, messages
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
        #
        # US-6.3 and US-6.4 make both of these member rights, not admin ones —
        # doc.tex §4.6: "groups can be deleted by any of their members. Editing
        # their information is also done by these same people." The queryset
        # above already scopes to membership, so in practice a non-member is a
        # 404 before this runs; the ask stays because the *rule* is not this
        # module's to know, and because it is the guard if the queryset ever
        # widens.
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            allowed = (
                roles.may_delete_group(request.user, obj)
                if request.method == 'DELETE'
                else roles.may_edit_group(request.user, obj)
            )
            if not allowed:
                self.permission_denied(request, message=messages.NO_PERMISSION_TO_EDIT_GROUP)


class GroupAddRemoveMemberView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        group = get_object_or_404(Group, pk=pk)

        # architecture.tex §5.1: this module does not decide, it asks roles.
        # The coarse gate runs before validation so a stranger gets 403 rather
        # than a hint about which parameters the endpoint wants.
        #
        # A-10 moved the removal half of this gate down past the body, and that
        # is the whole of the change: leaving is removing yourself, so whether
        # the caller may remove *anybody* cannot be answered before the request
        # says who. Adding is unchanged — nobody adds themselves.
        if not (roles.has_group_permission(request.user, group, 'can_add_member')
                or roles.is_group_member(request.user, group)):
            return Response(
                {"error": messages.ONLY_GROUP_ADMIN_MANAGES_MEMBERS},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get("user_id")
        action = request.data.get("action")  # 'add' or 'remove'

        if not user_id or action not in ['add', 'remove']:
            return Response({"error": messages.INVALID_PARAMETERS}, status=status.HTTP_400_BAD_REQUEST)

        target_user = get_object_or_404(User, pk=user_id)

        # ...and then the permission that actually matches what was asked for.
        if action == 'add':
            roles.require_group_permission(request.user, group, 'can_add_member')
        else:
            roles.require_remove_group_member(request.user, group, target_user)

        if action == 'add':
            # US-5.4 / SH.2 — the target's own flag decides, not the admin's.
            target_profile, _ = Profile.objects.get_or_create(user=target_user)
            if not target_profile.allow_invites:
                return Response(
                    {"error": messages.USER_DISALLOWS_GROUP_INVITES.format(username=target_user.username)},
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

            return Response(
                {"message": messages.USER_ADDED_TO_GROUP.format(username=target_user.username)},
                status=status.HTTP_200_OK,
            )
        elif action == 'remove':
            if target_user == group.admin:
                return Response({"error": messages.CANNOT_REMOVE_GROUP_ADMIN}, status=status.HTTP_400_BAD_REQUEST)
            group.members.remove(target_user)
            return Response(
                {"message": messages.USER_REMOVED_FROM_GROUP.format(username=target_user.username)},
                status=status.HTTP_200_OK,
            )
