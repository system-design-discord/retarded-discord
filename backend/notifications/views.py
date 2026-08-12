"""The notification API — US-11.1.

Every view here scopes to `request.user` in `get_queryset`, and none of them
takes a user id from anywhere. "A user only ever sees their own" is then not a
check that can be forgotten but the absence of a code path: somebody else's id
falls outside the queryset and answers 404, never 403.
"""

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class OwnNotificationsMixin:
    """The caller's notifications, and there is no other queryset in this file."""

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationListView(OwnNotificationsMixin, generics.ListAPIView):
    """Newest first — `Notification.Meta.ordering` — and paginated like every
    other list endpoint in the product."""

    serializer_class = NotificationSerializer


class UnreadCountView(OwnNotificationsMixin, APIView):
    """The badge. Cheaper than reading the list and counting it client-side,
    which is what a screen showing a count on every route would otherwise do."""

    def get(self, request):
        return Response({'unread': self.get_queryset().filter(is_read=False).count()})


class MarkReadView(OwnNotificationsMixin, APIView):
    """Mark one read — idempotent.

    Marking an already-read notification read is not an error: the caller asked
    for a state, and it holds. Answering 400 the second time would make the UI
    handle a failure that changed nothing.
    """

    def post(self, request, pk):
        notification = get_object_or_404(self.get_queryset(), pk=pk)

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])

        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)


class MarkAllReadView(OwnNotificationsMixin, APIView):
    """One UPDATE, however many rows. Returns how many actually changed."""

    def post(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'updated': updated}, status=status.HTTP_200_OK)
