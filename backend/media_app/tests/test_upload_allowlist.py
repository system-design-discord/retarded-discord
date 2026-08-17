"""A-5 — what may be uploaded is what the product knows how to name.

`MediaFileSerializer.validate_file` allowed seven extensions while
`MediaFile.save()` had classification branches for twelve, so the branches for
`.gif`, `.avi`, `.mov`, `.wav` and `.ogg` were unreachable — the serializer
refused the file before the classifier ever saw it. `doc.tex` §4.7 and US-7.1
both say "images, videos, audio, or files" without qualification, and a `.wav`
voice note, a `.mov` off an iPhone and an animated `.gif` are all three of
those.

The test that matters is not any one extension: it is that the two lists cannot
disagree again, because there is now only one.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from media_app.models import EXTENSION_TYPES, MediaFile

UPLOAD_URL = '/api/media/upload/'


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


def upload(client, filename):
    return client.post(
        UPLOAD_URL,
        {'file': SimpleUploadedFile(filename, b'bytes-enough-to-be-a-file')},
        format='multipart',
    )


@pytest.mark.parametrize(
    ('filename', 'kind'),
    [
        ('animated.gif', 'image'),
        ('voice-note.wav', 'audio'),
        ('from-a-phone.mov', 'video'),
        ('recording.ogg', 'audio'),
        ('clip.avi', 'video'),
    ],
)
@pytest.mark.django_db
def test_the_formats_the_classifier_names_are_accepted(auth_client, user, filename, kind):
    """Each of these was `400 File type not allowed` before A-5."""
    response = upload(auth_client(user), filename)

    assert response.status_code == 201, response.data
    assert response.data['file_type'] == kind


@pytest.mark.parametrize('filename', ['photo.jpg', 'photo.jpeg', 'shot.png', 'clip.mp4',
                                      'song.mp3', 'brief.pdf', 'bundle.zip'])
@pytest.mark.django_db
def test_the_formats_that_already_worked_still_do(auth_client, user, filename):
    assert upload(auth_client(user), filename).status_code == 201


@pytest.mark.django_db
def test_an_unlisted_extension_is_still_refused(auth_client, user):
    response = upload(auth_client(user), 'installer.exe')

    assert response.status_code == 400
    assert 'file' in response.data


@pytest.mark.django_db
def test_the_allowlist_and_the_classifier_are_one_table(auth_client, user):
    """The regression guard. If somebody adds a branch without adding a key —
    or the other way round — this is what fails, rather than a user."""
    for extension, kind in EXTENSION_TYPES.items():
        response = upload(auth_client(user), f'sample{extension}')
        assert response.status_code == 201, (extension, response.data)
        assert response.data['file_type'] == kind, extension


@pytest.mark.django_db
def test_an_unknown_extension_that_slips_past_the_api_is_still_classified(user, settings, tmp_path):
    """`save()` is reachable outside the serializer — the seed command uses it —
    so it keeps a default rather than leaving `file_type` empty."""
    settings.MEDIA_ROOT = tmp_path
    stored = MediaFile.objects.create(
        user=user, file=SimpleUploadedFile('notes.txt', b'plain text')
    )

    assert stored.file_type == 'document'
