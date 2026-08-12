from django.contrib import admin

from .models import Channel, ChannelMember, Topic


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'created_at')
    list_select_related = ('owner',)
    search_fields = ('name', 'owner__username')


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('name', 'channel', 'created_at')
    list_select_related = ('channel',)
    list_filter = ('channel',)
    search_fields = ('name',)


@admin.register(ChannelMember)
class ChannelMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'channel', 'role', 'joined_at')
    list_select_related = ('user', 'channel', 'role')
    list_filter = ('channel',)
    search_fields = ('user__username', 'channel__name')
