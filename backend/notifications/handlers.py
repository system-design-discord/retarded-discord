"""Who hears about each event — US-11.1.

One handler per event in `common/events.py`, subscribed in `apps.ready()`. They
are called synchronously in the caller's thread and anything they raise is
logged and swallowed by `events.publish`, so a failed notification never fails
the message, membership or role change that triggered it.

Nothing here is imported by `messaging`, `groups_app`, `channels_app` or
`roles` — that is the whole point of the seam (architecture.tex §5.1), and
`tests/test_generation.py` asserts it stays that way.
"""

from django.contrib.auth import get_user_model

from .models import Notification
from .services import notify, notify_many

User = get_user_model()


def _recipients_of(message):
    """Everyone entitled to see `message`, other than whoever sent it.

    Deliberately reads the membership tables rather than re-deriving visibility:
    `Message.objects.visible_to` answers "may this user read it", which is the
    wrong direction — here we start from the message and ask who is in the room.
    """
    if message.recipient_id is not None:
        return [message.recipient]

    if message.group_id is not None:
        return list(message.group.members.all())

    if message.topic_id is not None:
        channel = message.topic.channel
        members = User.objects.filter(channel_memberships__channel=channel)
        # The owner holds a ChannelMember row whenever the channel was made
        # through `create_with_owner`, but a channel built directly in a shell
        # or a fixture may not have one, and the owner is always in the room.
        return list(members.union(User.objects.filter(pk=channel.owner_id)))

    return []


def _describe(message):
    """What to say about a new message, and where it takes the reader.

    A direct message has no third place to name — saying "from majid in majid"
    reads as a bug even though it is only a template with one slot too many —
    so the DM case is a different sentence rather than the same one with a
    duplicated name.
    """
    sender = message.sender.username

    if message.group_id is not None:
        return f"پیام جدید از {sender} در گروه {message.group.name}", f'/chat/{message.group_id}'

    if message.topic_id is not None:
        topic = message.topic
        return (
            f"پیام جدید از {sender} در {topic.channel.name} › {topic.name}",
            f'/channels?channel={topic.channel_id}&topic={topic.pk}',
        )

    return f"پیام جدید از {sender}", f'/dms?user={message.sender_id}'


def on_message_created(message, **_):
    """US-11.1, first event — a new message."""
    content, link = _describe(message)

    notify_many(
        _recipients_of(message),
        Notification.Kind.MESSAGE,
        content,
        link=link,
        actor=message.sender,
    )


def on_member_added(user, actor=None, channel=None, group=None, **_):
    """US-11.1, second event — being added to a group or channel.

    Both `channels_app` and `groups_app` publish this, with `channel=` and
    `group=` respectively, so the handler takes either.
    """
    if channel is not None:
        where, link = channel.name, f'/channels?channel={channel.pk}'
    elif group is not None:
        where, link = group.name, f'/chat/{group.pk}'
    else:
        return

    notify(
        user,
        Notification.Kind.MEMBER_ADDED,
        f"شما به {where} اضافه شدید.",
        link=link,
        actor=actor,
    )


def on_role_changed(channel, user, role=None, actor=None, **_):
    """US-11.1, third event — your role in a channel changed.

    A cleared role is a change too: `R-02` lets a role be deleted, which
    `SET_NULL`s its holders, and being told you now hold nothing matters more
    than being told you hold something.
    """
    named = role.name if role is not None else "بدون نقش"

    notify(
        user,
        Notification.Kind.ROLE_CHANGED,
        f"نقش شما در {channel.name} به «{named}» تغییر کرد.",
        link='/channels',
        actor=actor,
    )
