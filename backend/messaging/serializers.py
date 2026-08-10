from rest_framework import serializers

from accounts.serializers import UserSerializer
from media_app.serializers import MediaFileSerializer

from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    media = MediaFileSerializer(read_only=True)
    media_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'recipient', 'group', 'text', 'media', 'media_id', 'created_at', 'is_read']
        read_only_fields = ['id', 'sender', 'created_at', 'is_read']

    def validate(self, attrs):
        recipient = attrs.get('recipient')
        group = attrs.get('group')

        if not recipient and not group:
            raise serializers.ValidationError("پیام باید دارای دریافت‌کننده (کاربر) یا گروه باشد.")
        if recipient and group:
            raise serializers.ValidationError("پیام نمی‌تواند هم‌زمان هم به کاربر و هم به گروه ارسال شود.")
        return attrs
