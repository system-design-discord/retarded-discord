from django.db.models import Q
from rest_framework import generics, permissions

from media_app.models import MediaFile

from .models import Message
from .serializers import MessageSerializer


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
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(sender=self.request.user)
