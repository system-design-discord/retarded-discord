"""A-8 — a message needs something in it.

`MessageSerializer.validate` enforced exactly one *target* and never required
any *content*, so `POST /api/messages/ {"recipient": 21, "text": ""}` answered
201. The row was created, an empty bubble rendered, and a "New message from …"
notification fired for nothing.

The SPA's composer has always guarded this client-side — its rule is "text *or*
a file" — so only a direct API call ever reached it. That is the reason the
check belongs here rather than staying a property of one client: the serializer
already owns "what shape is a valid message", and it is where the target rule
lives.

The rule is **text or media**, not text. `Message.text` is nullable on purpose
(#123) and a media-only message is valid; the second half of this file is what
stops the fix breaking the paperclip.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from groups_app.models import Group
from media_app.models import MediaFile
from messaging.models import Message

URL = '/api/messages/'


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


@pytest.mark.django_db
def test_an_empty_string_is_refused(auth_client, user, other_user):
    """The audit's reproduction, verbatim."""
    response = auth_client(user).post(URL, {'recipient': other_user.pk, 'text': ''})

    assert response.status_code == 400
    assert not Message.objects.exists()


@pytest.mark.django_db
def test_a_missing_text_is_refused(auth_client, user, other_user):
    response = auth_client(user).post(URL, {'recipient': other_user.pk})

    assert response.status_code == 400
    assert not Message.objects.exists()


@pytest.mark.django_db
def test_whitespace_is_not_content(auth_client, user, other_user):
    response = auth_client(user).post(URL, {'recipient': other_user.pk, 'text': '   \n\t '})

    assert response.status_code == 400


@pytest.mark.django_db
def test_the_refusal_applies_to_all_three_targets(auth_client, user, other_user):
    group = Group.objects.create_with_admin(admin=user, name='team')

    assert auth_client(user).post(URL, {'recipient': other_user.pk, 'text': ''}).status_code == 400
    assert auth_client(user).post(URL, {'group': group.pk, 'text': ''}).status_code == 400


@pytest.mark.django_db
def test_no_notification_is_generated_for_a_message_that_was_refused(auth_client, user, other_user):
    """The visible half of the defect: an empty bubble is odd, an alert about
    an empty bubble is worse."""
    from notifications.models import Notification

    auth_client(user).post(URL, {'recipient': other_user.pk, 'text': ''})

    assert not Notification.objects.filter(user=other_user).exists()


# --- and what must keep working -----------------------------------------


@pytest.mark.django_db
def test_ordinary_text_is_untouched(auth_client, user, other_user):
    response = auth_client(user).post(URL, {'recipient': other_user.pk, 'text': 'hello'})

    assert response.status_code == 201


@pytest.mark.django_db
def test_a_media_only_message_is_still_valid(auth_client, user, other_user):
    """`Message.text` is nullable and the composer's rule is "text *or* a
    file" — an image with no caption is a message."""
    media = MediaFile.objects.create(
        user=user, file=SimpleUploadedFile('shot.png', b'\x89PNG-ish')
    )

    response = auth_client(user).post(
        URL, {'recipient': other_user.pk, 'media_id': media.pk}
    )

    assert response.status_code == 201, response.data
    assert response.data['media']['id'] == media.pk


@pytest.mark.django_db
def test_an_edit_to_empty_is_still_the_edit_serializers_business(auth_client, user, other_user):
    """`MessageEditSerializer` has always had its own `validate_text`; the new
    rule must not double up on it or change its answer."""
    message = Message.objects.create(sender=user, recipient=other_user, text='hello')

    response = auth_client(user).patch(f'{URL}{message.pk}/', {'text': '  '})

    assert response.status_code == 400
    message.refresh_from_db()
    assert message.text == 'hello'


@pytest.mark.django_db
def test_a_scheduled_message_still_needs_content_too(auth_client, user, other_user):
    """`scheduling` writes through the same shape, so it inherits the rule."""
    from django.utils import timezone

    later = (timezone.now() + timezone.timedelta(hours=1)).isoformat()
    response = auth_client(user).post(
        reverse('scheduled-message-create'),
        {'recipient': other_user.pk, 'text': '', 'scheduled_at': later},
    )

    assert response.status_code == 400
