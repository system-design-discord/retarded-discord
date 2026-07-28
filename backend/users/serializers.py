from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Group, MediaFile



# translate for basic data
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ['user', 'bio', 'avatar', 'allow_invites']


class GroupSerializer(serializers.ModelSerializer):
    admin = UserSerializer(read_only=True)
    members = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'avatar', 'created_at', 'admin', 'members']



class MediaFileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = MediaFile
        fields = ['id', 'user', 'file', 'file_type', 'uploaded_at']
        read_only_fields = ['file_type', 'uploaded_at']