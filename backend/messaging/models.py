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
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db import models
from django.db.models import Q

User = get_user_model()

# US-9.1 full-text search. The configuration is `simple` — no stemming, no stop
# words — rather than `english`, because the product's message text is mixed
# Persian and English: an English stemmer would quietly mangle one of the two
# languages it is asked about. It must be the *same* string in the index and in
# the query, or PostgreSQL builds a vector the index cannot answer and falls
# back to a sequential scan without saying so.
SEARCH_CONFIG = 'simple'
SEARCH_VECTOR = SearchVector('text', config=SEARCH_CONFIG)


class MessageQuerySet(models.QuerySet):
    """Read scoping lives here so that every caller shares one definition.

    Before this existed the list view, the detail view and `media_app` each
    wrote their own version of "messages this user may see", and they did not
    agree — the detail view only ever showed you your own messages, so a direct
    message you received was unreadable and an admin could not reach a message
    to moderate it.
    """

    def _audience(self, user):
        """Who is in the conversation a message belongs to.

        Factored out because `visible_to` and `readable_by` differ only in which
        *delivery* states they admit, never in who the audience is. Two copies of
        this Q would be two definitions of "who may read what", which is the bug
        `visible_to` was written to end.
        """
        return (
            Q(sender=user)                                  # anything you wrote
            | Q(recipient=user)                             # a DM addressed to you
            | Q(group__members=user)                        # a group you are in
            | Q(topic__channel__memberships__user=user)     # a channel you joined
            | Q(topic__channel__owner=user)                 # a channel you own
        )

    def visible_to(self, user):
        """Every message `user` is entitled to read, and nothing else.

        Membership, not permission: reading a conversation needs only that you
        are in it. What you may *do* with a message once you can see it is
        `roles.services`' decision, not this queryset's.
        """
        if user is None or not user.is_authenticated:
            return self.none()

        # A scheduled message is persisted the moment it is created but is not
        # part of any conversation until the dispatcher releases it (SC-02), so
        # the scope that decides what may be read is also what hides it — from
        # its own author included, who reads a pending schedule through
        # `/api/messages/scheduled/` instead.
        return self.filter(is_delivered=True).filter(self._audience(user)).distinct()

    def readable_by(self, user):
        """`visible_to`, plus the caller's own *pending* scheduled messages.

        The detail view's scope rather than the list's, and the difference is one
        row class: a message you wrote that the dispatcher has not released yet.
        `visible_to` hides it from every conversation view including its author's
        (SC-02), which is right — it is not in the conversation. But addressing a
        message by id in order to *edit* it is not reading a conversation, and an
        author who cannot reach their own pending schedule cannot fix a typo in it
        before it goes out.

        Expressed as one filter over the shared audience rather than as two
        querysets unioned with `|`: `visible_to` ends in `.distinct()`, and
        Django refuses to combine a distinct queryset with a non-distinct one
        ("Cannot combine a unique query with a non-unique query") — which it does
        at query-build time, so every caller of the detail view raised a
        `TypeError` and answered 500.

        Note that the audience clause still applies to the pending row, and it is
        satisfied by `Q(sender=user)`: only the author is admitted, never the
        recipient of a schedule that has not been sent.
        """
        if user is None or not user.is_authenticated:
            return self.none()

        return self.filter(Q(is_delivered=True) | Q(sender=user)).filter(
            self._audience(user)
        ).distinct()

    def search(self, term):
        """US-9.1 — messages whose text matches `term`, best match first.

        **Call it on `visible_to(user)`, never on the manager.** Scoping is not
        this method's job and deliberately not its business: the acceptance
        criterion is that a term appearing only in a stranger's conversation
        returns nothing, and that is true by construction when the only rows
        this can rank are the rows `visible_to` already allowed. A second
        hand-written scope here would be a second definition of who may read
        what, which is the bug `visible_to` was written to end.
        """
        if not term or not term.strip():
            return self.none()

        query = SearchQuery(term, config=SEARCH_CONFIG)

        return (
            self.annotate(search=SEARCH_VECTOR, rank=SearchRank(SEARCH_VECTOR, query))
            .filter(search=query)
            .order_by('-rank', '-created_at')
        )


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

    # SC-02: an ordinary message is delivered the instant it is written, which
    # is why `is_delivered` defaults to True — every row that existed before
    # scheduling did was, and the migration needs no data step. A scheduled
    # message is the exception: it is written with a future `scheduled_at` and
    # False, and stays invisible to `visible_to` until the SC-03 dispatcher
    # flips it. Indexed because the dispatcher's query is "due and not yet sent".
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    is_delivered = models.BooleanField(default=True)

    # US-3.1: an edited message is visibly labelled, and its original timestamp
    # survives. `created_at` is auto_now_add, so the second half holds by
    # construction — there is no code path that can move it.
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)

    objects = MessageQuerySet.as_manager()

    class Meta:
        ordering = ['created_at']
        indexes = [
            # An *expression* index over the same SearchVector the query builds,
            # so US-9.1's search needs no denormalised column and the model
            # keeps the exact shape ERD.tex gives it.
            GinIndex(SEARCH_VECTOR, name='message_text_search'),
        ]
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
