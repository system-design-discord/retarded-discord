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


# --------------------------------------------- the change is announced (#RT)

def _capture(event):
    """Subscribe a recorder to one event and hand back its list. Restored
    afterwards by `conftest.isolated_event_subscribers`."""
    from common import events

    seen = []
    events.subscribe(event, lambda **payload: seen.append(payload))
    return seen


@pytest.mark.django_db
def test_updating_a_profile_announces_it_on_the_seam(auth_client, user):
    """The defect behind "profile updates do not show without a refresh".

    A username and an avatar are rendered on every screen that has ever
    mentioned this person, and each of those screens was holding a copy taken
    when it loaded. Nothing invalidated them.
    """
    from common import events

    seen = _capture(events.PROFILE_UPDATED)

    response = auth_client(user).patch(
        '/api/profile/', {'bio': 'now with a bio'}, format='json'
    )

    assert response.status_code == 200
    assert len(seen) == 1
    assert seen[0]['user_id'] == user.pk
    assert seen[0]['payload']['bio'] == 'now with a bio'


@pytest.mark.django_db
def test_the_announcement_carries_only_public_fields(auth_client, user):
    """It goes to **every** connected client, so it must be what a stranger may
    see — `PublicProfileSerializer` and never `ProfileSerializer`, which carries
    the caller's own email and their invitation setting."""
    from common import events

    seen = _capture(events.PROFILE_UPDATED)

    auth_client(user).patch('/api/profile/', {'bio': 'hello'}, format='json')

    payload = seen[0]['payload']
    assert set(payload) == {'user', 'bio', 'avatar'}
    assert 'email' not in payload
    assert 'allow_invites' not in payload
    assert user.email not in str(payload)


@pytest.mark.django_db
def test_a_failing_subscriber_does_not_fail_the_update(auth_client, user):
    """`events.publish` logs and swallows: a gateway that is down costs the
    live push and nothing else. The row is already saved."""
    from common import events

    def explode(**_):
        raise RuntimeError('the gateway is down')

    events.subscribe(events.PROFILE_UPDATED, explode)

    response = auth_client(user).patch('/api/profile/', {'bio': 'saved'}, format='json')

    assert response.status_code == 200
    assert response.data['bio'] == 'saved'


# --- taking the picture away ------------------------------------------------
#
# The API has accepted this for as long as it has accepted an upload —
# `avatar` is `allow_null=True` and the hand-written `update()` writes a `None`
# straight through — and no test had ever said so, which is part of why no
# screen offered it. A file input can say "unchanged" or "here is a file" and
# never "none", so the SPA needed a control of its own; this is the end it was
# aimed at.


def _with_avatar(client):
    """Give the caller a picture, and answer the URL it came back as."""
    from django.core.files.uploadedfile import SimpleUploadedFile

    # The smallest thing `ImageField` will accept — a 1×1 GIF. `validate_file`
    # is a serializer rule on `MediaFile`, not on `Profile`, so the extension
    # allowlist is not in play here.
    gif = SimpleUploadedFile(
        'face.gif',
        b'GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!'
        b'\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00'
        b'\x00\x02\x02D\x01\x00;',
        content_type='image/gif',
    )
    response = client.patch('/api/profile/', {'avatar': gif}, format='multipart')
    assert response.status_code == 200
    assert response.data['avatar']
    return response.data['avatar']


@pytest.mark.django_db
def test_an_explicit_null_clears_the_avatar(auth_client, user):
    client = auth_client(user)
    _with_avatar(client)

    response = client.patch('/api/profile/', {'avatar': None}, format='json')

    assert response.status_code == 200
    assert response.data['avatar'] is None
    assert client.get('/api/profile/').data['avatar'] is None


@pytest.mark.django_db
def test_omitting_the_key_leaves_the_avatar_alone(auth_client, user):
    """The half that makes a partial PATCH safe.

    `update()` reads `validated_data.get('avatar', instance.avatar)`, so a
    request that only renames must not take the picture with it — otherwise
    every screen that PATCHes one field is a silent avatar delete.
    """
    client = auth_client(user)
    stored = _with_avatar(client)

    response = client.patch('/api/profile/', {'bio': 'unrelated'}, format='json')

    assert response.status_code == 200
    assert response.data['avatar'] == stored


@pytest.mark.django_db
def test_clearing_the_avatar_announces_it_on_the_seam(auth_client, user):
    """A removal is as visible to other people as an upload was.

    `PROFILE_UPDATED` is fanned out to every connected socket and the SPA
    re-reads on it, so this is what stops a deleted picture surviving on
    everybody else's screen until they reload.
    """
    from common import events

    client = auth_client(user)
    _with_avatar(client)

    seen = []
    events.subscribe(events.PROFILE_UPDATED, lambda **payload: seen.append(payload))

    client.patch('/api/profile/', {'avatar': None}, format='json')

    assert len(seen) == 1
    assert seen[0]['user_id'] == user.pk
    assert seen[0]['payload']['avatar'] is None
