"""N-02, second half — the list, count and mark-read endpoints.

Two acceptance criteria are asserted directly: a user only ever sees their own,
and mark-read is idempotent.
"""

import pytest
from django.urls import reverse

from notifications.models import Notification


@pytest.fixture
def mine(db, user):
    return [
        Notification.objects.create(user=user, type=Notification.Kind.MESSAGE, content='a'),
        Notification.objects.create(
            user=user, type=Notification.Kind.ROLE_CHANGED, content='b', is_read=True
        ),
    ]


@pytest.fixture
def theirs(db, other_user):
    return Notification.objects.create(
        user=other_user, type=Notification.Kind.MESSAGE, content='not yours', link='/dms'
    )


@pytest.mark.django_db
def test_the_list_is_paginated_and_newest_first(auth_client, user, mine):
    response = auth_client(user).get(reverse('notification-list'))

    assert response.status_code == 200
    assert response.data['count'] == 2
    assert [row['content'] for row in response.data['results']] == ['b', 'a']


@pytest.mark.django_db
def test_a_user_only_ever_sees_their_own(auth_client, user, mine, theirs):
    response = auth_client(user).get(reverse('notification-list'))

    assert response.data['count'] == 2
    assert 'not yours' not in str(response.data)


@pytest.mark.django_db
def test_the_payload_carries_what_the_screen_reads(auth_client, user, mine):
    row = auth_client(user).get(reverse('notification-list')).data['results'][0]

    assert set(row) == {'id', 'type', 'title', 'body', 'content', 'is_read', 'link', 'created_at'}
    assert row['title'] == Notification.Kind.ROLE_CHANGED.label
    assert row['body'] == row['content']


@pytest.mark.django_db
def test_mark_read_is_idempotent(auth_client, user, mine):
    unread = mine[0]
    url = reverse('notification-mark-read', args=[unread.pk])
    client = auth_client(user)

    first = client.post(url)
    second = client.post(url)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.data['is_read'] is True
    assert second.data['is_read'] is True


@pytest.mark.django_db
def test_marking_someone_elses_notification_is_404(auth_client, user, theirs):
    response = auth_client(user).post(reverse('notification-mark-read', args=[theirs.pk]))

    assert response.status_code == 404
    theirs.refresh_from_db()
    assert theirs.is_read is False


@pytest.mark.django_db
def test_the_unread_count_matches_the_list(auth_client, user, mine, theirs):
    client = auth_client(user)

    assert client.get(reverse('notification-unread-count')).data == {'unread': 1}

    client.post(reverse('notification-mark-read', args=[mine[0].pk]))

    assert client.get(reverse('notification-unread-count')).data == {'unread': 0}


@pytest.mark.django_db
def test_mark_all_read_leaves_other_users_alone(auth_client, user, mine, theirs):
    response = auth_client(user).post(reverse('notification-mark-all-read'))

    assert response.data == {'updated': 1}
    assert not Notification.objects.filter(user=user, is_read=False).exists()
    theirs.refresh_from_db()
    assert theirs.is_read is False


@pytest.mark.django_db
def test_mark_all_read_twice_reports_nothing_the_second_time(auth_client, user, mine):
    client = auth_client(user)
    client.post(reverse('notification-mark-all-read'))

    assert client.post(reverse('notification-mark-all-read')).data == {'updated': 0}


@pytest.mark.django_db
@pytest.mark.parametrize('name', [
    'notification-list', 'notification-unread-count', 'notification-mark-all-read',
])
def test_every_endpoint_needs_authentication(api_client, name):
    url = reverse(name)

    assert api_client.get(url).status_code == 401 or api_client.post(url).status_code == 401
