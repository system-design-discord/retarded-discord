"""M-03 — another user's profile shows display fields only (US-10.2).

The acceptance criterion is negative: *never* email, password hash or privacy
flags. A negative criterion is exactly the kind that passes by accident today
and regresses the next time somebody adds a column, so it is asserted against
the whole payload rather than field by field.
"""

import pytest
from django.urls import reverse

from accounts.models import Profile

# Everything the public shape is allowed to contain. Anything else appearing
# here should be a deliberate decision, which means editing this line.
PUBLIC_FIELDS = {'user', 'bio', 'avatar'}

# Two of these leak today if ProfileSerializer is reused by mistake; the third
# never has, and is listed so a future `fields = '__all__'` is caught too.
PRIVATE_FIELDS = {'email', 'allow_invites', 'password'}


@pytest.fixture
def stranger(user_factory):
    other = user_factory('carol', email='carol@example.test')
    Profile.objects.create(user=other, bio='hello', allow_invites=False)
    return other


@pytest.mark.django_db
def test_public_profile_carries_display_fields_only(auth_client, user, stranger):
    response = auth_client(user).get(reverse('profile-other', args=[stranger.pk]))

    assert response.status_code == 200
    assert set(response.data) == PUBLIC_FIELDS
    # `avatar` on the nested user is deliberate: `PublicUserSerializer` is what
    # every member list and message bubble renders a face from, and it is the
    # same picture this endpoint already returns one level up. The point of
    # asserting the whole set is that adding to it is a decision, not that the
    # set never changes.
    assert set(response.data['user']) == {'id', 'username', 'avatar'}


@pytest.mark.django_db
def test_public_profile_never_leaks_a_private_field(auth_client, user, stranger):
    response = auth_client(user).get(reverse('profile-other', args=[stranger.pk]))

    body = str(response.data)
    for field in PRIVATE_FIELDS:
        assert field not in response.data
    assert stranger.email not in body


@pytest.mark.django_db
def test_unknown_user_is_404(auth_client, user):
    response = auth_client(user).get(reverse('profile-other', args=[999999]))

    assert response.status_code == 404


@pytest.mark.django_db
def test_a_user_who_never_edited_their_profile_still_resolves(auth_client, user, other_user):
    """Profile rows are created lazily, so a freshly registered user has none.

    Looking the profile up directly would 404 on a real user, which is the
    opposite of what the story asks for.
    """
    assert not Profile.objects.filter(user=other_user).exists()

    response = auth_client(user).get(reverse('profile-other', args=[other_user.pk]))

    assert response.status_code == 200
    assert response.data['user']['username'] == other_user.username


@pytest.mark.django_db
def test_your_own_profile_still_carries_your_email(auth_client, user):
    """The public serializer must not have been swapped in everywhere."""
    response = auth_client(user).get(reverse('profile-detail'))

    assert response.status_code == 200
    assert response.data['email'] == user.email
