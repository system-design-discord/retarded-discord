"""`ChannelSerializer.my_permissions` — the answer the channel list draws from.

The SPA's channel list gated its Delete button on `channel.owner.id === user.id`,
which is the client answering a permission question — the one thing
`architecture.tex` §5.1 forbids — and answering it wrong: the owner holds
`can_delete_channel` implicitly, but so does anybody a role grants it to, and
none of them had a control anywhere in the product.

The fix is not a new rule. It is `roles.permissions_for`, the same function
`/api/channels/<id>/me/permissions/` answers with, rendered onto every row so a
list does not need a request per channel. These tests pin that the two agree —
if they ever disagree there are two definitions of the answer, which is the
thing this was meant to stop.
"""

import pytest

from channels_app.models import Channel, ChannelMember
from roles.models import Role


@pytest.fixture
def channel(db, user, other_user):
    made = Channel.objects.create_with_owner(owner=user, name='general')
    ChannelMember.objects.create(channel=made, user=other_user)
    return made


@pytest.mark.django_db
def test_the_owner_holds_everything(auth_client, user, channel):
    response = auth_client(user).get('/api/channels/')

    row = response.data['results'][0]
    assert all(row['my_permissions'].values())


@pytest.mark.django_db
def test_a_member_with_no_role_holds_nothing(auth_client, other_user, channel):
    response = auth_client(other_user).get('/api/channels/')

    row = response.data['results'][0]
    assert not any(row['my_permissions'].values())


@pytest.mark.django_db
def test_a_role_granting_only_delete_shows_only_delete(auth_client, other_user, channel):
    """The case the SPA could not express at all.

    `can_delete_channel` without `can_edit_channel` is a perfectly ordinary
    role — it is the one the role manager offers as a checkbox — and before this
    field the holder saw a Delete button nowhere, because the list asked whether
    they *owned* the channel.
    """
    role = Role.objects.create(channel=channel, name='Undertaker', can_delete_channel=True)
    ChannelMember.objects.filter(channel=channel, user=other_user).update(role=role)

    row = auth_client(other_user).get('/api/channels/').data['results'][0]

    assert row['my_permissions']['can_delete_channel'] is True
    assert row['my_permissions']['can_edit_channel'] is False


@pytest.mark.django_db
def test_it_agrees_with_the_per_channel_endpoint(auth_client, other_user, channel):
    role = Role.objects.create(
        channel=channel, name='Moderator', can_create_topic=True, can_delete_message=True
    )
    ChannelMember.objects.filter(channel=channel, user=other_user).update(role=role)

    client = auth_client(other_user)
    from_list = client.get('/api/channels/').data['results'][0]['my_permissions']
    from_detail = client.get(f'/api/channels/{channel.pk}/me/permissions/').data

    assert from_list == from_detail['permissions']


@pytest.mark.django_db
def test_it_is_read_only(auth_client, user, channel):
    """A permission the client could *send* would be worse than one it derives."""
    response = auth_client(user).patch(
        f'/api/channels/{channel.pk}/',
        {'my_permissions': {'can_delete_channel': False}},
        format='json',
    )

    assert response.status_code == 200
    assert response.data['my_permissions']['can_delete_channel'] is True
