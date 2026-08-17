"""Signed URLs for everything the API hands out as a file (A-1).

`nginx` used to alias `/media/` straight off the shared volume, so every
attachment ever uploaded — a private DM photo, a file in a closed channel — was
retrievable by anyone with the path, logged in or not.

The obvious fix, an authenticated Django view in front of the bytes, does not
work here on its own: the SPA authenticates with a Bearer JWT and an `<img>` or
`<video>` tag sends no `Authorization` header, so putting a login in front of
`/media/` would blank every avatar and every attachment in the product.

So the *URL* carries the authority instead. A serializer that renders a file
appends `?s=<token>`, an HMAC over the storage path with a timestamp;
`media_app.views.protected_media` verifies it and hands the bytes back to nginx
with `X-Accel-Redirect`. A guessed path is worthless without the token, and the
token expires, which is why the upload path can keep the user's original
filename instead of being scrambled into a UUID.

This lives in `common/` rather than in `media_app/` because four modules render
a file — `media_app` the attachments, `accounts` the profile avatar,
`groups_app` and `channels_app` theirs — and none of them should have to import
another domain to do it.
"""

from django.conf import settings
from django.core import signing
from rest_framework import serializers

# A dedicated salt so a token minted here cannot be replayed against any other
# signer in the project.
SALT = 'common.signed_media'

# The query parameter the view reads the token out of.
TOKEN_PARAM = 's'


def sign(name):
    """Return the token authorising `name`, the storage-relative path."""
    signer = signing.TimestampSigner(salt=SALT)
    return signer.sign(name).removeprefix(f'{name}{signer.sep}')


def verify(name, token, max_age=None):
    """True when `token` was minted for `name` and has not expired."""
    if not token:
        return False

    signer = signing.TimestampSigner(salt=SALT)
    try:
        signer.unsign(
            f'{name}{signer.sep}{token}',
            max_age=settings.MEDIA_URL_TTL if max_age is None else max_age,
        )
    except signing.BadSignature:
        # SignatureExpired subclasses BadSignature, so both refusals land here.
        return False
    return True


def signed_url(url, name):
    """Append the token for `name` to an already-rendered `url`."""
    separator = '&' if '?' in url else '?'
    return f'{url}{separator}{TOKEN_PARAM}={sign(name)}'


class SignedFileMixin:
    """Renders the parent field's URL, then signs it.

    Only the read side is touched, so upload validation — `ImageField`'s image
    check, the model's `validate_file_size` — is untouched.
    """

    def to_representation(self, value):
        representation = super().to_representation(value)
        if not representation or not getattr(value, 'name', None):
            return representation
        return signed_url(representation, value.name)


class SignedFileField(SignedFileMixin, serializers.FileField):
    pass


class SignedImageField(SignedFileMixin, serializers.ImageField):
    pass
