"""Messaging — architecture.tex §5.

A `Message` has **exactly one target**, and which one it is decides everything
downstream: who may read it (`MessageQuerySet.visible_to`) and who may delete it
(`roles.services.may_delete_message`).

| Target | Means | Story |
|---|---|---|
| `recipient` | a direct message to one user | US-2.1 |
| `group` | a message in a group | US-2.2 |
| `topic` | a message in one topic of a channel | US-2.3 |

`ERD.tex` models the direct-message case as a `PrivateChat` entity between two
users; we express it as a nullable `recipient` on the message itself. That
deviation is recorded in execution-plan.md.
"""

from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Q

User = get_user_model()


class MessageQuerySet(models.QuerySet):
    """Read scoping lives here so that every caller shares one definition.

    Before this existed the list view, the detail view and `media_app` each
    wrote their own version of "messages this user may see", and they did not
    agree — the detail view only ever showed you your own messages, so a direct
    message you received was unreadable and an admin could not reach a message
    to moderate it.
    """

    def visible_to(self, user):
        """Every message `user` is entitled to read, and nothing else.

        Membership, not permission: reading a conversation needs only that you
        are in it. What you may *do* with a message once you can see it is
        `roles.services`' decision, not this queryset's.
        """
        if user is None or not user.is_authenticated:
            return self.none()

        return self.filter(
            Q(sender=user)                                  # anything you wrote
            | Q(recipient=user)                             # a DM addressed to you
            | Q(group__members=user)                        # a group you are in
            | Q(topic__channel__memberships__user=user)     # a channel you joined
            | Q(topic__channel__owner=user)                 # a channel you own
        ).distinct()


class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')

    # Exactly one of the three is set. The serializer refuses anything else at
    # the API boundary and the constraint below refuses it at the database, so a
    # shell script or a data migration cannot create a shape the API forbids.
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True, related_name='received_messages'
    )
    group = models.ForeignKey(
        'groups_app.Group', on_delete=models.CASCADE, null=True, blank=True, related_name='messages'
    )
    topic = models.ForeignKey(
        'channels_app.Topic', on_delete=models.CASCADE, null=True, blank=True, related_name='messages'
    )

    text = models.TextField(blank=True, null=True)
    media = models.ForeignKey('media_app.MediaFile', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    # US-3.1: an edited message is visibly labelled, and its original timestamp
    # survives. `created_at` is auto_now_add, so the second half holds by
    # construction — there is no code path that can move it.
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)

    objects = MessageQuerySet.as_manager()

    class Meta:
        ordering = ['created_at']
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(recipient__isnull=False, group__isnull=True, topic__isnull=True)
                    | Q(recipient__isnull=True, group__isnull=False, topic__isnull=True)
                    | Q(recipient__isnull=True, group__isnull=True, topic__isnull=False)
                ),
                name='message_has_exactly_one_target',
            ),
        ]

    def __str__(self):
        return f"From {self.sender.username} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"
