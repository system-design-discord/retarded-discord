from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.parsers import FormParser, MultiPartParser

from .models import MediaFile
from .serializers import MediaFileSerializer


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
        # US-7.2 — the uploader, plus anyone in a conversation the file was
        # attached to. The check sits in front of the file, not on the path.
        user = self.request.user
        return MediaFile.objects.filter(
            Q(user=user)
            | Q(message__sender=user)
            | Q(message__recipient=user)
            | Q(message__group__members=user)
        ).distinct()
