import os

from rest_framework import serializers

from accounts.serializers import PublicUserSerializer
from common import messages
from common.signed_media import SignedFileField

from .models import MediaFile


class MediaFileSerializer(serializers.ModelSerializer):
    # A-2 — the uploader's email is not part of an attachment.
    user = PublicUserSerializer(read_only=True)
    # A-1 — the rendered URL carries the token that authorises reading it.
    file = SignedFileField()

    class Meta:
        model = MediaFile
        fields = ['id', 'user', 'file', 'file_type', 'file_size', 'uploaded_at']
        read_only_fields = ['id', 'user', 'file_type', 'file_size', 'uploaded_at']

    def validate_file(self, value):
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.mp4', '.mp3', '.pdf', '.zip']
        ext = os.path.splitext(value.name)[1].lower()

        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                messages.FILE_TYPE_NOT_ALLOWED.format(allowed=', '.join(allowed_extensions))
            )

        return value
