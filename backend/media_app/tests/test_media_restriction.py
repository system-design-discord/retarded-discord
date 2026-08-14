"""A-10 — the per-channel media restriction, at the API.

US-2.4 and US-7.3. `media_app` was the last module in the codebase that decided
access for itself; these are the first tests it has ever had, and what they pin
is that it no longer does — every refusal below comes from
`roles.services.require_send_media`.

The restriction has to be checked in **two** places and both are exercised here.
An upload names no conversation of its own, so `/api/media/upload/` can only be
gated when the caller volunteers a `topic`; a caller who does not volunteer one
would otherwise upload freely and then attach the result, which is why
`POST /api/messages/` checks again at attach time. Skip either and the other is
a bypass.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from channels_app.models import Channel, ChannelMember, Topic
from groups_app.models import Group
from media_app.models import MediaFile
from roles.models import Role

UPLOAD_URL = '/api/media/upload/'
MESSAGES_URL = '/api/messages/'
SCHEDULE_URL = '/api/messages/schedule/'


@pytest.fixture
def owner(user_factory):
    return user_factory('owner')


@pytest.fixture
def member(user_factory):
    return user_factory('member')


@pytest.fixture
def outsider(user_factory):
    return user_factory('outsider')


@pytest.fixture
def channel(db, owner):
    return Channel.objects.create_with_owner(owner=owner, name='general')


@pytest.fixture
def topic(channel):
    return Topic.objects.create(channel=channel, name='general')


@pytest.fixture
def plain_membership(channel, member):
    return ChannelMember.objects.create(user=member, channel=channel)


def grant(channel, user, **permissions):
    """Copied from `channels_app/tests/test_topic_api.py` — a member whose role
    grants exactly the permissions named."""
    role = Role.objects.create(channel=channel, name=f'role-{user.username}', **permissions)
    return ChannelMember.objects.create(user=user, channel=channel, role=role)


def restrict(channel):
    channel.media_restricted = True
    channel.save(update_fields=['media_restricted'])
    return channel


def a_file(name='shot.png'):
    """A fresh upload each call — a SimpleUploadedFile is consumed when read."""
    return SimpleUploadedFile(name, b'\x89PNG\r\n\x1a\n fake bytes', content_type='image/png')


def upload(client, user, **extra):
    client.force_authenticate(user=user)
    return client.post(UPLOAD_URL, {'file': a_file(), **extra}, format='multipart')


# --- the upload endpoint -------------------------------------------------


@pytest.mark.django_db
def test_an_unrestricted_channel_accepts_any_members_upload(
    api_client, member, plain_membership, topic
):
    """The default. No role, no restriction, no refusal."""
    response = upload(api_client, member, topic=topic.pk)

    assert response.status_code == 201


@pytest.mark.django_db
def test_a_restricted_channel_refuses_a_member_without_the_permission(
    api_client, channel, member, plain_membership, topic
):
    restrict(channel)

    response = upload(api_client, member, topic=topic.pk)

    assert response.status_code == 403
    assert MediaFile.objects.count() == 0


@pytest.mark.django_db
def test_a_restricted_channel_accepts_the_owner(api_client, channel, owner, topic):
    """US-7.3 — the channel admin is never refused. There is no owner branch in
    `may_send_media`; this passes through `has_permission`'s short-circuit."""
    restrict(channel)

    response = upload(api_client, owner, topic=topic.pk)

    assert response.status_code == 201


@pytest.mark.django_db
def test_a_restricted_channel_accepts_a_member_holding_the_permission(
    api_client, channel, member, topic
):
    restrict(channel)
    grant(channel, member, can_send_media=True)

    response = upload(api_client, member, topic=topic.pk)

    assert response.status_code == 201


@pytest.mark.django_db
def test_a_restricted_channel_refuses_a_non_member(api_client, channel, outsider, topic):
    restrict(channel)

    response = upload(api_client, outsider, topic=topic.pk)

    assert response.status_code in (403, 404)
    assert MediaFile.objects.count() == 0


