"""Fixtures shared by every module's tests.

pytest-django gives us the database; this file gives us the three things every
API test needs — a user, a client, and a client that is already authenticated.
Tests opt into the database with @pytest.mark.django_db, and each test runs in
a transaction that is rolled back afterwards, so ordering never matters.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from common import events

User = get_user_model()


@pytest.fixture(autouse=True)
def isolated_event_subscribers():
    """common.events keeps its subscriber registry in a module global, so a
    test that subscribes would otherwise still be listening during the next
    one. Snapshot it and put it back."""
    snapshot = {event: list(handlers) for event, handlers in events._subscribers.items()}
    yield
    events._subscribers.clear()
    events._subscribers.update(snapshot)


@pytest.fixture
def api_client():
    """An unauthenticated DRF client."""
    return APIClient()


@pytest.fixture
def user_factory(db):
    """Make distinct users without repeating the boilerplate in every test."""
    created = {'n': 0}

    def make(username=None, **kwargs):
        created['n'] += 1
        username = username or f'user{created["n"]}'
        return User.objects.create_user(
            username=username,
            email=kwargs.pop('email', f'{username}@example.test'),
            password=kwargs.pop('password', 'testpass123'),
            **kwargs,
        )

    return make


@pytest.fixture
def user(user_factory):
    return user_factory('alice')


@pytest.fixture
def other_user(user_factory):
    return user_factory('bob')


@pytest.fixture
def auth_client(api_client):
    """A client already authenticated as whichever user you pass in.

        client = auth_client(alice)
        client.get('/api/profile/')
    """
    def authenticate(as_user):
        api_client.force_authenticate(user=as_user)
        return api_client

    return authenticate
