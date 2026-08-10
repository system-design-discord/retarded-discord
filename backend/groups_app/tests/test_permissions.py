"""Group access control, after it moved into roles.services.

These are regression tests for a refactor, so they assert the behaviour that
was already true on main — same status codes, same response bodies. What
changed is *where* the decision is made (architecture.tex §5.1), not what it
decides.
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
    g = Group.objects.create(name='team', admin=admin)
    g.members.add(admin, plain)
    return g


@pytest.mark.django_db
def test_the_admin_can_edit_the_group(auth_client, admin, group):
    response = auth_client(admin).patch(f'/api/groups/{group.pk}/', {'name': 'renamed'}, format='json')

    assert response.status_code == 200
    group.refresh_from_db()
    assert group.name == 'renamed'


@pytest.mark.django_db
def test_an_ordinary_member_cannot_edit_the_group(auth_client, plain, group):
    response = auth_client(plain).patch(f'/api/groups/{group.pk}/', {'name': 'renamed'}, format='json')

    assert response.status_code == 403
    group.refresh_from_db()
    assert group.name == 'team'


@pytest.mark.django_db
def test_a_non_member_cannot_even_see_the_group(auth_client, outsider, group):
    """The queryset is member-scoped, so this is a 404 rather than a 403."""
    assert auth_client(outsider).get(f'/api/groups/{group.pk}/').status_code == 404


@pytest.mark.django_db
def test_only_the_admin_may_delete_the_group(auth_client, admin, plain, group):
    assert auth_client(plain).delete(f'/api/groups/{group.pk}/').status_code == 403
    assert auth_client(admin).delete(f'/api/groups/{group.pk}/').status_code == 204


@pytest.mark.django_db
def test_a_non_admin_managing_members_gets_403_before_validation(auth_client, plain, group, outsider):
    """Ordering matters: an unauthorised caller must not learn which parameters
    the endpoint wanted."""
    response = auth_client(plain).post(f'/api/groups/{group.pk}/members/', {}, format='json')

    assert response.status_code == 403
    assert 'error' in response.data


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
