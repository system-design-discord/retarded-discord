"""A-10 — leaving a group or a channel, and why the rule lives here.

SH.2's justification is *"so that I do not end up in groups or channels I do not
want to join"*. `allow_invites` enforced that **before** you were added and
nothing enforced it afterwards: removing yourself went through the same gate as
removing anybody else, so a member who turned the switch off was still in every
group they had already been put into and had to ask an admin to be let out. The
`GroupSettings` screen even offered a Remove button on your own row that a
non-admin could not use.

The tests are here rather than in `groups_app` or `channels_app` because the
rule is here. A view answering "is this me?" for itself is a module deciding a
permission for itself, which is the one thing `architecture.tex` §5.1 forbids,
and the reason `grep` still finds no `== request.user` in either view.
"""

import pytest

from channels_app.models import Channel, ChannelMember
from groups_app.models import Group
from roles import services
from roles.models import Role


@pytest.fixture
def admin(user_factory):
    return user_factory('admin')


@pytest.fixture
def member(user_factory):
    return user_factory('member')


@pytest.fixture
def outsider(user_factory):
    return user_factory('outsider')


@pytest.fixture
def group(db, admin, member):
    created = Group.objects.create_with_admin(admin=admin, name='team')
    created.members.add(member)
    return created


@pytest.fixture
def channel(db, admin, member):
    created = Channel.objects.create_with_owner(owner=admin, name='general')
    ChannelMember.objects.create(channel=created, user=member)
    return created


# --- the predicates -----------------------------------------------------


@pytest.mark.django_db
def test_a_member_may_remove_themselves_from_a_group(group, member):
    assert services.may_remove_group_member(member, group, member)


@pytest.mark.django_db
def test_a_member_still_may_not_remove_somebody_else(group, member, admin):
    assert not services.may_remove_group_member(member, group, admin)


@pytest.mark.django_db
def test_the_admin_may_still_remove_anybody(group, admin, member):
    assert services.may_remove_group_member(admin, group, member)


@pytest.mark.django_db
def test_an_outsider_cannot_remove_themselves_from_a_group_they_are_not_in(group, outsider):
    assert not services.may_remove_group_member(outsider, group, outsider)


@pytest.mark.django_db
def test_a_channel_member_may_remove_themselves(channel, member):
    assert services.may_remove_channel_member(member, channel, member)


@pytest.mark.django_db
def test_a_channel_member_without_the_permission_still_may_not_remove_another(
    channel, member, admin, user_factory
):
    third = user_factory('third')
    ChannelMember.objects.create(channel=channel, user=third)

    assert not services.may_remove_channel_member(member, channel, third)


@pytest.mark.django_db
def test_a_role_holding_can_remove_member_still_removes_others(channel, member, user_factory):
    third = user_factory('third')
    ChannelMember.objects.create(channel=channel, user=third)
    role = Role.objects.create(channel=channel, name='Moderator', can_remove_member=True)
    ChannelMember.objects.filter(channel=channel, user=member).update(role=role)

    assert services.may_remove_channel_member(member, channel, third)


# --- through the API ----------------------------------------------------


@pytest.mark.django_db
def test_a_group_member_leaves(auth_client, group, member):
    response = auth_client(member).post(
        f'/api/groups/{group.pk}/members/', {'action': 'remove', 'user_id': member.pk}
    )

    assert response.status_code == 200, response.data
    assert member not in group.members.all()


@pytest.mark.django_db
def test_a_group_member_still_cannot_evict_a_peer(auth_client, group, member, user_factory):
    peer = user_factory('peer')
    group.members.add(peer)

    response = auth_client(member).post(
        f'/api/groups/{group.pk}/members/', {'action': 'remove', 'user_id': peer.pk}
    )

    assert response.status_code == 403
    assert peer in group.members.all()


@pytest.mark.django_db
def test_the_group_admin_cannot_leave(auth_client, group, admin):
    """Somebody has to administer it — the 400 that was already there."""
    response = auth_client(admin).post(
        f'/api/groups/{group.pk}/members/', {'action': 'remove', 'user_id': admin.pk}
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_an_outsider_cannot_touch_the_member_list_at_all(auth_client, group, outsider):
    response = auth_client(outsider).post(
        f'/api/groups/{group.pk}/members/', {'action': 'remove', 'user_id': outsider.pk}
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_a_channel_member_leaves(auth_client, channel, member):
    response = auth_client(member).delete(f'/api/channels/{channel.pk}/members/{member.pk}/')

    assert response.status_code == 204
    assert not ChannelMember.objects.filter(channel=channel, user=member).exists()


@pytest.mark.django_db
def test_a_channel_member_still_cannot_evict_a_peer(auth_client, channel, member, user_factory):
    peer = user_factory('peer')
    ChannelMember.objects.create(channel=channel, user=peer)

    response = auth_client(member).delete(f'/api/channels/{channel.pk}/members/{peer.pk}/')

    assert response.status_code == 403
    assert ChannelMember.objects.filter(channel=channel, user=peer).exists()


@pytest.mark.django_db
def test_the_channel_owner_cannot_leave(auth_client, channel, admin):
    """`ERD.tex` makes `Channel : ChannelMember` a `1 : 1..N` relationship."""
    response = auth_client(admin).delete(f'/api/channels/{channel.pk}/members/{admin.pk}/')

    assert response.status_code == 400


@pytest.mark.django_db
def test_adding_a_member_is_unaffected(auth_client, group, admin, outsider):
    """The gate this change moved is the removal half. Nobody adds themselves,
    so the add path still refuses everybody but a holder of `can_add_member`."""
    response = auth_client(admin).post(
        f'/api/groups/{group.pk}/members/', {'action': 'add', 'user_id': outsider.pk}
    )
    assert response.status_code == 200

    refused = auth_client(outsider).post(
        f'/api/groups/{group.pk}/members/', {'action': 'add', 'user_id': outsider.pk}
    )
    assert refused.status_code == 403