@pytest.mark.django_db
def test_granting_the_permission_takes_effect_on_the_next_request(
    api_client, channel, member, plain_membership, topic
):
    """Brief §5.8 — no restart, no deploy. The same call answers differently as
    soon as the role row exists."""
    restrict(channel)
    assert upload(api_client, member, topic=topic.pk).status_code == 403

    plain_membership.role = Role.objects.create(
        channel=channel, name='ناظر', can_send_media=True
    )
    plain_membership.save(update_fields=['role'])

    assert upload(api_client, member, topic=topic.pk).status_code == 201


# --- DMs and groups are a different shape and must be unaffected ---------


@pytest.mark.django_db
@pytest.mark.parametrize('restricted', [False, True])
def test_an_upload_naming_no_topic_is_unaffected_by_any_restriction(
    api_client, channel, member, plain_membership, restricted
):
    """A DM or group upload names no topic, so it never reaches the channel
    rule — in either state of an unrelated channel the caller belongs to."""
    if restricted:
        restrict(channel)

    response = upload(api_client, member)

    assert response.status_code == 201


@pytest.mark.django_db
def test_attaching_to_a_dm_is_unaffected_by_a_restriction(
    api_client, channel, member, plain_membership, outsider
):
    restrict(channel)
    media = upload(api_client, member).data['id']

    api_client.force_authenticate(user=member)
    response = api_client.post(
        MESSAGES_URL, {'recipient': outsider.pk, 'text': 'hi', 'media_id': media}, format='json'
    )

    assert response.status_code == 201


@pytest.mark.django_db
def test_attaching_to_a_group_is_unaffected_by_a_restriction(
    api_client, channel, member, plain_membership
):
    """`GROUP_ADMIN_PERMISSIONS` excludes `can_send_media` on purpose, so a
    group upload routed through the channel rule would refuse every member
    including the admin. It must not be routed there at all."""
    restrict(channel)
    group = Group.objects.create_with_admin(admin=member, name='team')
    media = upload(api_client, member).data['id']

    api_client.force_authenticate(user=member)
    response = api_client.post(
        MESSAGES_URL, {'group': group.pk, 'text': 'hi', 'media_id': media}, format='json'
    )

    assert response.status_code == 201


# --- the attach-without-context bypass -----------------------------------


@pytest.mark.django_db
def test_uploading_without_a_topic_then_attaching_is_still_refused(
    api_client, channel, member, plain_membership, topic
):
    """The bypass this card exists to close. The upload declines to say where
    the file is going and is therefore allowed; the attach names the topic and
    is refused there."""
    restrict(channel)
    media = upload(api_client, member).data['id']

    api_client.force_authenticate(user=member)
    response = api_client.post(
        MESSAGES_URL, {'topic': topic.pk, 'text': 'hi', 'media_id': media}, format='json'
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_a_text_only_message_in_a_restricted_channel_is_still_allowed(
    api_client, channel, member, plain_membership, topic
):
    """The restriction is on media, not on posting. `user_stories_en.tex` is
    explicit that all channel members may exchange messages in topics."""
    restrict(channel)

    api_client.force_authenticate(user=member)
    response = api_client.post(
        MESSAGES_URL, {'topic': topic.pk, 'text': 'still fine'}, format='json'
    )

    assert response.status_code == 201


@pytest.mark.django_db
def test_scheduling_a_media_message_into_a_restricted_channel_is_refused(
    api_client, channel, member, plain_membership, topic
):
    """Otherwise scheduling one second out is a way round the restriction."""
    from django.utils import timezone

    restrict(channel)
    media = upload(api_client, member).data['id']
    when = (timezone.now() + timezone.timedelta(minutes=5)).isoformat()

    api_client.force_authenticate(user=member)
    response = api_client.post(
        SCHEDULE_URL,
        {'topic': topic.pk, 'text': 'later', 'media_id': media, 'scheduled_at': when},
        format='json',
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_scheduling_is_allowed_for_a_holder(api_client, channel, member, topic):
    from django.utils import timezone

    restrict(channel)
    grant(channel, member, can_send_media=True)
    media = upload(api_client, member).data['id']
    when = (timezone.now() + timezone.timedelta(minutes=5)).isoformat()

    api_client.force_authenticate(user=member)
    response = api_client.post(
        SCHEDULE_URL,
        {'topic': topic.pk, 'text': 'later', 'media_id': media, 'scheduled_at': when},
        format='json',
    )

    assert response.status_code == 201
