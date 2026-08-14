"""Channel-layer group names — the one place the convention is written down.

The consumer subscribes a socket to a group; the publisher sends to the same
group. If those two ever disagree about the name, nothing is delivered and
nothing errors — the message simply goes nowhere. So both import from here
rather than formatting a string each.

A direct message is the case that needs care: the two participants open the
socket from opposite ends (`ws/dm/<the other person>/`), so the name has to come
out the same either way round. Sorting the pair is what makes it symmetric.
"""


def dm_group(user_id, other_id):
    """The group both ends of one direct-message conversation join."""
    low, high = sorted((int(user_id), int(other_id)))
    return f'dm.{low}.{high}'


def group_group(group_id):
    """A group conversation (`groups_app.Group`), not to be confused with a
    channel-layer group — which is the unfortunate name collision this whole
    module is stuck with."""
    return f'group.{int(group_id)}'


def topic_group(topic_id):
    """One topic inside a channel."""
    return f'topic.{int(topic_id)}'


def user_group(user_id):
    """Every socket one person has open, and nobody else's.

    `RT-03` fans a notification out to its recipient alone, so the group is the
    recipient rather than a conversation. One person may have several tabs open
    and each is a separate socket in the same group, which is what makes "the
    badge updates everywhere" true without the gateway tracking sessions.
    """
    return f'user.{int(user_id)}'


def group_for_message(message):
    """The group a newly created message should be fanned out to.

    Mirrors `messaging.serializers.TARGET_FIELDS`: a message carries exactly
    one of the three, enforced by the serializer and by a database check
    constraint, so exactly one branch here can be true.
    """
    if message.recipient_id is not None:
        return dm_group(message.sender_id, message.recipient_id)
    if message.group_id is not None:
        return group_group(message.group_id)
    if message.topic_id is not None:
        return topic_group(message.topic_id)
    return None
