import os

from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import MediaFile


class MediaFileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = MediaFile
        fields = ['id', 'user', 'file', 'file_type', 'file_size', 'uploaded_at']
        read_only_fields = ['id', 'user', 'file_type', 'file_size', 'uploaded_at']

    def validate_file(self, value):
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.mp4', '.mp3', '.pdf', '.zip']
        ext = os.path.splitext(value.name)[1].lower()

        if ext not in allowed_extensions:
            raise serializers.ValidationError(f"فرمت فایل مجاز نیست. فرمت‌های مجاز: {', '.join(allowed_extensions)}")

        return value
