# channels_app — Channels, Topics and membership

Three entities — **`Channel`**, **`ChannelMember`**, **`Topic`** — and the API
over them. `C-01` through `C-04`.

The module owns channels. It owns **no decision about who may touch one**: every
gate below is a `required_permission` read by `common.permissions`, which asks
`roles.services`. `architecture.tex` §5.1 — no module decides permissions for
itself — so there is deliberately no `if user.id == channel.owner_id` anywhere in
this package. If you are about to write one, call `roles` instead.

## The API

All under `/api/`. Lists are paginated (`PAGE_SIZE: 50`), so the body is
`{count, next, previous, results}` — **not** an array. Issue #77 exists because
four components assumed otherwise.

| Method | Path | Needs |
|---|---|---|
| `GET` | `channels/` | authentication — returns only channels you own or joined |
| `POST` | `channels/` | authentication — you become the owner |
| `GET` | `channels/<id>/` | membership |
| `PUT` `PATCH` | `channels/<id>/` | `can_edit_channel` |
| `DELETE` | `channels/<id>/` | `can_delete_channel` |
| `GET` | `channels/<id>/topics/` | membership |
| `POST` | `channels/<id>/topics/` | `can_create_topic` |
| `GET` | `channels/<id>/topics/<topic_id>/` | membership |
| `PATCH` | `channels/<id>/topics/<topic_id>/` | `can_edit_channel` |
| `DELETE` | `channels/<id>/topics/<topic_id>/` | `can_edit_channel` |
| `GET` | `channels/<id>/members/` | membership |
| `POST` | `channels/<id>/members/` | `can_add_member` **and** the target's `allow_invites` |
| `DELETE` | `channels/<id>/members/<user_id>/` | `can_remove_member` |

Four more paths under `channels/<id>/` belong to `roles`, not here:
`channels/<id>/roles/`, `channels/<id>/roles/<role_id>/`,
`channels/<id>/members/<user_id>/role/` and `channels/<id>/me/permissions/`.
This module's `urls.py` is included first and its patterns do not overlap
theirs; a test pins that.

## Two things the API does that are worth knowing before you call it

**1. Creating a channel writes two rows.** `Channel.objects.create_with_owner`
creates the channel *and* the owner's `ChannelMember`, because `ERD.tex` makes
`Channel : ChannelMember` a `1 : 1..N` relationship — a channel nobody is in is
not a valid channel. It is the mirror of `groups_app`'s
`Group.objects.create_with_admin`. The owner needs no role row to administer the
channel: `roles.services` treats them as implicitly holding all eight
permissions, so ownership cannot be revoked by editing a table.

**2. A destructive delete answers 200 with what went with it, not 204.** `C-03`'s
acceptance criterion is that deleting a topic "does not silently delete its
messages without saying so", and `Topic.messages` is CASCADE. Both deletes report
the same way:

```
DELETE /api/channels/<id>/topics/<topic_id>/
200  {"deleted_messages": 3}

DELETE /api/channels/<id>/
200  {"deleted": {"topics": 2, "members": 5, "roles": 1, "messages": 41}}
```

The counts come from Django's own `delete()` tally, so they cannot drift from
what actually happened.

## Messages in a topic belong to `messaging`

There is no `channels/<id>/topics/<id>/messages/` endpoint and there should not
be one. A channel message is a `Message` with a `topic` target:

```
GET  /api/messages/?topic_id=<id>
POST /api/messages/  {"topic": <id>, "text": "…"}
```

Read scoping is `Message.objects.visible_to(user)`, one queryset shared by every
caller; a second endpoint here would be a fourth definition of it. Posting needs
channel membership and nothing more — `user_stories_en.tex` is explicit that a
channel is a collection of topics and that **all** members may exchange messages
in them. The restriction in US-2.4 is on **media** (`A-10`), not on posting.

## The ERD sweep — `C-01`

`tests/test_erd_alignment.py` pins this module against `ERD.tex`: the three
entity field lists and the four cardinalities (`Channel : Topic 1 : 0..N`,
`Channel : Role 1 : 0..N`, `Channel : ChannelMember 1 : 1..N`,
`Role : ChannelMember 0..1 : 0..N`). Drift fails CI rather than being found at
`INT-3`.

Two differences are recorded rather than fixed:

- **Deviation 5** — `ERD.tex` gives `ChannelMember` a composite
  `(user_id, channel_id)` primary key; we use a surrogate `id` plus a
  `UniqueConstraint` over the same two columns. Identical rule, and it keeps
  `Role.members` and DRF's generic views straightforward. `Topic`'s
  `(channel, name)` and `groups_app.GroupMember`'s `(group, user)` are expressed
  the same way.
- **Timestamps are additive.** `Channel.created_at`, `Topic.created_at` and
  `ChannelMember.joined_at` are not in the ERD. They carry no relationship and
  remove no column.

## Where the entities came from

None of the three landed under `C-01`, and both bites are recorded in
`../../execution-plan.md` as deviations 5 and 6 rather than absorbed silently:

- `Channel` and `ChannelMember` landed under `R-01`, because `roles.Role.channel`
  is a ForeignKey and the roles chain — nine cards across four people — could not
  start until there was a channel to point at.
- `Topic` landed under `R-05`, because a channel message cannot exist without it
  and `R-05`'s channel branch is untestable without a channel message.

## Events

Adding a member publishes `common.events.MEMBER_ADDED` with
`channel`, `user` and `actor`. Notifications (`N-02`) and the real-time gateway
subscribe to it; this module imports neither.
