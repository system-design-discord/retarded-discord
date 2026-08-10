"""Role serialization, including the one rule US-8.2 actually asks for."""

from rest_framework import serializers

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
