from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Profile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """The public shape of a user. Other modules import this rather than
    serialising User themselves, so display fields stay in one place."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        read_only_fields = ['id']


class PublicUserSerializer(serializers.ModelSerializer):
    """A user as a stranger may see them — US-10.2.

    `UserSerializer` above carries `email`, which is correct where the caller is
    reading their own account or a conversation they are in. This one is the
    shape for anybody else, and it is a **separate class rather than an
    `exclude`**: excluding is how a private field creeps back in the next time
    somebody adds one to the model.
    """

    class Meta:
        model = User
        fields = ['id', 'username']
        read_only_fields = ['id', 'username']


class PublicProfileSerializer(serializers.ModelSerializer):
    """Another user's profile — display fields only.

    Never `email` (theirs to give out, not ours), never `allow_invites` (a
    privacy setting, and knowing it in advance is exactly what SH.2 refuses to
    let an inviter do), and never anything from the auth tables.
    """

    user = PublicUserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ['user', 'bio', 'avatar']
        read_only_fields = fields


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
