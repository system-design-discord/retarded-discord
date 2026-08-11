"""Groups — architecture.tex §5.

`ERD.tex` models group membership as its own entity, **`GroupMember`**, carrying
`(user_id, group_id, is_admin)`; its `Group` entity has no admin column at all.
This module used to have the opposite shape — a `Group.admin` ForeignKey and a
bare `ManyToManyField` — so `M-04` replaced it with what the design actually
says.

`GroupMember.is_admin` is therefore the **single** source of truth for who
administers a group. `Group.admin` survives as a read-only property so the API
response shape is unchanged, but there is no longer a second column that can
disagree with it.

A group has no role table: `user_stories_en.tex` §Assumptions for section 5 says
"the only distinction between a group admin and regular members is the ability to
remove members, add members, and delete others' messages." Those three are
decided by `roles.services.has_group_permission`, not here — architecture.tex
§5.1 holds for this module too.
"""

from django.contrib.auth.models import User
from django.db import models


class GroupManager(models.Manager):

    def create_with_admin(self, admin, **fields):
        """Create a group together with the membership that administers it.

        `ERD.tex` makes `Group : GroupMember` a `1 : 1..N` relationship — a group
        with no members is not a valid group, and one with no admin has nobody
        who can moderate it. Doing both writes in one place removes the standing
        trap of creating a group and forgetting to add its creator to it.
        """
        group = self.create(**fields)
        GroupMember.objects.create(group=group, user=admin, is_admin=True)
        return group


class Group(models.Model):

    name = models.CharField(max_length=100, verbose_name="نام گروه")
    description = models.TextField(blank=True, null=True, verbose_name="توضیحات گروه")
    avatar = models.ImageField(upload_to='group_avatars/', blank=True, null=True, verbose_name="تصویر گروه")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    # Declared through GroupMember, so `group.members` and every
    # `group__members=user` lookup keep working exactly as they did while the
    # join row gains the is_admin column ERD.tex specifies.
    members = models.ManyToManyField(
        User, through='GroupMember', related_name='chat_groups', verbose_name="اعضای گروه"
    )

    objects = GroupManager()

    def __str__(self):
        return self.name

    @property
    def admin(self):
        """The group's admin, read from `GroupMember` rather than stored twice.

        `GroupSerializer` exposes this and the group API's response shape is
        unchanged by `M-04`; it is a property now instead of a column.
        """
        membership = (
            GroupMember.objects
            .filter(group=self, is_admin=True)
            .select_related('user')
            .first()
        )
        return membership.user if membership else None


class GroupMember(models.Model):
    """Joins a user to a group and records whether they administer it.

    The mirror of `channels_app.ChannelMember`, and deliberately the same shape:
    `ERD.tex` gives both a composite `(user_id, group_id)` primary key and both
    express it as a surrogate key plus a `UniqueConstraint`. Recorded as
    deviation 5 in execution-plan.md.
    """

    group = models.ForeignKey(
        Group, on_delete=models.CASCADE, related_name='memberships', verbose_name="گروه"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='group_memberships', verbose_name="کاربر"
    )
    is_admin = models.BooleanField(default=False, verbose_name="مدیر گروه")
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ عضویت")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['group', 'user'], name='unique_group_membership'),
        ]
        ordering = ['joined_at']
        verbose_name = "عضو گروه"
        verbose_name_plural = "اعضای گروه"

    def __str__(self):
        return f"{self.user.username} @ {self.group.name}"
