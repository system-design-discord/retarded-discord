from rest_framework import serializers

from accounts.serializers import PublicUserSerializer
from common.signed_media import SignedImageField

from .models import Group


class GroupSerializer(serializers.ModelSerializer):
    # A-2 — `PublicUserSerializer` and not `UserSerializer`: the latter carries
    # `email`, so every member of a group was reading every other member's
    # address off this very list. What a user hands the product to log in with
    # is not a display field.
    admin = PublicUserSerializer(read_only=True)
    members = PublicUserSerializer(many=True, read_only=True)
    avatar = SignedImageField(required=False, allow_null=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'avatar', 'created_at', 'admin', 'members']
        read_only_fields = ['id', 'created_at', 'admin', 'members']
