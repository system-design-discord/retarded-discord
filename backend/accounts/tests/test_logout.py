"""G-04 — logging out invalidates the refresh token (US-1.3).

Before this endpoint existed the client simply dropped both tokens from
`localStorage`, which leaves a seven-day refresh token valid for anybody who
copied it. These tests are the difference between the two.
"""

import pytest
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh), str(refresh.access_token)


@pytest.mark.django_db
def test_the_refresh_token_stops_working_after_logout(api_client, auth_client, user):
    refresh, _ = tokens_for(user)

    logout = auth_client(user).post(reverse('logout'), {'refresh': refresh}, format='json')
    assert logout.status_code == 205

    replay = api_client.post(reverse('token_refresh'), {'refresh': refresh}, format='json')
    assert replay.status_code == 401


@pytest.mark.django_db
def test_the_refresh_token_works_before_logout(api_client, user):
    """The check above is only meaningful if the token was good to begin with."""
    refresh, _ = tokens_for(user)

    response = api_client.post(reverse('token_refresh'), {'refresh': refresh}, format='json')

    assert response.status_code == 200
    assert 'access' in response.data


@pytest.mark.django_db
def test_logging_in_again_issues_a_fresh_pair(api_client, auth_client, user_factory):
    user = user_factory('dave', password='testpass123')
    refresh, _ = tokens_for(user)
    auth_client(user).post(reverse('logout'), {'refresh': refresh}, format='json')

    login = api_client.post(
        reverse('token_obtain_pair'),
        {'username': 'dave', 'password': 'testpass123'},
        format='json',
    )

    assert login.status_code == 200
    assert login.data['refresh'] != refresh
    assert api_client.post(
        reverse('token_refresh'), {'refresh': login.data['refresh']}, format='json'
    ).status_code == 200


@pytest.mark.django_db
def test_logging_out_twice_is_idempotent(auth_client, user):
    refresh, _ = tokens_for(user)
    client = auth_client(user)

    assert client.post(reverse('logout'), {'refresh': refresh}, format='json').status_code == 205
    assert client.post(reverse('logout'), {'refresh': refresh}, format='json').status_code == 205


@pytest.mark.django_db
def test_logout_without_a_token_is_a_400_not_a_500(auth_client, user):
    response = auth_client(user).post(reverse('logout'), {}, format='json')

    assert response.status_code == 400


@pytest.mark.django_db
def test_logout_needs_authentication(api_client, user):
    refresh, _ = tokens_for(user)

    response = api_client.post(reverse('logout'), {'refresh': refresh}, format='json')

    assert response.status_code == 401
