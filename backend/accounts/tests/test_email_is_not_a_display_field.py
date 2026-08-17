"""A-2 — an email address never leaves through a nested representation.

`PublicProfileSerializer`'s docstring already said it: *"Never `email` (theirs
to give out, not ours)"*. The field simply left through a different serializer.
`UserSerializer` carries `email` and was nested read-only into the group's
`admin` and `members`, every message's `sender`, the channel's `owner`, every
`ChannelMember.user` and every `MediaFile.user` — so any group member, channel
member or message recipient read everyone else's address, and the SPA printed
it next to their name on the group settings screen.

These tests are deliberately written against the *response body as a whole*
rather than against a field name. The defect was not that somebody wrote
`'email'` in the wrong list; it was that a shape carrying it got reused, and a
new reuse would slip past a field-name assertion.

Your own address is a different question and is still yours to read: the last
test here is the one that has to keep passing for `/settings/account` to work.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from channels_app.models import Channel, ChannelMember, Topic
from groups_app.models import Group
from media_app.models import MediaFile
from messaging.models import Message


@pytest.fixture
def nosy(user_factory):
    """A perfectly ordinary member — no role, no admin rights, nothing wrong
    with them except that they can read the response."""
    return user_factory('nosy')


@pytest.fixture
def target(user_factory):
    return user_factory('target', email='target-address@example.test')


@pytest.mark.django_db
def test_a_group_member_does_not_read_the_admins_address(auth_client, nosy, target):
    group = Group.objects.create_with_admin(admin=target, name='team')
    group.members.add(nosy)

    body = str(auth_client(nosy).get(f'/api/groups/{group.pk}/').data)

    assert target.email not in body


@pytest.mark.django_db
def test_a_group_member_does_not_read_another_members_address(auth_client, nosy, target, user):
    group = Group.objects.create_with_admin(admin=user, name='team')
    group.members.add(nosy, target)

    body = str(auth_client(nosy).get('/api/groups/').data)

    assert target.email not in body


@pytest.mark.django_db
def test_a_message_does_not_carry_its_senders_address(auth_client, nosy, target):
    Message.objects.create(sender=target, recipient=nosy, text='hello')

    body = str(auth_client(nosy).get('/api/messages/', {'user_id': target.pk}).data)

    assert target.email not in body


@pytest.mark.django_db
def test_a_channel_member_does_not_read_the_owners_address(auth_client, nosy, target):
    channel = Channel.objects.create_with_owner(owner=target, name='general')
    ChannelMember.objects.create(channel=channel, user=nosy)

    body = str(auth_client(nosy).get(f'/api/channels/{channel.pk}/').data)

    assert target.email not in body


@pytest.mark.django_db
def test_the_member_roster_does_not_carry_addresses(auth_client, nosy, target, user):
    channel = Channel.objects.create_with_owner(owner=user, name='general')
    ChannelMember.objects.create(channel=channel, user=nosy)
    ChannelMember.objects.create(channel=channel, user=target)

    body = str(auth_client(nosy).get(f'/api/channels/{channel.pk}/members/').data)

    assert target.email not in body


@pytest.mark.django_db
def test_an_attachment_does_not_carry_its_uploaders_address(auth_client, nosy, target, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    media = MediaFile.objects.create(
        user=target, file=SimpleUploadedFile('shared.pdf', b'%PDF-1.4', content_type='application/pdf')
    )
    Message.objects.create(sender=target, recipient=nosy, text='here', media=media)

    body = str(auth_client(nosy).get(f'/api/media/{media.pk}/').data)

    assert target.email not in body


@pytest.mark.django_db
def test_a_topic_message_does_not_carry_its_senders_address(auth_client, nosy, target):
    channel = Channel.objects.create_with_owner(owner=target, name='general')
    ChannelMember.objects.create(channel=channel, user=nosy)
    topic = Topic.objects.create(channel=channel, name='announcements')
    Message.objects.create(sender=target, topic=topic, text='hello')

    body = str(auth_client(nosy).get('/api/messages/', {'topic_id': topic.pk}).data)

    assert target.email not in body


# --- and the half that must not change ----------------------------------


@pytest.mark.django_db
def test_your_own_address_is_still_yours_to_read(auth_client, target):
    """`/settings/account` edits it, so `MeView` and the own-profile endpoint
    both still carry it. Narrowing those was never the fix."""
    assert auth_client(target).get('/api/auth/me/').data['email'] == target.email
    assert auth_client(target).get('/api/profile/').data['email'] == target.email
