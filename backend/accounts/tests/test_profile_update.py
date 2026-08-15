"""The own-profile read and write — #96, #97 and #130's serializer half.

Three of these assert something *negative* and are here for that reason: the
bugs they cover were all "the screen asked the wrong endpoint and nobody
noticed", so the tests pin which route answers what rather than only that a
happy path works.
"""

import pytest
from django.urls import reverse

from accounts.models import Profile
from accounts.serializers import BIO_MAX_LENGTH
from common import messages


@pytest.mark.django_db
def test_own_profile_carries_the_bio(auth_client, user):
    """#97 — `auth/me/` omits it, so the screen must read this one."""
    Profile.objects.create(user=user, bio='backend, mostly')

    response = auth_client(user).get(reverse('profile-detail'))

    assert response.status_code == 200
    assert response.data['bio'] == 'backend, mostly'


@pytest.mark.django_db
def test_auth_me_still_answers_405_to_a_patch(auth_client, user):
    """#96 — the distinction the whole card rests on. `MeView` is read-only and
    is meant to stay that way; widening it is what #97 advises against."""
    response = auth_client(user).patch(reverse('auth-me'), {'bio': 'nope'}, format='json')

    assert response.status_code == 405


@pytest.mark.django_db
def test_patching_the_profile_saves_the_bio(auth_client, user):
    response = auth_client(user).patch(
        reverse('profile-detail'), {'bio': 'hello'}, format='json'
    )

    assert response.status_code == 200
    assert response.data['bio'] == 'hello'
    assert Profile.objects.get(user=user).bio == 'hello'


@pytest.mark.django_db
def test_a_bio_at_the_limit_is_accepted(auth_client, user):
    response = auth_client(user).patch(
        reverse('profile-detail'), {'bio': 'x' * BIO_MAX_LENGTH}, format='json'
    )

    assert response.status_code == 200


@pytest.mark.django_db
def test_a_bio_over_the_limit_is_refused(auth_client, user):
    """#130 — the wireframe counts down from 200 and nothing enforced it."""
    response = auth_client(user).patch(
        reverse('profile-detail'), {'bio': 'x' * (BIO_MAX_LENGTH + 1)}, format='json'
    )

    assert response.status_code == 400
    assert response.data['bio'] == [messages.BIO_TOO_LONG.format(limit=BIO_MAX_LENGTH)]


@pytest.mark.django_db
def test_patching_the_profile_renames_the_user(auth_client, user):
    """The serializer has always written this; #130 is what puts it on screen."""
    response = auth_client(user).patch(
        reverse('profile-detail'), {'username': 'renamed'}, format='json'
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.username == 'renamed'


@pytest.mark.django_db
def test_a_taken_username_is_a_400_not_a_500(auth_client, user, other_user):
    """`update()` assigns straight onto `user.username`, so an unvalidated
    duplicate is an IntegrityError rather than something a screen can show."""
    response = auth_client(user).patch(
        reverse('profile-detail'), {'username': other_user.username}, format='json'
    )

    assert response.status_code == 400
    assert response.data['username'] == [messages.USERNAME_TAKEN]
    user.refresh_from_db()
    assert user.username == 'alice'


@pytest.mark.django_db
def test_keeping_your_own_username_is_not_a_clash(auth_client, user):
    """UniqueValidator excludes the instance under edit — but this serializer's
    instance is the `Profile`, not the `User`, so it is worth pinning."""
    response = auth_client(user).patch(
        reverse('profile-detail'),
        {'username': user.username, 'bio': 'unchanged name'},
        format='json',
    )

    assert response.status_code == 200
