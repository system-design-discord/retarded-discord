"""R-05 — who may delete a message. US-3.3 to US-3.6, US-4.6 and US-5.3.

The matrix INT-2 also runs by hand against the live API. Every case here goes
through the endpoint rather than calling the service directly, because the
acceptance criterion is that the *server* refuses, not that a helper returns
False.
"""

import pytest

from channels_app.models import Channel, ChannelMember, Topic
from groups_app.models import Group
from messaging.models import Message
from roles.models import Role


@pytest.fixture
def outsider(user_factory):
    return user_factory('outsider')


@pytest.fixture
def group(db, user, other_user):
    """`user` is the admin; `other_user` is a plain member."""
    g = Group.objects.create(name='team', admin=user)
    g.members.add(user, other_user)
    return g


@pytest.fixture
def channel(db, user):
    """`user` owns it, so `roles` treats them as holding all eight."""
    return Channel.objects.create(owner=user, name='general')


@pytest.fixture
def topic(channel):
    return Topic.objects.create(channel=channel, name='announcements')


@pytest.fixture
def moderator(user_factory, channel):
    """A member whose role grants exactly `can_delete_message` and nothing else."""
    person = user_factory('moderator')
    role = Role.objects.create(channel=channel, name='Moderator', can_delete_message=True)
    ChannelMember.objects.create(user=person, channel=channel, role=role)
    return person


@pytest.fixture
def plain_member(user_factory, channel):
    """A member with no role at all — holds nothing privileged."""
    person = user_factory('plain')
    ChannelMember.objects.create(user=person, channel=channel, role=None)
    return person


def delete(auth_client, as_user, message):
    return auth_client(as_user).delete(f'/api/messages/{message.pk}/')


# --- US-3.3: the author, in all three contexts ----------------------------


@pytest.mark.django_db
def test_the_author_may_delete_their_own_direct_message(auth_client, user, other_user):
    message = Message.objects.create(sender=user, recipient=other_user, text='oops')

    assert delete(auth_client, user, message).status_code == 204
    assert not Message.objects.filter(pk=message.pk).exists()


@pytest.mark.django_db
def test_the_author_may_delete_their_own_group_message(auth_client, other_user, group):
    message = Message.objects.create(sender=other_user, group=group, text='oops')

    assert delete(auth_client, other_user, message).status_code == 204


@pytest.mark.django_db
def test_the_author_may_delete_their_own_topic_message(auth_client, plain_member, topic):
    """Even with no role: authorship is not a permission that can be revoked."""
    message = Message.objects.create(sender=plain_member, topic=topic, text='oops')

    assert delete(auth_client, plain_member, message).status_code == 204


# --- US-3.5 / US-5.3: the group admin -------------------------------------


@pytest.mark.django_db
def test_the_group_admin_may_delete_a_members_message(auth_client, user, other_user, group):
    message = Message.objects.create(sender=other_user, group=group, text='spam')

    assert delete(auth_client, user, message).status_code == 204


@pytest.mark.django_db
def test_a_plain_group_member_may_not_delete_someone_elses_message(
    auth_client, user, other_user, group
):
    message = Message.objects.create(sender=user, group=group, text='keep me')

    assert delete(auth_client, other_user, message).status_code == 403
    assert Message.objects.filter(pk=message.pk).exists()


# --- US-3.4 / US-3.6 / US-4.6: the channel -------------------------------


@pytest.mark.django_db
def test_the_channel_owner_may_delete_any_message(auth_client, user, plain_member, topic):
    """US-3.4. The owner holds all eight implicitly — never a row that can be
    revoked by editing a role."""
    message = Message.objects.create(sender=plain_member, topic=topic, text='spam')

    assert delete(auth_client, user, message).status_code == 204


@pytest.mark.django_db
def test_a_member_holding_the_permission_may_delete_any_message(
    auth_client, moderator, plain_member, topic
):
    """US-3.6 — the permission, not ownership, is what grants it."""
    message = Message.objects.create(sender=plain_member, topic=topic, text='spam')

    assert delete(auth_client, moderator, message).status_code == 204


@pytest.mark.django_db
def test_a_channel_member_without_the_permission_may_not(
    auth_client, moderator, plain_member, topic
):
    message = Message.objects.create(sender=moderator, topic=topic, text='keep me')

    assert delete(auth_client, plain_member, message).status_code == 403
    assert Message.objects.filter(pk=message.pk).exists()


@pytest.mark.django_db
def test_revoking_the_permission_takes_effect_on_the_next_request(
    auth_client, moderator, plain_member, topic
):
    """Brief §5.8 — access levels change without editing code. No restart, no
    deploy, no cache: the very next request sees the new row."""
    first = Message.objects.create(sender=plain_member, topic=topic, text='one')
    second = Message.objects.create(sender=plain_member, topic=topic, text='two')

    assert delete(auth_client, moderator, first).status_code == 204

    role = moderator.channel_memberships.get().role
    role.can_delete_message = False
    role.save()

    assert delete(auth_client, moderator, second).status_code == 403


# --- the cases that are 404, not 403 --------------------------------------


@pytest.mark.django_db
def test_a_non_member_of_a_channel_gets_404(auth_client, outsider, plain_member, topic):
    """Out of scope entirely: a 403 would confirm the message exists."""
    message = Message.objects.create(sender=plain_member, topic=topic, text='private')

    assert delete(auth_client, outsider, message).status_code == 404
    assert Message.objects.filter(pk=message.pk).exists()


@pytest.mark.django_db
def test_an_unauthenticated_caller_is_refused(api_client, user, other_user):
    message = Message.objects.create(sender=user, recipient=other_user, text='hi')

    assert api_client.delete(f'/api/messages/{message.pk}/').status_code == 401


# --- the direct-message rule ---------------------------------------------


@pytest.mark.django_db
def test_the_recipient_of_a_direct_message_may_not_delete_it(auth_client, user, other_user):
    """No admin and no roles exist in a DM, so only its author may delete it —
    a recipient deleting it would be rewriting somebody else's history."""
    message = Message.objects.create(sender=user, recipient=other_user, text='keep me')

    assert delete(auth_client, other_user, message).status_code == 403
    assert Message.objects.filter(pk=message.pk).exists()
