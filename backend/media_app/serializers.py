import os

from rest_framework import serializers

from accounts.serializers import PublicUserSerializer
from common import messages
from common.signed_media import SignedFileField

from .models import EXTENSION_TYPES, MediaFile


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
        # A-5 — the allowlist *is* the classifier's table. Anything the model
        # knows how to name, the API accepts.
        allowed_extensions = sorted(EXTENSION_TYPES)
        ext = os.path.splitext(value.name)[1].lower()

        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                messages.FILE_TYPE_NOT_ALLOWED.format(allowed=', '.join(allowed_extensions))
            )

        return value
