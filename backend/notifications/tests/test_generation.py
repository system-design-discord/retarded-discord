"""N-02, first half — notifications are generated *from events*, not from calls.

The acceptance criterion is architectural: "the notification is created by an
event emitted from the owning module, not by the messaging view calling
notifications directly". So these tests exercise the real endpoints and then
look at what appeared in the table, and one of them asserts the negative — that
no other module imports this one.
"""

import ast
import pathlib

import pytest

from channels_app.models import Channel, ChannelMember, Topic
from groups_app.models import Group
from notifications.models import Notification
from roles.models import Role

BACKEND = pathlib.Path(__file__).resolve().parents[2]


@pytest.fixture
def group(db, user, other_user):
    g = Group.objects.create_with_admin(admin=user, name='team')
    g.members.add(other_user)
    return g


@pytest.fixture
def channel(db, user):
    return Channel.objects.create_with_owner(owner=user, name='general')


@pytest.fixture
def topic(channel, other_user):
    ChannelMember.objects.create(channel=channel, user=other_user)
    return Topic.objects.create(channel=channel, name='announcements')


def kinds_for(user):
    return list(Notification.objects.filter(user=user).values_list('type', flat=True))


# --- a new message ------------------------------------------------------


@pytest.mark.django_db
def test_a_direct_message_notifies_its_recipient(auth_client, user, other_user):
    auth_client(user).post(
        '/api/messages/', {'recipient': other_user.pk, 'text': 'hello'}, format='json'
    )

    assert kinds_for(other_user) == [Notification.Kind.MESSAGE]
    assert kinds_for(user) == []


@pytest.mark.django_db
def test_a_group_message_notifies_every_member_but_the_sender(
    auth_client, user, other_user, group
):
    auth_client(user).post('/api/messages/', {'group': group.pk, 'text': 'hello'}, format='json')

    assert kinds_for(other_user) == [Notification.Kind.MESSAGE]
    assert kinds_for(user) == []


@pytest.mark.django_db
def test_a_topic_message_notifies_every_channel_member_but_the_sender(
    auth_client, user, other_user, topic
):
    auth_client(other_user).post(
        '/api/messages/', {'topic': topic.pk, 'text': 'hello'}, format='json'
    )

    # `user` owns the channel; `other_user` sent the message.
    assert kinds_for(user) == [Notification.Kind.MESSAGE]
    assert kinds_for(other_user) == []


@pytest.mark.django_db
def test_the_notification_says_where_the_message_was(auth_client, user, other_user, group):
    auth_client(user).post('/api/messages/', {'group': group.pk, 'text': 'hello'}, format='json')

    notification = Notification.objects.get(user=other_user)
    assert group.name in notification.content
    assert user.username in notification.content
    assert notification.link == f'/chat/{group.pk}'


# --- being added to a group or a channel --------------------------------


@pytest.mark.django_db
def test_being_added_to_a_channel_notifies_the_new_member(auth_client, user, other_user, channel):
    response = auth_client(user).post(
        f'/api/channels/{channel.pk}/members/', {'user_id': other_user.pk}, format='json'
    )

    assert response.status_code == 201
    assert kinds_for(other_user) == [Notification.Kind.MEMBER_ADDED]
    assert kinds_for(user) == []


@pytest.mark.django_db
def test_being_added_to_a_group_notifies_the_new_member(auth_client, user, user_factory, group):
    newcomer = user_factory('frank')

    response = auth_client(user).post(
        f'/api/groups/{group.pk}/members/',
        {'user_id': newcomer.pk, 'action': 'add'},
        format='json',
    )

    assert response.status_code == 200
    assert kinds_for(newcomer) == [Notification.Kind.MEMBER_ADDED]


# --- a role change ------------------------------------------------------


@pytest.mark.django_db
def test_a_role_change_notifies_the_member(auth_client, user, other_user, channel):
    ChannelMember.objects.create(channel=channel, user=other_user)
    role = Role.objects.create(channel=channel, name='Moderator', can_delete_message=True)

    response = auth_client(user).patch(
        f'/api/channels/{channel.pk}/members/{other_user.pk}/role/',
        {'role': role.pk},
        format='json',
    )

    assert response.status_code == 200
    assert kinds_for(other_user) == [Notification.Kind.ROLE_CHANGED]
    assert Notification.objects.get(user=other_user).content.count('Moderator') == 1


# --- the seam itself ----------------------------------------------------


@pytest.mark.django_db
def test_a_failing_handler_does_not_fail_the_message(auth_client, user, other_user, monkeypatch):
    """`events.publish` swallows handler errors on purpose — a notification that
    cannot be written must not lose the message that caused it."""
    from notifications import handlers

    def explode(**_):
        raise RuntimeError("notifications are down")

    monkeypatch.setattr(handlers, 'on_message_created', explode)
    from common import events
    events.subscribe(events.MESSAGE_CREATED, explode)

    response = auth_client(user).post(
        '/api/messages/', {'recipient': other_user.pk, 'text': 'hello'}, format='json'
    )

    assert response.status_code == 201


@pytest.mark.parametrize('module', ['messaging', 'groups_app', 'channels_app', 'roles'])
def test_no_module_imports_notifications(module):
    """architecture.tex §5.1 — the owning module publishes an event and knows
    nothing about who listens. The day one of these grows `from notifications
    import ...`, the seam is decoration."""
    offenders = []

    for path in (BACKEND / module).rglob('*.py'):
        if 'migrations' in path.parts or 'tests' in path.parts:
            continue
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and (node.module or '').startswith('notifications'):
                offenders.append(f'{path.name}:{node.lineno}')
            if isinstance(node, ast.Import):
                offenders += [
                    f'{path.name}:{node.lineno}' for alias in node.names
                    if alias.name.startswith('notifications')
                ]

    assert offenders == []


def test_notifications_subscribes_to_all_three_events():
    from common import events
    from notifications import handlers

    for event, handler in (
        (events.MESSAGE_CREATED, handlers.on_message_created),
        (events.MEMBER_ADDED, handlers.on_member_added),
        (events.ROLE_CHANGED, handlers.on_role_changed),
    ):
        assert handler in events._subscribers[event]
