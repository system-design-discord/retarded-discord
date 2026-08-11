"""M-04 — GroupMember, the join entity ERD.tex specifies.

`ERD.tex` gives `GroupMember` the fields `(user_id [PK,FK], group_id [PK,FK],
is_admin)` and gives `Group` **no** admin column. The code used to have the
opposite shape. These tests pin the entity down and pin down the two things the
swap was not allowed to change: the group API's response shape, and the answer
`roles` gives about who may moderate a group.
"""

import pytest
from django.db import IntegrityError, transaction

from groups_app.models import Group, GroupMember
from roles import services


@pytest.fixture
def group(db, user, other_user):
    g = Group.objects.create_with_admin(admin=user, name='team')
    g.members.add(other_user)
    return g


# --- the entity ----------------------------------------------------------


@pytest.mark.django_db
def test_group_member_carries_the_fields_the_erd_names(group, user):
    membership = GroupMember.objects.get(group=group, user=user)

    assert membership.group == group
    assert membership.user == user
    assert membership.is_admin is True
    assert membership.joined_at is not None


@pytest.mark.django_db
def test_a_user_cannot_join_the_same_group_twice(group, other_user):
    """ERD.tex makes (user, group) the primary key; we enforce it as a
    uniqueness constraint over a surrogate key, exactly as ChannelMember does."""
    with pytest.raises(IntegrityError), transaction.atomic():
        GroupMember.objects.create(group=group, user=other_user)


@pytest.mark.django_db
def test_adding_an_existing_member_again_is_a_no_op(group, other_user):
    group.members.add(other_user)

    assert GroupMember.objects.filter(group=group, user=other_user).count() == 1


@pytest.mark.django_db
def test_creating_a_group_gives_it_exactly_one_admin(group):
    assert GroupMember.objects.filter(group=group, is_admin=True).count() == 1


@pytest.mark.django_db
def test_the_admin_is_read_from_group_member_not_stored_twice(group, user):
    """`Group.admin` is a property now. There is no second column to disagree."""
    assert group.admin == user
    assert not any(f.name == 'admin' for f in Group._meta.get_fields())


@pytest.mark.django_db
def test_a_group_with_no_admin_row_reports_no_admin(db):
    orphan = Group.objects.create(name='orphan')

    assert orphan.admin is None


@pytest.mark.django_db
def test_deleting_a_group_removes_its_memberships(group):
    group.delete()

    assert GroupMember.objects.count() == 0


@pytest.mark.django_db
def test_removing_a_member_deletes_only_their_membership(group, user, other_user):
    group.members.remove(other_user)

    assert list(group.members.all()) == [user]
    assert GroupMember.objects.filter(group=group).count() == 1


# --- what the swap was not allowed to change -----------------------------


@pytest.mark.django_db
def test_roles_still_decides_who_may_moderate_a_group(group, user, other_user):
    """architecture.tex §5.1 — the answer moved storage, not owners."""
    assert services.has_group_permission(user, group, 'can_delete_message') is True
    assert services.has_group_permission(other_user, group, 'can_delete_message') is False


@pytest.mark.django_db
def test_the_group_api_response_shape_is_unchanged(auth_client, user, group):
    response = auth_client(user).get(f'/api/groups/{group.pk}/')

    assert response.status_code == 200
    assert set(response.data) == {
        'id', 'name', 'description', 'avatar', 'created_at', 'admin', 'members',
    }
    assert response.data['admin']['username'] == user.username
    assert len(response.data['members']) == 2


@pytest.mark.django_db
def test_creating_a_group_over_the_api_makes_the_creator_its_admin(auth_client, user):
    response = auth_client(user).post('/api/groups/', {'name': 'new group'}, format='json')

    assert response.status_code == 201
    created = Group.objects.get(pk=response.data['id'])
    assert created.admin == user
    assert user in created.members.all()
