"""Channels & Topics — architecture.tex §5.

**Only two of this module's three entities live here so far.** `Channel` and
`ChannelMember` landed under `R-01`, not `C-01`, because `roles.Role.channel`
is a ForeignKey and the roles chain — nine cards across four people — could not
start until a `Channel` existed to point at.

`C-01` is still open and still owns the rest: the `Topic` entity and the sweep
of this module against `ERD.tex`. `C-02`, `C-03` and `C-04` own the API; there
are deliberately no views or serializers in this package yet.

One deviation from `ERD.tex` is recorded in execution-plan.md: the ERD gives
`ChannelMember` a composite `(user_id, channel_id)` primary key. We express
that as a surrogate key plus a uniqueness constraint, which enforces the same
rule and keeps `Role.members` and DRF straightforward.
"""

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Channel(models.Model):
    """A space with members, topics and its own roles (US-4.1).

    The owner is the channel's super-admin. `roles.services` treats them as
    implicitly holding all eight permissions, so ownership is never a row that
    can be revoked by accident.
    """

    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='owned_channels', verbose_name="مالک کانال"
    )
    name = models.CharField(max_length=100, verbose_name="نام کانال")
    description = models.TextField(blank=True, null=True, verbose_name="توضیحات کانال")
    avatar = models.ImageField(upload_to='channel_avatars/', blank=True, null=True, verbose_name="تصویر کانال")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "کانال"
        verbose_name_plural = "کانال‌ها"

    def __str__(self):
        return self.name


class ChannelMember(models.Model):
    """Joins a user to a channel and carries the role they hold there.

    `role` is nullable on purpose. A member with no role holds no privileged
    permission at all — `roles.services.has_permission` refuses them — and
    deleting a role SET_NULLs its members rather than removing them from the
    channel (R-02: "deleting a role does not orphan its members").
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='channel_memberships', verbose_name="کاربر"
    )
    channel = models.ForeignKey(
        Channel, on_delete=models.CASCADE, related_name='memberships', verbose_name="کانال"
    )
    role = models.ForeignKey(
        'roles.Role', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='members', verbose_name="نقش",
    )
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ عضویت")

    class Meta:
        # ERD.tex models the primary key as (user_id, channel_id); this is the
        # same constraint expressed over a surrogate key.
        constraints = [
            models.UniqueConstraint(fields=['user', 'channel'], name='unique_channel_membership'),
        ]
        ordering = ['joined_at']
        verbose_name = "عضو کانال"
        verbose_name_plural = "اعضای کانال"

    def __str__(self):
        return f"{self.user.username} @ {self.channel.name}"
