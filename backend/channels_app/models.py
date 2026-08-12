"""Channels & Topics — architecture.tex §5.

**None of this module's three entities landed under its own card.** `Channel` and
`ChannelMember` came in with `R-01`, because `roles.Role.channel` is a ForeignKey
and the roles chain could not start until a `Channel` existed to point at.
`Topic` came in with `R-05`, because message deletion in a channel cannot be
demonstrated — or even reached — without a channel message to delete.

`C-02`, `C-03` and `C-04` landed the API over the top of them, and `C-01`'s
remainder — the sweep of this module against `ERD.tex` — is pinned as
`tests/test_erd_alignment.py` so a later change that drifts fails CI rather than
being found at `INT-3`.

One deviation from `ERD.tex` is recorded in execution-plan.md: the ERD gives
`ChannelMember` a composite `(user_id, channel_id)` primary key. We express that
as a surrogate key plus a uniqueness constraint, which enforces the same rule and
keeps `Role.members` and DRF straightforward. `Topic` expresses its
`(channel, name)` uniqueness the same way.
"""

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class ChannelManager(models.Manager):

    def create_with_owner(self, owner, **fields):
        """Create a channel together with its owner's membership.

        `ERD.tex` makes `Channel : ChannelMember` a `1 : 1..N` relationship — a
        channel with no members is not a valid channel, and its owner is always
        one of them. Doing both writes in one place removes the standing trap of
        creating a channel and forgetting the row that puts its creator in it.

        The mirror of `groups_app.models.GroupManager.create_with_admin`, and
        deliberately the same shape.
        """
        channel = self.create(owner=owner, **fields)
        ChannelMember.objects.create(channel=channel, user=owner)
        return channel


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

    objects = ChannelManager()

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


class Topic(models.Model):
    """A named sub-conversation inside a channel (US-4.5).

    `user_stories_en.tex` is explicit that a channel is a collection of topics
    and that **all** members may exchange messages in them — the per-topic
    restriction in US-2.4 is on media, not on posting. Creating one requires
    `can_create_topic`, which is C-03's gate, not this model's.
    """

    channel = models.ForeignKey(
        Channel, on_delete=models.CASCADE, related_name='topics', verbose_name="کانال"
    )
    name = models.CharField(max_length=100, verbose_name="نام تاپیک")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['channel', 'name'], name='unique_topic_name_per_channel'),
        ]
        ordering = ['channel_id', 'name']
        verbose_name = "تاپیک"
        verbose_name_plural = "تاپیک‌ها"

    def __str__(self):
        return f"#{self.name} @ {self.channel.name}"
