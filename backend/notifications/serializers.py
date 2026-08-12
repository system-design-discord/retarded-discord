"""The wire shape of a notification.

`U-11`'s screen landed before this API did (PR #87), so the field names below
are not a fresh choice — they are the contract that component already reads.
`title` and `body` are **derived**, not stored: `ERD.tex` gives the entity one
text column, and splitting it in the database to suit a heading in the UI would
be the presentation layer reaching into the data model.
"""

from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='get_type_display', read_only=True)
    body = serializers.CharField(source='content', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'body', 'content', 'is_read', 'link', 'created_at']
        read_only_fields = fields
