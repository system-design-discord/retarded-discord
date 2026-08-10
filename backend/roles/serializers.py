"""Role serialization, including the one rule US-8.2 actually asks for."""

from rest_framework import serializers

from channels_app.models import ChannelMember
from roles.models import PERMISSION_FIELDS, Role
from roles.services import permissions_for


class RoleSerializer(serializers.ModelSerializer):
    """A role and its eight booleans.

    `validate` implements US-8.2: *"assign various capabilities **that fall
    within my own permissions** to user roles"*. Without it a super-admin could
    mint a role granting more than they hold and then assign it to themselves,
    which turns the whole permission model into a formality.
    """

    class Meta:
        model = Role
        fields = ['id', 'channel', 'name', 'created_at', *PERMISSION_FIELDS]
        read_only_fields = ['id', 'channel', 'created_at']

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("نام نقش نمی‌تواند خالی باشد.")

        channel = self.context['channel']
        clashes = Role.objects.filter(channel=channel, name=name)
        if self.instance is not None:
            clashes = clashes.exclude(pk=self.instance.pk)
        if clashes.exists():
            raise serializers.ValidationError("نقشی با این نام در این کانال وجود دارد.")

        return name

    def validate(self, attrs):
        """US-8.2 — you cannot grant what you do not hold."""
        actor = self.context['request'].user
        channel = self.context['channel']
        held = permissions_for(actor, channel)

        overreach = [
            field for field in PERMISSION_FIELDS
            if attrs.get(field, getattr(self.instance, field, False)) and not held[field]
        ]
        if overreach:
            raise serializers.ValidationError({
                field: "شما این دسترسی را ندارید و نمی‌توانید آن را به نقشی بدهید."
                for field in overreach
            })

        return attrs


class MemberRoleSerializer(serializers.ModelSerializer):
    """Assigning a role to a member (R-03, US-4.9).

    `role` is nullable on purpose: sending null clears the member's role rather
    than removing them from the channel.
    """

    class Meta:
        model = ChannelMember
        fields = ['id', 'user', 'channel', 'role', 'joined_at']
        read_only_fields = ['id', 'user', 'channel', 'joined_at']

    def validate_role(self, value):
        if value is None:
            return None

        channel = self.context['channel']
        if value.channel_id != channel.pk:
            raise serializers.ValidationError("این نقش متعلق به کانال دیگری است.")

        # US-8.2 again, from the other direction: assigning a role that grants
        # more than the actor holds is the same escalation as creating one.
        held = permissions_for(self.context['request'].user, channel)
        overreach = [field for field in PERMISSION_FIELDS if getattr(value, field) and not held[field]]
        if overreach:
            raise serializers.ValidationError(
                "این نقش دسترسی‌هایی دارد که خود شما ندارید: " + ", ".join(overreach)
            )

        return value


class MyPermissionsSerializer(serializers.Serializer):
    """US-8.3 — what the caller may do here, and under what role name."""

    channel = serializers.IntegerField(read_only=True)
    role = serializers.CharField(read_only=True, allow_null=True)
    permissions = serializers.DictField(child=serializers.BooleanField(), read_only=True)
