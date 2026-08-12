# notifications — what happened, and to whom it matters

US-11.1 names **exactly three** events and no others:

> *"…receiving a new message, being added to a group or channel, or having my
> role in a channel changed…"*

So `Notification.Kind` is an enum of three, not a free-text string. A fourth
kind is a design decision, not a typo somebody can make in a view.

## Nothing calls this module

`architecture.tex` §5.1 keeps the core write path decoupled from delivery. The
module that owns the thing that happened **publishes an event**; this module
subscribes. `messaging`, `groups_app` and `channels_app` do not import
`notifications`, and a test asserts that they never start to.

```python
# messaging/views.py — the publisher
from common import events
events.publish(events.MESSAGE_CREATED, message=message)

# notifications/apps.py — the subscriber, in ready()
events.subscribe(events.MESSAGE_CREATED, handlers.on_message_created)
```

`common/events.py` runs handlers synchronously in the caller's thread and
swallows anything they raise. A failed notification must never fail the message
that triggered it.

| Event | Published by | Recipients |
|---|---|---|
| `MESSAGE_CREATED` | `messaging` | the DM recipient, or every member of the group or channel bar the sender |
| `MEMBER_ADDED` | `groups_app`, `channels_app` | the user who was added |
| `ROLE_CHANGED` | `roles` | the member whose role changed |

Nobody is ever notified about their own action.

## The API

Mounted under `/api/`. Every one of them is scoped to `request.user` by the
queryset itself, so "a user only ever sees their own" is not a check that can be
forgotten — there is no code path that reads another user's rows.

| Method | Path | Does |
|---|---|---|
| `GET` | `/api/notifications/` | The caller's notifications, newest first, paginated |
| `GET` | `/api/notifications/unread-count/` | `{"unread": n}` for the badge |
| `POST` | `/api/notifications/<id>/read/` | Mark one read — idempotent |
| `POST` | `/api/notifications/mark-all-read/` | Mark every unread one read |

Somebody else's id answers **404**, never 403.

## The model

`ERD.tex` fixes the shape — `user_id`, `type`, `content`, `is_read`,
`created_at` — and `notifications/tests/test_erd_alignment.py` pins it, so drift
fails CI on the day rather than being found at `INT-3`.

One column is additive: **`link`**, the SPA path the notification points at.
`U-11` asks that opening a notification navigates to its subject, and without a
stored target that is unanswerable. It carries no relationship and removes no
column; recorded as a deviation in `../../execution-plan.md`.

## Status

`N-01` and `N-02` are done. `F-08` and `RT-03` — pushing the same notifications
down the WebSocket instead of polling this API — were cut for this release; they
would subscribe to the same three events and need no change here.
