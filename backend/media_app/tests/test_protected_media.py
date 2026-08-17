"""A-1 — uploads are reachable by a signed link and by nothing else.

`nginx` used to alias `/media/` off the shared volume, so the *bytes* of every
attachment were public while `MediaDetailView` carefully scoped the *metadata*.
A private DM photo was one guessed path away from anybody at all.

The check cannot be an ordinary login: the SPA renders attachments and avatars
in `<img>` and `<video>` tags, which send no `Authorization` header. So the
token in the URL is the credential, and the tests that matter are the negative
ones — the same path without it, and with a token somebody made up.

Every request below is made by an **unauthenticated** client on purpose. That
is what a browser fetching an `<img>` looks like.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from common import signed_media
from media_app.models import MediaFile

# A real 1x1 PNG: `Profile.avatar` is an `ImageField`, so Pillow opens it.
PNG = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
    b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00'
    b'\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
)


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


@pytest.fixture
def stored(db, user):
    return MediaFile.objects.create(
        user=user, file=SimpleUploadedFile('audit.png', PNG, content_type='image/png')
    )


def unsigned(stored):
    """The URL as it was before A-1: the path, with no token."""
    return stored.file.url


@pytest.mark.django_db
def test_the_bare_path_is_refused(api_client, stored):
    """The exact reproduction in the audit: fetch the file with no credential."""
    response = api_client.get(unsigned(stored))

    assert response.status_code == 403


@pytest.mark.django_db
def test_a_made_up_token_is_refused(api_client, stored):
    response = api_client.get(f'{unsigned(stored)}?s=1:not-a-real-signature')

    assert response.status_code == 403


@pytest.mark.django_db
def test_a_token_minted_for_another_file_is_refused(api_client, stored, user):
    other = MediaFile.objects.create(
        user=user, file=SimpleUploadedFile('other.png', PNG, content_type='image/png')
    )
    token = signed_media.sign(other.file.name)

    assert api_client.get(f'{unsigned(stored)}?s={token}').status_code == 403


@pytest.mark.django_db
def test_an_expired_token_is_refused(api_client, stored, settings):
    settings.MEDIA_URL_TTL = -1
    token = signed_media.sign(stored.file.name)

    assert api_client.get(f'{unsigned(stored)}?s={token}').status_code == 403


@pytest.mark.django_db
def test_a_signed_link_is_served_by_nginx_not_by_daphne(api_client, stored, settings):
    """The success path. Django authorises and answers empty; the
    `X-Accel-Redirect` is what makes nginx open the file from the volume."""
    response = api_client.get(f'{unsigned(stored)}?s={signed_media.sign(stored.file.name)}')

    assert response.status_code == 200
    assert response['X-Accel-Redirect'] == settings.MEDIA_INTERNAL_LOCATION + stored.file.name
    assert response['Content-Type'] == 'image/png'
    assert response['X-Content-Type-Options'] == 'nosniff'
    assert response.content == b''


@pytest.mark.django_db
def test_without_nginx_the_bytes_come_back_directly(api_client, stored, settings):
    """`npm run dev` against a bare runserver has nothing to honour the header."""
    settings.MEDIA_INTERNAL_REDIRECT = False

    response = api_client.get(f'{unsigned(stored)}?s={signed_media.sign(stored.file.name)}')

    assert response.status_code == 200
    assert b''.join(response.streaming_content) == PNG


@pytest.mark.django_db
def test_the_path_cannot_walk_out_of_the_volume(api_client):
    escape = '../../etc/passwd'
    response = api_client.get(f'/media/{escape}?s={signed_media.sign(escape)}')

    assert response.status_code == 404


# --- the URL the API actually hands out ---------------------------------


@pytest.mark.django_db
def test_the_api_renders_an_attachment_url_that_works(auth_client, user, stored):
    """End to end: read the record, take the URL out of it, fetch it with no
    session at all. This is exactly what the browser does with an `<img>`."""
    rendered = auth_client(user).get(f'/api/media/{stored.pk}/').data['file']

    assert f'{signed_media.TOKEN_PARAM}=' in rendered

    from rest_framework.test import APIClient  # a client with no credential
    assert APIClient().get(rendered).status_code == 200


@pytest.mark.django_db
def test_an_avatar_url_is_signed_too(auth_client, user):
    """Not only attachments — every file the API renders goes through the same
    field, which is the reason the signing lives in `common/`."""
    auth_client(user).patch(
        '/api/profile/',
        {'avatar': SimpleUploadedFile('me.png', PNG, content_type='image/png')},
        format='multipart',
    )

    avatar = auth_client(user).get('/api/profile/').data['avatar']

    assert avatar and f'{signed_media.TOKEN_PARAM}=' in avatar
