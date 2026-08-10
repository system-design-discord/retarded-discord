"""Roles & Access Control — architecture.tex §5.

A role is a **row in a table**, never a constant in a source file. That is the
whole point: brief §5.8 asks for access levels that change without editing
code, and US-8.1 asks a channel super-admin to define roles with names of their
own choosing. Both are only true if the permission set is data.

See roles/README.md for the calling convention. Evaluation lives in
roles/services.py, not here — a model that answers "may this user do X" would
put the decision back inside whichever module happened to load it.
"""

from django.db import models

# The eight permissions, fixed by user_stories_en.tex §Assumptions. Anything
# that needs to iterate them should import this rather than re-listing them —
# roles/services.py, the serializer and the tests all do.
PERMISSION_FIELDS = (
    'can_send_media',
    'can_delete_message',
    'can_create_topic',
    'can_edit_channel',
    'can_remove_member',
    'can_add_member',
    'can_change_role',
    'can_delete_channel',
)


class Role(models.Model):
    """A named bundle of permissions inside one channel (US-8.1).

    Roles are scoped to a channel: "Moderator" in one channel grants nothing in
    another. Every permission defaults to False, so a freshly created role is
    safe until someone deliberately grants something.
    """

    channel = models.ForeignKey(
        'channels_app.Channel', on_delete=models.CASCADE, related_name='roles', verbose_name="کانال"
    )
    name = models.CharField(max_length=50, verbose_name="نام نقش")

    can_send_media = models.BooleanField(default=False, verbose_name="ارسال رسانه")
    can_delete_message = models.BooleanField(default=False, verbose_name="حذف پیام دیگران")
    can_create_topic = models.BooleanField(default=False, verbose_name="ایجاد تاپیک")
    can_edit_channel = models.BooleanField(default=False, verbose_name="ویرایش کانال")
    can_remove_member = models.BooleanField(default=False, verbose_name="حذف عضو")
    can_add_member = models.BooleanField(default=False, verbose_name="افزودن عضو")
    can_change_role = models.BooleanField(default=False, verbose_name="تغییر نقش‌ها")
    can_delete_channel = models.BooleanField(default=False, verbose_name="حذف کانال")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['channel', 'name'], name='unique_role_name_per_channel'),
        ]
        ordering = ['channel_id', 'name']
        verbose_name = "نقش"
        verbose_name_plural = "نقش‌ها"

    def __str__(self):
        return f"{self.name} @ {self.channel.name}"

    def granted(self):
        """The permissions this role grants, as a {name: bool} mapping."""
        return {field: getattr(self, field) for field in PERMISSION_FIELDS}
