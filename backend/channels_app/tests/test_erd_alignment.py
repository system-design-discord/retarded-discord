"""C-01's remainder — the sweep of channels_app against ERD.tex.

Brief Rule 12 grades the product against the design documents, and `INT-3`
checks the shipped models against the ERD's entity list by hand. This file does
that check in CI instead, so a later change that drifts from `ERD.tex` fails a
test the same day rather than being found on the last one.

`ERD.tex` gives this module three entities and four relationships:

    Channel        (id, owner_id, name, description, avatar)
    Topic          (id, channel_id, name)
    ChannelMember  (PK[user_id, channel_id], role_id?)

    Channel : Topic          1 : 0..N
    Channel : Role           1 : 0..N
    Channel : ChannelMember  1 : 1..N
    Role    : ChannelMember  0..1 : 0..N

Two differences are recorded rather than fixed, both in execution-plan.md:

* **Deviation 5** — the ERD gives `ChannelMember` a composite `(user_id,
  channel_id)` primary key; we use a surrogate `id` plus a `UniqueConstraint`
  over the same two columns. It enforces the identical rule and keeps
  `Role.members` and DRF's generic views straightforward. `groups_app`'s
  `GroupMember` and `Topic`'s `(channel, name)` are expressed the same way.
* **Timestamps are additive.** `Channel.created_at`, `Topic.created_at` and
  `ChannelMember.joined_at` are not in the ERD. They carry no relationship and
  remove no column, so they are recorded here and left in place — the ERD is a
  data model, not a column-by-column DDL.
"""

import pytest
from django.db import models

from channels_app.models import Channel, ChannelMember, Topic

# The additive columns above, excluded from the field-list comparisons.
TIMESTAMPS = {'created_at', 'joined_at'}


def concrete_fields(model):
    """The model's own columns, ignoring reverse and many-to-many accessors."""
    return {
        field.name for field in model._meta.get_fields()
        if getattr(field, 'concrete', False)
    } - TIMESTAMPS


def constraint_names(model):
    return {constraint.name for constraint in model._meta.constraints}


# --- entities ------------------------------------------------------------


def test_channel_matches_the_erd():
    assert concrete_fields(Channel) == {'id', 'owner', 'name', 'description', 'avatar'}


def test_topic_matches_the_erd():
    assert concrete_fields(Topic) == {'id', 'channel', 'name'}


def test_channel_member_matches_the_erd():
    """`id` is the surrogate key of deviation 5; the ERD's composite primary
    key is the uniqueness constraint asserted below."""
    assert concrete_fields(ChannelMember) == {'id', 'user', 'channel', 'role'}


def test_the_composite_key_the_erd_specifies_is_enforced_as_a_constraint():
    assert 'unique_channel_membership' in constraint_names(ChannelMember)

    constraint = next(
        c for c in ChannelMember._meta.constraints if c.name == 'unique_channel_membership'
    )
    assert set(constraint.fields) == {'user', 'channel'}


def test_a_topic_name_is_unique_within_its_channel():
    constraint = next(
        c for c in Topic._meta.constraints if c.name == 'unique_topic_name_per_channel'
    )
    assert set(constraint.fields) == {'channel', 'name'}


# --- relationships -------------------------------------------------------


@pytest.mark.parametrize(
    'model, field_name, target, nullable, on_delete',
    [
        # Channel : ChannelMember  1 : 1..N
        (ChannelMember, 'channel', Channel, False, models.CASCADE),
        # Channel : Topic  1 : 0..N
        (Topic, 'channel', Channel, False, models.CASCADE),
        # Role : ChannelMember  0..1 : 0..N — the 0..1 is why it is nullable,
        # and SET_NULL is R-02's "deleting a role does not orphan its members".
        (ChannelMember, 'role', None, True, models.SET_NULL),
    ],
)
def test_the_erds_cardinalities_are_the_shipped_foreign_keys(
    model, field_name, target, nullable, on_delete
):
    field = model._meta.get_field(field_name)

    assert isinstance(field, models.ForeignKey)
    assert field.null is nullable
    assert field.remote_field.on_delete is on_delete
    if target is not None:
        assert field.related_model is target


def test_the_channel_owner_is_a_user_and_the_relationship_is_one_to_many():
    """ERD.tex: User : Channel (owner) is 1 : 0..N."""
    from django.contrib.auth import get_user_model

    field = Channel._meta.get_field('owner')

    assert field.related_model is get_user_model()
    assert field.null is False
    assert field.remote_field.on_delete is models.CASCADE


def test_role_is_scoped_to_a_channel():
    """ERD.tex: Channel : Role is 1 : 0..N. The FK lives on Role, in the roles
    module, but the cardinality is this module's to hold to."""
    from roles.models import Role

    field = Role._meta.get_field('channel')

    assert field.related_model is Channel
    assert field.remote_field.on_delete is models.CASCADE


@pytest.mark.django_db
def test_a_channel_always_has_at_least_one_member(user):
    """ERD.tex makes Channel : ChannelMember 1 : 1..N. `create_with_owner` is
    what makes that true in practice — the API never calls plain `create`."""
    channel = Channel.objects.create_with_owner(owner=user, name='general')

    assert channel.memberships.count() == 1
    assert channel.memberships.first().user == user
