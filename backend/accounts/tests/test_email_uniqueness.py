"""#128 — an email address identifies at most one account.

Django's stock `User.email` has no unique constraint, so nothing stopped two
accounts sharing an address. That was harmless while the email was decoration.
It stops being harmless the moment `auth/login/` accepts an email as a
credential: an address held by two accounts authenticates neither, and the
second registration would have quietly broken the first user's login.

Two doors write that column — registration and the account screen — so both are
covered here. Matching is case-insensitive, because that is how the login
lookup has to search for it.
"""

import pytest
from django.urls import reverse

REGISTER = {'password': 'a-very-long-testpass-123', 'password_confirm': 'a-very-long-testpass-123'}


@pytest.mark.django_db
def test_registering_with_a_free_email_succeeds(api_client):
    response = api_client.post(
        reverse('register'),
        {'username': 'newcomer', 'email': 'newcomer@example.test', **REGISTER},
    )

    assert response.status_code == 201


@pytest.mark.django_db
def test_registering_with_a_taken_email_is_refused(api_client, user):
    response = api_client.post(
        reverse('register'),
        {'username': 'impostor', 'email': user.email, **REGISTER},
    )

    assert response.status_code == 400
    assert 'email' in response.data


@pytest.mark.django_db
def test_the_email_check_ignores_case(api_client, user):
    """`Alice@…` and `alice@…` are the same mailbox to everybody but a database."""
    response = api_client.post(
        reverse('register'),
        {'username': 'impostor', 'email': user.email.upper(), **REGISTER},
    )

    assert response.status_code == 400
    assert 'email' in response.data


@pytest.mark.django_db
def test_the_account_screen_cannot_claim_a_taken_email(auth_client, user, other_user):
    response = auth_client(user).patch(reverse('profile-detail'), {'email': other_user.email})

    assert response.status_code == 400
    assert 'email' in response.data
    user.refresh_from_db()
    assert user.email != other_user.email


@pytest.mark.django_db
def test_saving_your_own_email_back_is_not_a_clash(auth_client, user):
    """The account screen submits every field on every save, so this is the
    ordinary path and not an edge case."""
    response = auth_client(user).patch(
        reverse('profile-detail'), {'email': user.email, 'bio': 'unchanged address'}
    )

    assert response.status_code == 200
    assert response.data['bio'] == 'unchanged address'
