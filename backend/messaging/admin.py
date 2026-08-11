from django.contrib import admin

from .models import Message


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    """INT-2 and INT-3 are by-hand runs against a seeded database, and the
    channel API does not exist yet — so the admin is currently the only way to
    build a channel conversation to verify against."""

    list_display = ('id', 'sender', 'recipient', 'group', 'topic', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('text',)
