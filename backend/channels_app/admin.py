from django.contrib import admin

from .models import Channel, ChannelMember, Topic

# C-02/C-03/C-04 have not landed, so there is no channel API yet: until they do,
# the admin is how INT-2 and INT-3 build a channel to verify against.
admin.site.register(Channel)
admin.site.register(ChannelMember)
admin.site.register(Topic)
