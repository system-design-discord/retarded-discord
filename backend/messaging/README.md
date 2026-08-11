# messaging — the message engine

Everything that reads or writes a message goes through two things, and neither of
them is a decision this module makes.

## A message has exactly one target

| Target | Means | Story |
|---|---|---|
| `recipient` | a direct message to one user | US-2.1 |
| `group` | a message in a group | US-2.2 |
| `topic` | a message in one topic of a channel | US-2.3 |

The rule is enforced **twice on purpose**: `MessageSerializer.validate` refuses
anything else at the API boundary, and a `CheckConstraint` named
`message_has_exactly_one_target` refuses it at the database, so a shell session
or a data migration cannot create a shape the API forbids.

`ERD.tex` models the direct-message case as a `PrivateChat` entity between two
users; we express it as a nullable `recipient` on the message itself. That
deviation is recorded in `../../execution-plan.md`.

## What you may read — `Message.objects.visible_to(user)`

One queryset, used by the list view, the detail view and (when `M-08` lands) the
search endpoint. Before it existed each caller had its own version and they did
not agree: the detail view scoped to `sender`, so a direct message you *received*
was unreadable over the API, and a moderator could not reach a message in order
to delete it.

It answers **membership, not permission**: anything you wrote, any DM addressed
to you, any group you are in, any channel you joined or own. A message outside it
returns **404**, never 403 — a 403 would confirm that a conversation you are not
in exists.

`?user_id=`, `?group_id=` and `?topic_id=` narrow that scope to one conversation.
They are selectors, not the scope, so asking for a conversation you are not in
comes back empty rather than leaking it.

## What you may do — `roles.services`

`architecture.tex` §5.1: no module decides permissions for itself, and that
includes this one. There is no `if` about authorship or ownership anywhere in
`views.py`.

| Action | Call |
|---|---|
| Post in a group | `roles.services.require_group_membership` |
| Post in a topic | `roles.services.require_channel_membership` |
| Delete a message | `roles.services.require_delete_message` |

All members of a channel may post in its topics without any role at all —
`user_stories_en.tex` §Assumptions for section 4 is explicit that a channel is a
collection of topics and **all** members exchange messages in them. The per-topic
restriction in US-2.4 is on *media*, not on posting.

Who may delete what is the table in `../roles/README.md`. The matrix that proves
it is `tests/test_delete_message.py`, and `INT-2` runs the same cases by hand
against the live API.

## Endpoints

Mounted under `/api/` by `config/urls.py`; this module does not repeat the prefix.

| Method | Path | Does |
|---|---|---|
| `GET` `POST` | `/api/messages/` | List (scoped, paginated at 50) or send |
| `GET` `DELETE` | `/api/messages/<id>/` | Read or delete one |

Attaching media means uploading to `/api/media/upload/` first, then passing
`media_id` on create.

## Not here yet

`M-06` owns editing and the `is_edited` flag, `M-08` the full-text search over
this module's rows, and `SC-02` the `scheduled_at` field. `ERD.tex` also gives
`Message` an `updated_at` and an `is_delivered`, which arrive with those cards.
