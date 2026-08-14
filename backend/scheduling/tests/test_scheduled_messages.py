from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from groups_app.models import Group
from messaging.models import Message
from notifications.models import Notification


def rows(response):
    return response.data['results']


def schedule_payload(
    recipient,
    *,
    text='later',
    when=None,
):
    when = when or timezone.now() + timedelta(hours=1)

    return {
        'recipient': recipient.pk,
        'text': text,
        'scheduled_at': when.isoformat(),
    }


@pytest.mark.django_db
def test_scheduling_requires_authentication(
    api_client,
    other_user,
):
    response = api_client.post(
        reverse('scheduled-message-create'),
        schedule_payload(other_user),
        format='json',
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_user_can_schedule_a_direct_message_without_delivering_it(
    auth_client,
    user,
    other_user,
):
    response = auth_client(user).post(
        reverse('scheduled-message-create'),
        schedule_payload(other_user),
        format='json',
    )

    assert response.status_code == 201

    message = Message.objects.get(
        pk=response.data['id'],
    )

    assert message.sender == user
    assert message.recipient == other_user
    assert message.scheduled_at is not None
    assert message.is_delivered is False

    assert Notification.objects.filter(
        user=other_user,
    ).count() == 0


@pytest.mark.django_db
def test_scheduled_message_is_hidden_from_normal_message_history(
    auth_client,
    user,
    other_user,
):
    Message.objects.create(
        sender=user,
        recipient=other_user,
        text='not yet',
        scheduled_at=timezone.now() + timedelta(hours=1),
        is_delivered=False,
    )

    response = auth_client(user).get(
        reverse('message-list-create'),
        {
            'user_id': other_user.pk,
        },
    )

    assert response.status_code == 200
    assert rows(response) == []


@pytest.mark.django_db
def test_schedule_time_must_be_in_the_future(
    auth_client,
    user,
    other_user,
):
    response = auth_client(user).post(
        reverse('scheduled-message-create'),
        schedule_payload(
            other_user,
            when=timezone.now() - timedelta(seconds=1),
        ),
        format='json',
    )

    assert response.status_code == 400
    assert 'scheduled_at' in response.data
    assert Message.objects.count() == 0


@pytest.mark.django_db
def test_list_contains_only_callers_pending_schedules(
    auth_client,
    user,
    other_user,
    user_factory,
):
    third_user = user_factory('charlie')

    mine = Message.objects.create(
        sender=user,
        recipient=other_user,
        text='mine',
        scheduled_at=timezone.now() + timedelta(hours=2),
        is_delivered=False,
    )

    Message.objects.create(
        sender=other_user,
        recipient=user,
        text='theirs',
        scheduled_at=timezone.now() + timedelta(hours=1),
        is_delivered=False,
    )

    Message.objects.create(
        sender=user,
        recipient=third_user,
        text='already sent',
        scheduled_at=timezone.now() - timedelta(minutes=5),
        is_delivered=True,
    )

    response = auth_client(user).get(
        reverse('scheduled-message-list'),
    )

    assert response.status_code == 200

    assert [
        item['id']
        for item in rows(response)
    ] == [
        mine.pk,
    ]


@pytest.mark.django_db
def test_owner_can_cancel_a_pending_scheduled_message(
    auth_client,
    user,
    other_user,
):
    message = Message.objects.create(
        sender=user,
        recipient=other_user,
        text='cancel me',
        scheduled_at=timezone.now() + timedelta(hours=1),
        is_delivered=False,
    )

    response = auth_client(user).delete(
        reverse(
            'scheduled-message-cancel',
            args=[message.pk],
        )
    )

    assert response.status_code == 204

    assert not Message.objects.filter(
        pk=message.pk,
    ).exists()


@pytest.mark.django_db
def test_user_cannot_cancel_someone_elses_schedule(
    auth_client,
    user,
    other_user,
):
    message = Message.objects.create(
        sender=other_user,
        recipient=user,
        text='not yours',
        scheduled_at=timezone.now() + timedelta(hours=1),
        is_delivered=False,
    )

    response = auth_client(user).delete(
        reverse(
            'scheduled-message-cancel',
            args=[message.pk],
        )
    )

    assert response.status_code == 404

    assert Message.objects.filter(
        pk=message.pk,
    ).exists()


@pytest.mark.django_db
def test_scheduling_group_message_requires_membership(
    auth_client,
    user,
    other_user,
):
    group = Group.objects.create_with_admin(
        admin=other_user,
        name='private group',
    )

    response = auth_client(user).post(
        reverse('scheduled-message-create'),
        {
            'group': group.pk,
            'text': 'not allowed',
            'scheduled_at': (
                timezone.now() + timedelta(hours=1)
            ).isoformat(),
        },
        format='json',
    )

    assert response.status_code == 403
    assert Message.objects.count() == 0
