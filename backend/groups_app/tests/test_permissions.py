"""Group access control, decided in roles.services.

Most of these are regression tests for a refactor: the decision moved
(architecture.tex §5.1) without changing what it decides. Editing and deleting
the group are the exception — `#124` changed the rule itself, from the admin
alone to any member, because doc.tex §4.6 and US-6.3/US-6.4 always said so and
the code did not. Member management did not move: add, remove and delete-
another's-message are still the admin's three.
"""

import pytest

from groups_app.models import Group


@pytest.fixture
def admin(user_factory):
    return user_factory('gadmin')


@pytest.fixture
def plain(user_factory):
    return user_factory('plain')


@pytest.fixture
def outsider(user_factory):
    return user_factory('outsider')


@pytest.fixture
def group(db, admin, plain):
    g = Group.objects.create_with_admin(admin=admin, name='team')
    g.members.add(admin, plain)
    return g


@pytest.mark.django_db
def test_the_admin_can_edit_the_group(auth_client, admin, group):
    response = auth_client(admin).patch(f'/api/groups/{group.pk}/', {'name': 'renamed'}, format='json')

    assert response.status_code == 200
    group.refresh_from_db()
    assert group.name == 'renamed'


@pytest.mark.django_db
def test_an_ordinary_member_can_edit_the_group(auth_client, plain, group):
    """US-6.4 and doc.tex §4.6 — editing is a member right, not an admin one."""
    response = auth_client(plain).patch(f'/api/groups/{group.pk}/', {'name': 'renamed'}, format='json')

    assert response.status_code == 200
    group.refresh_from_db()
    assert group.name == 'renamed'


@pytest.mark.django_db
def test_a_non_member_cannot_even_see_the_group(auth_client, outsider, group):
    """The queryset is member-scoped, so this is a 404 rather than a 403."""
    assert auth_client(outsider).get(f'/api/groups/{group.pk}/').status_code == 404


@pytest.mark.django_db
def test_any_member_may_delete_the_group(auth_client, plain, group):
    """US-6.3 — "so that the group can be disbanded upon the members' agreement".
    The agreement is reached between the members; the product does not ask for
    it, so any one of them may act on it."""
    assert auth_client(plain).delete(f'/api/groups/{group.pk}/').status_code == 204


@pytest.mark.django_db
def test_the_admin_may_delete_the_group_too(auth_client, admin, group):
    assert auth_client(admin).delete(f'/api/groups/{group.pk}/').status_code == 204


@pytest.mark.django_db
def test_a_non_member_can_neither_edit_nor_delete_the_group(auth_client, outsider, group):
    """Widening edit and delete to every member must not widen them past the
    membership line. Both are 404 rather than 403 for the reason above."""
    assert auth_client(outsider).patch(
        f'/api/groups/{group.pk}/', {'name': 'renamed'}, format='json'
    ).status_code == 404
    assert auth_client(outsider).delete(f'/api/groups/{group.pk}/').status_code == 404


@pytest.mark.django_db
def test_a_stranger_managing_members_gets_403_before_validation(auth_client, group, outsider):
    """Ordering matters: an unauthorised caller must not learn which parameters
    the endpoint wanted.

    This used to be asserted of `plain`, an ordinary member, and A-10 moved the
    line it is asserting. Leaving is removing yourself, so whether a *member*
    may remove anybody cannot be answered until the body says who — a member
    reaching validation is the point of that change, and is pinned below. The
    property this test exists for is about somebody with no business here at
    all, which is `outsider`, and it still holds.
    """
    response = auth_client(outsider).post(f'/api/groups/{group.pk}/members/', {}, format='json')

    assert response.status_code == 403
    assert 'error' in response.data


@pytest.mark.django_db
def test_a_member_reaches_validation_because_they_might_be_leaving(auth_client, plain, group):
    """The A-10 consequence of the test above, stated rather than implied. A
    member is not an unauthorised caller here any more: `roles` still refuses
    them the moment the body names somebody other than themselves, which
    `roles/tests/test_leaving.py` pins."""
    response = auth_client(plain).post(f'/api/groups/{group.pk}/members/', {}, format='json')

    assert response.status_code == 400


@pytest.mark.django_db
def test_the_admin_gets_400_for_bad_parameters(auth_client, admin, group):
    response = auth_client(admin).post(f'/api/groups/{group.pk}/members/', {}, format='json')

    assert response.status_code == 400


@pytest.mark.django_db
def test_the_admin_can_add_a_member(auth_client, admin, group, outsider):
    response = auth_client(admin).post(
        f'/api/groups/{group.pk}/members/', {'user_id': outsider.pk, 'action': 'add'}, format='json'
    )

    assert response.status_code == 200
    assert outsider in group.members.all()


@pytest.mark.django_db
def test_adding_a_user_who_refuses_invites_is_refused(auth_client, admin, group, outsider):
    """US-5.4 / SH.2 — the target's own flag decides, not the admin's."""
    from accounts.models import Profile

    Profile.objects.update_or_create(user=outsider, defaults={'allow_invites': False})

    response = auth_client(admin).post(
        f'/api/groups/{group.pk}/members/', {'user_id': outsider.pk, 'action': 'add'}, format='json'
    )

    assert response.status_code == 403
    assert outsider not in group.members.all()


@pytest.mark.django_db
def test_the_admin_can_remove_a_member(auth_client, admin, group, plain):
    response = auth_client(admin).post(
        f'/api/groups/{group.pk}/members/', {'user_id': plain.pk, 'action': 'remove'}, format='json'
    )

    assert response.status_code == 200
    assert plain not in group.members.all()


@pytest.mark.django_db
def test_the_admin_cannot_be_removed(auth_client, admin, group):
    response = auth_client(admin).post(
        f'/api/groups/{group.pk}/members/', {'user_id': admin.pk, 'action': 'remove'}, format='json'
    )

    assert response.status_code == 400
    assert admin in group.members.all()
