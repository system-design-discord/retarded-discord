from django.contrib import admin

from .models import Channel, ChannelMember

admin.site.register(Channel)
admin.site.register(ChannelMember)
