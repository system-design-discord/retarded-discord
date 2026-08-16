"""#128 — `auth/login/` accepts an email address or a username.

Registration requires an email, and the login wireframe labels its field *Email
or Username*. The stock `TokenObtainPairView` underneath accepted only
`User.USERNAME_FIELD`, so a user who typed the address they had just registered
with was told their credentials were invalid — the same sentence a wrong
password earns.

The resolution happens before `authenticate()`, so these tests are as much
about what did *not* change: a wrong password is still refused, an inactive
account is still refused, and the reply is still a token pair.
"""

import pytest
from django.urls import reverse

PASSWORD = 'testpass123'


@pytest.fixture
def member(user_factory):
    return user_factory('dana', email='dana@example.test', password=PASSWORD)


def login(client, identifier, password=PASSWORD):
    return client.post(reverse('token_obtain_pair'), {'username': identifier, 'password': password})


@pytest.mark.django_db
def test_a_username_still_logs_in(api_client, member):
    response = login(api_client, member.username)

    assert response.status_code == 200
    assert 'access' in response.data and 'refresh' in response.data


@pytest.mark.django_db
def test_the_registered_email_also_logs_in(api_client, member):
    response = login(api_client, member.email)

    assert response.status_code == 200
    assert 'access' in response.data and 'refresh' in response.data


@pytest.mark.django_db
def test_the_email_lookup_ignores_case(api_client, member):
    response = login(api_client, member.email.upper())

    assert response.status_code == 200


@pytest.mark.django_db
def test_the_right_email_with_the_wrong_password_is_refused(api_client, member):
    """Resolving the identifier must not resolve the password with it."""
    response = login(api_client, member.email, password='not-the-password')

    assert response.status_code == 401


@pytest.mark.django_db
def test_an_unknown_email_is_refused(api_client, member):
    response = login(api_client, 'nobody@example.test')

    assert response.status_code == 401


@pytest.mark.django_db
def test_an_email_belonging_to_one_user_never_logs_in_another(api_client, member, user_factory):
    """The lookup rewrites the identifier, so a mistake here would authenticate
    the wrong account entirely rather than merely failing."""
    user_factory('eve', email='eve@example.test', password=PASSWORD)

    response = login(api_client, 'eve@example.test')

    assert response.status_code == 200

    me = api_client.get(
        reverse('auth-me'), HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}'
    )
    assert me.data['username'] == 'eve'


@pytest.mark.django_db
def test_a_deactivated_account_is_still_refused_by_email(api_client, member):
    """The lookup runs before `authenticate()`, which is what keeps `is_active`
    and every password validator on the stock path."""
    member.is_active = False
    member.save(update_fields=['is_active'])

    assert login(api_client, member.email).status_code == 401
    assert login(api_client, member.username).status_code == 401
