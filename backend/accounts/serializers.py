from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from common import messages

from .models import Profile

User = get_user_model()


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Log in with an email address or a username — #128.

    Registration has always **required** an email (`RegisterSerializer.Meta`),
    and the login wireframe labels its field *Email or Username* with the
    placeholder `example@email.com`. The endpoint mounted underneath was
    simplejwt's stock view, whose credential is `User.USERNAME_FIELD` and
    nothing else — so the product made every user type an address it then
    refused to accept, and answered the attempt with the same message a wrong
    password gets. Quiet, plausible, and indistinguishable from forgetting your
    password.

    The fix is a lookup, not a new authentication backend. Django's
    `authenticate()` is left to do the password check exactly as before; all
    this does is resolve whatever was typed to the username it belongs to first.
    That keeps every password validator, every throttle and `is_active` handling
    on the stock path.

    **The lookup is only unambiguous because emails are unique**, which they are
    since this card added `RegisterSerializer.validate_email` and the matching
    check on `ProfileSerializer`. Older rows predating that could still collide,
    so the query is ordered and takes the first match rather than raising
    `MultipleObjectsReturned` — a 500 on a login form is worse than resolving a
    historical duplicate to its oldest account.

    An identifier containing no `@` is not looked up at all: it cannot be an
    email, and skipping the query keeps the ordinary username login at exactly
    the cost it had before.
    """

    def validate(self, attrs):
        identifier = attrs.get(self.username_field, '')

        if '@' in identifier:
            match = (
                User.objects
                .filter(email__iexact=identifier)
                .order_by('pk')
                .values_list('username', flat=True)
                .first()
            )
            if match:
                attrs[self.username_field] = match

        return super().validate(attrs)


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


# The wireframe's Edit Profile screen counts the bio down from 200 characters.
# The cap lives here rather than on `Profile.bio` on purpose: it is an input
# rule, and a `max_length` on a `TextField` is a no-op in PostgreSQL that still
# costs a migration (#130).
BIO_MAX_LENGTH = 200


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    email = serializers.EmailField(source='user.email', required=False)
    username = serializers.CharField(source='user.username', required=False)
    bio = serializers.CharField(
        max_length=BIO_MAX_LENGTH,
        required=False,
        allow_blank=True,
        allow_null=True,
        error_messages={
            'max_length': messages.BIO_TOO_LONG.format(limit=BIO_MAX_LENGTH),
        },
    )

    class Meta:
        model = Profile
        fields = ['user', 'username', 'email', 'bio', 'avatar', 'allow_invites']

    def validate_email(self, value):
        """The account screen writes `user.email`, so it can collide too — #128.

        Registration is not the only door onto that column. Once an email is a
        login credential, a second account claiming an address already in use
        makes *both* accounts unreachable by it, and this endpoint could do that
        as easily as `RegisterSerializer` could.

        Excludes the caller's own row for the same reason `validate_username`
        does: the account screen submits every field on every save, so the
        address you already hold must not be read as a clash with yourself.
        """
        taken = User.objects.filter(email__iexact=value)
        if self.instance is not None:
            taken = taken.exclude(pk=self.instance.user_id)
        if taken.exists():
            raise serializers.ValidationError(messages.EMAIL_TAKEN)
        return value

    def validate_username(self, value):
        """`update()` assigns straight onto `user.username`, so a duplicate is
        an IntegrityError — a 500 rather than something a screen can show. It
        was unreachable while no UI exposed the field; #130 exposes it.

        A plain `UniqueValidator` will not do here. It excludes
        `serializer.instance`, and this serializer's instance is the `Profile`,
        not the `User` — so submitting your own current username, which the
        account screen does on every save, would be refused as a clash with
        yourself.
        """
        taken = User.objects.filter(username=value)
        if self.instance is not None:
            taken = taken.exclude(pk=self.instance.user_id)
        if taken.exists():
            raise serializers.ValidationError(messages.USERNAME_TAKEN)
        return value

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

    def validate_email(self, value):
        """No two accounts may share an email address — #128.

        Django's stock `User.email` carries **no** unique constraint, so the
        registration endpoint happily made a second account on an address that
        already had one. That was survivable while the email was decoration;
        `EmailOrUsernameTokenObtainSerializer` makes it a credential, and a
        credential that resolves to two accounts resolves to neither.

        Matched case-insensitively, because that is how people retype an address
        and how the login lookup below has to search for one. Enforced here
        rather than by a migration on purpose: `AUTH_USER_MODEL` is
        `django.contrib.auth.User`, so a `unique=True` on that field would be a
        change to a third-party model rather than to ours.
        """
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(messages.EMAIL_TAKEN)
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": messages.PASSWORDS_DO_NOT_MATCH})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user
