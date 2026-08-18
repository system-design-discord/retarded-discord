"""`MessageDetailView`'s scope — `readable_by` rather than `visible_to`.

The detail view admits one class of row the conversation views do not: the
caller's **own pending scheduled message**. `SC-02` hides an undelivered message
from every conversation view including its author's, which is right — it is not
in the conversation yet — but addressing a message by id in order to edit it is
not reading a conversation, and an author who cannot reach their own schedule
cannot fix a typo before it goes out.

The first test here is a regression test with a specific history. The scope was
first widened by combining two querysets with `|`, and `visible_to` ends in
`.distinct()`: Django refuses to combine a distinct queryset with a non-distinct
one, and it refuses at query-build time, so **every** request to this view —
every edit, every delete, every retrieve, delivered or not — raised a
`TypeError` and answered 500. The suite caught it in 26 places; this file is
where it is pinned, because the failure was in the composition rather than in
any one of those behaviours.
"""

import pytest
from django.utils import timezone

from messaging.models import Message


def url(message):
    return f'/api/messages/{message.pk}/'


@pytest.mark.django_db
def test_the_detail_view_answers_at_all(auth_client, user, other_user):
    """The 500 this file exists for: a plain, delivered, readable message."""
    message = Message.objects.create(sender=user, recipient=other_user, text='hi')

    response = auth_client(user).get(url(message))

    assert response.status_code == 200


@pytest.mark.django_db
def test_the_author_may_reach_their_own_pending_scheduled_message(auth_client, user, other_user):
    message = Message.objects.create(
        sender=user,
        recipient=other_user,
        text='typo',
        scheduled_at=timezone.now() + timezone.timedelta(hours=1),
        is_delivered=False,
    )

    response = auth_client(user).patch(url(message), {'text': 'fixed'}, format='json')

    assert response.status_code == 200
    message.refresh_from_db()
    assert message.text == 'fixed'


@pytest.mark.django_db
def test_the_recipient_may_not_reach_a_pending_scheduled_message(auth_client, user, other_user):
    """A schedule is not a message to its recipient until it is delivered.

    The audience clause admits the pending row through `sender=user` alone, so
    widening the scope for the author does not leak it to the person it is
    addressed to — who would otherwise read tomorrow's message today.
    """
    message = Message.objects.create(
        sender=user,
        recipient=other_user,
        text='surprise',
        scheduled_at=timezone.now() + timezone.timedelta(hours=1),
        is_delivered=False,
    )

    response = auth_client(other_user).get(url(message))

    assert response.status_code == 404


@pytest.mark.django_db
def test_a_pending_scheduled_message_stays_out_of_the_conversation(auth_client, user, other_user):
    """SC-02 is unchanged: the list view still hides it from its own author."""
    Message.objects.create(
        sender=user,
        recipient=other_user,
        text='later',
        scheduled_at=timezone.now() + timezone.timedelta(hours=1),
        is_delivered=False,
    )

    response = auth_client(user).get('/api/messages/', {'user_id': other_user.pk})

    assert response.status_code == 200
    assert response.data['count'] == 0
