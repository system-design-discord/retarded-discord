from django.urls import path

from .views import GroupAddRemoveMemberView, GroupDetailView, GroupListCreateView

# Mounted under api/ by config/urls.py — do not repeat the prefix here.
urlpatterns = [
    path('groups/', GroupListCreateView.as_view(), name='group-list-create'),
    path('groups/<int:pk>/', GroupDetailView.as_view(), name='group-detail'),
    path('groups/<int:pk>/members/', GroupAddRemoveMemberView.as_view(), name='group-manage-members'),
]
