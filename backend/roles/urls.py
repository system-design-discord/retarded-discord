# Mounted under api/ by config/urls.py — do not repeat the prefix here.
from django.urls import path

from roles.views import MemberRoleView, MyPermissionsView, RoleDetailView, RoleListCreateView

urlpatterns = [
    path('channels/<int:channel_id>/roles/', RoleListCreateView.as_view(), name='role-list-create'),
    path('channels/<int:channel_id>/roles/<int:pk>/', RoleDetailView.as_view(), name='role-detail'),
    path(
        'channels/<int:channel_id>/members/<int:user_id>/role/',
        MemberRoleView.as_view(),
        name='member-role',
    ),
    path(
        'channels/<int:channel_id>/me/permissions/',
        MyPermissionsView.as_view(),
        name='my-channel-permissions',
    ),
]
