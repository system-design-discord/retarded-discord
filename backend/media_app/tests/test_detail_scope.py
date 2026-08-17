"""A-6 — the media record is scoped to the conversation, all three kinds of it.

`MediaDetailView.get_queryset` admitted the uploader, a message's sender, a DM
recipient and group members, and had no clause for a channel topic. So the owner
posted an image in a topic, a channel member who could read that message asked
for the file's record, and got `404 No MediaFile matches the given query`. The
card that scoped this view described it as "access-scoped to the conversation";
the topic conversation was the one it did not cover.

The second half of this file is not from the audit. Widening a scope on a
`RetrieveDestroyAPIView` widens `DELETE` along with `GET`, and reading a file
somebody shared with you is not the same right as destroying it — so the
uploader-only guard is pinned here beside the widening that made it matter.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from channels_app.models import Channel, ChannelMember, Topic
from groups_app.models import Group
from media_app.models import MediaFile
from messaging.models import Message


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path


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
def attachment(db, owner):
    return MediaFile.objects.create(
        user=owner, file=SimpleUploadedFile('diagram.png', b'\x89PNG-ish')
    )


def url(media):
    return f'/api/media/{media.pk}/'


# --- the defect ---------------------------------------------------------


@pytest.mark.django_db
def test_a_channel_member_reads_a_topic_attachments_record(auth_client, owner, member, attachment):
    channel = Channel.objects.create_with_owner(owner=owner, name='general')
    ChannelMember.objects.create(channel=channel, user=member)
    topic = Topic.objects.create(channel=channel, name='architecture')
    Message.objects.create(sender=owner, topic=topic, text='here it is', media=attachment)

    response = auth_client(member).get(url(attachment))

    assert response.status_code == 200
    assert response.data['id'] == attachment.pk


@pytest.mark.django_db
def test_the_channel_owner_reads_it_even_without_a_membership_row(auth_client, owner, member, attachment):
    """`_audience` carries both clauses because owning a channel and holding a
    membership row are not the same thing."""
    channel = Channel.objects.create_with_owner(owner=owner, name='general')
    topic = Topic.objects.create(channel=channel, name='architecture')
    poster = MediaFile.objects.create(
        user=member, file=SimpleUploadedFile('theirs.png', b'\x89PNG-ish')
    )
    ChannelMember.objects.create(channel=channel, user=member)
    Message.objects.create(sender=member, topic=topic, text='mine', media=poster)

    assert auth_client(owner).get(url(poster)).status_code == 200


@pytest.mark.django_db
def test_someone_outside_the_channel_still_gets_nothing(auth_client, owner, outsider, attachment):
    channel = Channel.objects.create_with_owner(owner=owner, name='private')
    topic = Topic.objects.create(channel=channel, name='plans')
    Message.objects.create(sender=owner, topic=topic, text='secret', media=attachment)

    assert auth_client(outsider).get(url(attachment)).status_code == 404


@pytest.mark.django_db
def test_the_other_two_conversation_kinds_did_not_regress(auth_client, owner, member, outsider):
    dm_file = MediaFile.objects.create(user=owner, file=SimpleUploadedFile('dm.png', b'x'))
    Message.objects.create(sender=owner, recipient=member, text='for you', media=dm_file)

    group = Group.objects.create_with_admin(admin=owner, name='team')
    group.members.add(member)
    group_file = MediaFile.objects.create(user=owner, file=SimpleUploadedFile('g.png', b'x'))
    Message.objects.create(sender=owner, group=group, text='for us', media=group_file)

    assert auth_client(member).get(url(dm_file)).status_code == 200
    assert auth_client(member).get(url(group_file)).status_code == 200
    assert auth_client(outsider).get(url(dm_file)).status_code == 404
    assert auth_client(outsider).get(url(group_file)).status_code == 404


# --- reading is not destroying ------------------------------------------


@pytest.mark.django_db
def test_a_reader_cannot_delete_what_somebody_else_uploaded(auth_client, owner, member, attachment):
    """The hole A-6 would otherwise have widened: everyone the queryset admits
    reaches `DELETE` on the same URL."""
    channel = Channel.objects.create_with_owner(owner=owner, name='general')
    ChannelMember.objects.create(channel=channel, user=member)
    topic = Topic.objects.create(channel=channel, name='architecture')
    Message.objects.create(sender=owner, topic=topic, text='here it is', media=attachment)

    response = auth_client(member).delete(url(attachment))

    assert response.status_code == 403
    assert MediaFile.objects.filter(pk=attachment.pk).exists()


@pytest.mark.django_db
def test_a_dm_recipient_cannot_delete_the_photo_they_were_sent(auth_client, owner, member, attachment):
    Message.objects.create(sender=owner, recipient=member, text='for you', media=attachment)

    assert auth_client(member).delete(url(attachment)).status_code == 403


@pytest.mark.django_db
def test_the_uploader_can_still_delete_their_own(auth_client, owner, attachment):
    assert auth_client(owner).delete(url(attachment)).status_code == 204
    assert not MediaFile.objects.filter(pk=attachment.pk).exists()
