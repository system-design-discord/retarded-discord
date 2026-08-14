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

One queryset, used by the list view, the detail view and the search endpoint. Before it existed each caller had its own version and they did
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
| Edit a message | `roles.services.require_edit_message` |
| Delete a message | `roles.services.require_delete_message` |

**Editing and deleting are deliberately opposite shapes.** A channel owner, a
group admin and a holder of `can_delete_message` may all *remove* somebody
else's message; none of them may *change* one. US-3.2 — *"only and exclusively
myself"* — makes editing the author's alone in every context. Moderation is
deleting somebody's words, not putting different ones in their mouth. An edit
sets `is_edited` and `edited_at`; `created_at` is `auto_now_add`, so the
original timestamp survives by construction.

A `PATCH` reads through `MessageEditSerializer`, which exposes exactly one
writable field. Editing through the full serializer would leave `recipient`,
`group` and `topic` writable, so a `PATCH` could move somebody's message into a
different conversation while keeping its author and timestamp.

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

**Attaching into a channel topic asks `roles` first** (`A-10`). When a `topic`
target arrives together with a `media_id`, `perform_create` calls
`roles.services.require_send_media`, which refuses only when that channel has
`media_restricted` set and the sender does not hold `can_send_media`. The
`recipient` and `group` branches are untouched — the rule is keyed on a channel
and neither of those has one. The check is here as well as in `media_app`
because an upload need not declare its topic, so the upload-time gate alone
would be a bypass; `backend/media_app/README.md` explains the pair.

## Not here yet

`M-06` owns editing and the `is_edited` flag, `M-08` the full-text search over
this module's rows, and `SC-02` the `scheduled_at` field — all landed. `ERD.tex`
also gives `Message` an `updated_at` and an `is_delivered`; `is_delivered` is
what `SC-03`'s dispatcher flips when a scheduled message's time comes, and it is
also what `visible_to` filters on, which is why a pending one is invisible to
every conversation view including its author's.

## Search — `GET /api/messages/search/?q=`

US-9.1, over PostgreSQL full-text with a GIN index. `architecture.tex` chose
that over standing up a second datastore, so there is no Elasticsearch here and
there should not be one.

```python
Message.objects.visible_to(user).search(term)
```

**The scoping is the composition, not a second filter.** `search()` ranks
whatever queryset it is called on and scopes nothing itself, which is what makes
the acceptance criterion — a term appearing only in a stranger's conversation
returns zero results — true by construction rather than by a rule somebody has
to keep in step with the list view.

Two details that will bite whoever changes this next:

* The text search **configuration is `simple`**, not `english`. Message text
  here is mixed Persian and English, and an English stemmer would quietly mangle
  one of the two. It is `SEARCH_CONFIG` in `models.py`, used by both the index
  and the query, and **they must stay identical** — a mismatch does not error,
  it silently stops using the index.
* The index is an **expression** index over the same `SearchVector`
  (`message_text_search`), so there is no denormalised column to keep up to date
  and the model keeps the exact shape `ERD.tex` gives it.

A blank `q` returns nothing rather than the caller's whole history. Results
carry a `conversation` object — `{kind, id, name}`, where `kind` is `dm`,
`group` or `topic` — because in a list of hits spanning three kinds of
conversation, "where was this said" is the question the user actually has.

## Events

Creating a message publishes `common.events.MESSAGE_CREATED`. `notifications`
subscribes; this module does not import it, and
`notifications/tests/test_generation.py` asserts that it never starts to.
