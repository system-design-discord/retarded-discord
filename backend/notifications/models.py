"""Notifications — architecture.tex §5.

`ERD.tex` gives this module one entity and one relationship:

    Notification  (id, user_id, type, content, is_read, created_at)
    User : Notification   1 : 0..N

`tests/test_erd_alignment.py` asserts both, so a later change that drifts fails
CI on the day rather than being found at `INT-3` (brief Rule 12).
"""

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class Notification(models.Model):
    """Something happened that this user should know about — US-11.1.

    Rows are written by `notifications.services.notify`, which is called by
    `notifications.handlers` in response to a `common.events` publication. No
    other module writes here, and no other module is imported from here.
    """

    class Kind(models.TextChoices):
        """The three events US-11.1 names, and only those three.

        The story is a closed list — *"receiving a new message, being added to a
        group or channel, or having my role in a channel changed"* — so this is
        an enum rather than a free-text string. A fourth kind is then a design
        decision somebody makes deliberately, not a typo that silently creates a
        category nothing filters on.
        """

        MESSAGE = 'message', "New message"
        MEMBER_ADDED = 'member_added', "Added to a group or channel"
        ROLE_CHANGED = 'role_changed', "Role changed"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications', verbose_name="کاربر"
    )
    type = models.CharField(max_length=20, choices=Kind.choices, verbose_name="نوع")
    content = models.TextField(verbose_name="متن")
    is_read = models.BooleanField(default=False, verbose_name="خوانده شده")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    # Additive beyond ERD.tex, and recorded as a deviation in execution-plan.md.
    # U-11 asks that opening a notification navigates to its subject, and with
    # only a type and a sentence of text that is unanswerable. It is a path in
    # the SPA, not a relationship: it adds no edge to the ERD and removes no
    # column, the same ground on which channels_app keeps its timestamps.
    link = models.CharField(max_length=200, blank=True, null=True, verbose_name="مقصد")

    class Meta:
        ordering = ['-created_at']
        indexes = [
            # The only two queries there are: the caller's list, and their
            # unread count.
            models.Index(fields=['user', 'is_read'], name='notification_user_unread'),
        ]
        verbose_name = "اعلان"
        verbose_name_plural = "اعلان‌ها"

    def __str__(self):
        return f"{self.get_type_display()} → {self.user.username}"
