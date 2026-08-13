"""A-11 — search the public user directory by username to start a DM."""

import pytest
from django.urls import reverse


def results(response):
    """Return rows from the project's default paginated list response."""
    return response.data['results']


@pytest.mark.django_db
def test_user_directory_requires_authentication(api_client):
    response = api_client.get(reverse('user-directory'), {'search': 'ali'})

    assert response.status_code == 401


@pytest.mark.django_db
def test_blank_search_returns_no_users(auth_client, user, other_user):
    client = auth_client(user)

    missing = client.get(reverse('user-directory'))
    whitespace = client.get(reverse('user-directory'), {'search': '   '})

    assert missing.status_code == 200
    assert whitespace.status_code == 200
    assert results(missing) == []
    assert results(whitespace) == []


@pytest.mark.django_db
def test_search_is_case_insensitive_and_only_returns_username_matches(
    auth_client, user, user_factory
):
    matching = user_factory('AliReza')
    also_matching = user_factory('myALIaccount')
    user_factory('reza')

    response = auth_client(user).get(
        reverse('user-directory'),
        {'search': 'ali'},
    )

    assert response.status_code == 200
    assert {row['id'] for row in results(response)} == {
        matching.pk,
        also_matching.pk,
    }


@pytest.mark.django_db
def test_directory_never_returns_the_requesting_user(
    auth_client, user, user_factory
):
    user.username = 'alice-searchable'
    user.save(update_fields=['username'])
    other = user_factory('alice-other')

    response = auth_client(user).get(
        reverse('user-directory'),
        {'search': 'alice'},
    )

    assert response.status_code == 200
    assert [row['id'] for row in results(response)] == [other.pk]


@pytest.mark.django_db
def test_inactive_accounts_are_not_discoverable(
    auth_client, user, user_factory
):
    active = user_factory('target-active')
    inactive = user_factory('target-inactive', is_active=False)

    response = auth_client(user).get(
        reverse('user-directory'),
        {'search': 'target'},
    )

    ids = {row['id'] for row in results(response)}

    assert active.pk in ids
    assert inactive.pk not in ids


@pytest.mark.django_db
def test_directory_returns_public_fields_only(
    auth_client, user, user_factory
):
    target = user_factory(
        'visible-user',
        email='secret@example.test',
    )

    response = auth_client(user).get(
        reverse('user-directory'),
        {'search': 'visible'},
    )

    assert response.status_code == 200
    assert results(response) == [
        {
            'id': target.pk,
            'username': target.username,
        }
    ]
    assert target.email not in str(response.data)


@pytest.mark.django_db
def test_results_rank_exact_then_prefix_then_substring_matches(
    auth_client, user, user_factory
):
    substring = user_factory('myalexaccount')
    prefix_z = user_factory('alexz')
    exact = user_factory('alex')
    prefix_a = user_factory('alexa')

    response = auth_client(user).get(
        reverse('user-directory'),
        {'search': 'AlEx'},
    )

    assert response.status_code == 200
    assert [row['id'] for row in results(response)] == [
        exact.pk,
        prefix_a.pk,
        prefix_z.pk,
        substring.pk,
    ]
