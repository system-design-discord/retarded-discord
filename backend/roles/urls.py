# Mounted under api/ by config/urls.py — do not repeat the prefix here.
from django.urls import path

from roles.views import RoleDetailView, RoleListCreateView

urlpatterns = [
    path('channels/<int:channel_id>/roles/', RoleListCreateView.as_view(), name='role-list-create'),
    path('channels/<int:channel_id>/roles/<int:pk>/', RoleDetailView.as_view(), name='role-detail'),
]
