"""N-01's ERD sweep — the shipped model against ERD.tex.

Brief Rule 12 grades the product against the Phase 1 designs, and `INT-3` checks
the models against the ERD's entity list by hand on the last day. This file does
the same check in CI, so drift fails a test the day it happens.

`ERD.tex` gives this module one entity and one relationship:

    Notification  (id, user_id, type, content, is_read, created_at)

    User : Notification   1 : 0..N

One difference is recorded rather than fixed, in execution-plan.md:

* **`link` is additive.** It is the SPA path a notification points at, which
  `U-11` needs in order to navigate to a notification's subject. It carries no
  relationship and removes no column — the same ground on which
  `channels_app/tests/test_erd_alignment.py` keeps its timestamps.
"""

import pytest
from django.contrib.auth import get_user_model
from django.db import models

from notifications.models import Notification

User = get_user_model()

# The additive column above, excluded from the field-list comparison.
ADDITIVE = {'link'}

ERD_FIELDS = {'id', 'user', 'type', 'content', 'is_read', 'created_at'}


def concrete_fields(model):
    """The model's own columns, ignoring reverse and many-to-many accessors."""
    return {
        field.name for field in model._meta.get_fields()
        if getattr(field, 'concrete', False)
    } - ADDITIVE


def test_notification_matches_the_erd_field_list():
    assert concrete_fields(Notification) == ERD_FIELDS


def test_user_to_notification_is_one_to_many():
    field = Notification._meta.get_field('user')

    assert isinstance(field, models.ForeignKey)
    assert field.related_model is User
    assert field.remote_field.on_delete is models.CASCADE
    # 0..N: a user with no notifications is valid, so the FK is not required to
    # exist from the User side and nothing here may be nullable on this one.
    assert field.null is False


def test_the_kinds_are_exactly_the_three_events_us_11_1_names():
    assert set(Notification.Kind.values) == {'message', 'member_added', 'role_changed'}


@pytest.mark.django_db
def test_notifications_come_back_newest_first(user):
    older = Notification.objects.create(user=user, type=Notification.Kind.MESSAGE, content='1')
    newer = Notification.objects.create(user=user, type=Notification.Kind.MESSAGE, content='2')

    assert list(Notification.objects.all()) == [newer, older]
