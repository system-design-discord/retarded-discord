from rest_framework import serializers

from accounts.serializers import UserSerializer

from .models import Group


class GroupSerializer(serializers.ModelSerializer):
    admin = UserSerializer(read_only=True)
    members = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'avatar', 'created_at', 'admin', 'members']
        read_only_fields = ['id', 'created_at', 'admin', 'members']
