from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile, Group, MediaFile, Message
from django.contrib.auth.password_validation import validate_password



User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        read_only_fields = ['id']


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    email = serializers.EmailField(source='user.email', required=False)
    username = serializers.CharField(source='user.username', required=False)

    class Meta:
        model = Profile
        fields = ['user', 'username', 'email', 'bio', 'avatar', 'allow_invites']

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        email = user_data.get('email')
        username = user_data.get('username')

        # update user filed
        if email:
            instance.user.email = email
        if username:
            instance.user.username = username
        instance.user.save()

        # update profile
        instance.bio = validated_data.get('bio', instance.bio)
        instance.avatar = validated_data.get('avatar', instance.avatar)
        instance.allow_invites = validated_data.get('allow_invites', instance.allow_invites)
        instance.save()

        return instance


class GroupSerializer(serializers.ModelSerializer):
    admin = UserSerializer(read_only=True)
    members = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'avatar', 'created_at', 'admin', 'members']
        read_only_fields = ['id', 'created_at', 'admin', 'members']


class MediaFileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = MediaFile
        fields = ['id', 'user', 'file', 'file_type', 'uploaded_at']
        read_only_fields = ['id', 'user', 'file_type', 'uploaded_at']




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
    


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']
        extra_kwargs = {
            'email': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "رمز عبور و تکرار آن با هم مطابقت ندارند."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user