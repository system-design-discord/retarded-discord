# Mounted under api/ by config/urls.py — do not repeat the prefix here.
#
# Included *before* roles/urls.py, which owns channels/<id>/members/<id>/role/
# and channels/<id>/me/permissions/. The patterns do not overlap: nothing here
# matches a path with a further segment after the member id.
from django.urls import path

from .views import (
    ChannelDetailView,
    ChannelListCreateView,
    ChannelMemberDetailView,
    ChannelMemberListCreateView,
    TopicDetailView,
    TopicListCreateView,
)

urlpatterns = [
    path('channels/', ChannelListCreateView.as_view(), name='channel-list-create'),
    path('channels/<int:pk>/', ChannelDetailView.as_view(), name='channel-detail'),
    path('channels/<int:channel_id>/topics/', TopicListCreateView.as_view(), name='topic-list-create'),
    path('channels/<int:channel_id>/topics/<int:pk>/', TopicDetailView.as_view(), name='topic-detail'),
    path(
        'channels/<int:channel_id>/members/',
        ChannelMemberListCreateView.as_view(),
        name='channel-member-list-create',
    ),
    path(
        'channels/<int:channel_id>/members/<int:user_id>/',
        ChannelMemberDetailView.as_view(),
        name='channel-member-detail',
    ),
]
