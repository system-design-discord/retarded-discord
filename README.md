# Retarded Discord

A Discord-like messaging platform — direct messages, groups, channels with topics, configurable
roles and permissions, media sharing, search and notifications.

Phase 2 of the **Analysis and Design of Systems** (CE 40418) course project. The Phase 1 design
documents — the brief, architecture, ERD, user stories, methodology, execution plan and sprint
calendar — live in the parent directory.

## Quick start

Everything you need is Docker.

```bash
cp .env.example .env
docker compose up --build
```

Open **http://localhost:8080**. Sign in as `majid`, `amirm` or `arvin`, password `testpass123`, or
register a new account.

The seed also builds one channel with two topics and a `ناظر` role that grants `can_create_topic`
and `can_delete_message` but **not** `can_send_media` — held by `amirm`, while `arvin` holds no role
and `majid` owns the channel and so implicitly holds all eight. That arrangement is what `INT-2`'s
permission matrix runs against, and it is pinned by `backend/accounts/tests/test_seed_data.py`.

The demo accounts are seeded by the backend's entrypoint on every start, so those two commands are
the whole of it. Seeding is idempotent and re-runnable by hand
(`docker compose exec backend python manage.py seed_data`); set `DJANGO_SEED_DATA=false` in `.env`
if you would rather start from an empty database.

One origin serves the whole product:

| Path | Serves |
|---|---|
| `/` | the React SPA |
| `/api/` | the REST API |
| `/media/` | uploaded files |
| `/ws/` | the WebSocket gateway |
| `/admin/` | Django admin |

Change the published port with `NGINX_PORT` in `.env`.

### On Windows

Nothing extra to install and nothing extra to run — Docker Desktop and the two commands above. One
thing is worth knowing, because it has cost this team an evening.

Git for Windows installs with `core.autocrlf=true`, which rewrites text files to CRLF on checkout.
Every file here is read by a Linux container, and a `\r` on the first line of `entrypoint.sh` makes
Docker fail with:

```
exec /entrypoint.sh: no such file or directory
```

which names a file that plainly exists. The backend then restarts forever, so
`docker compose exec backend ...` cannot run either — which is why the same bug also shows up as
**"no such user" at the login screen**: the seed never got a chance to run.

`.gitattributes` pins every text file to LF, so a clone made today is already correct, and
`backend/Dockerfile` strips CR out of the entrypoint at build time. Between them the stack comes up
from a working tree in any state — a tree with CRLF in every single file is part of the test for
this — so **you do not have to fix your checkout to run the project**:

```bash
git pull
docker compose down -v            # only if the stack is already in a bad state
docker compose up --build
```

Fixing the checkout is still worth doing, because CRLF in the *source* is the next person's merge
conflict. Note that pulling `.gitattributes` does not convert files you already have, and neither
does `git add --renormalize .` — once `eol=lf` is in force, Git converts your CRLF file to LF before
comparing it to the index, decides nothing has changed, and leaves the file alone. The command that
actually rewrites the working tree empties the index and checks everything out again:

```bash
git status            # must be clean: the next command discards uncommitted work
git rm --cached -r .
git reset --hard
```

### On Linux

If `id -u` prints something other than `1000`, set `APP_UID` and `APP_GID` in `.env` to your own and
rebuild. The backend source is bind-mounted, so the container writes to your files as that uid;
mismatched, anything writing into the tree (pytest's cache, most visibly) fails on permissions.

## Working on it

Frontend with hot reload, against the containerised backend:

```bash
cd frontend && npm install && npm run dev     # http://localhost:5173
```

Backend management commands:

```bash
docker compose exec backend python manage.py <command>
```

The backend source is bind-mounted, so a code change needs
`docker compose restart backend`, not a rebuild. Only a `requirements.txt`
change needs `--build`.

Tests and lint, the same two commands CI runs:

```bash
docker compose exec backend pytest
docker compose exec backend ruff check .

cd frontend && npm run lint && npm run build
```

`.github/workflows/ci.yml` runs both on every pull request. It is
**informational** — `main` requires a pull request but no passing check, so a
red build never blocks a merge. It is there to catch a missing migration or an
unformatted import before somebody runs an `INT-*` script by hand.

## Layout

```
backend/          Django 6 + DRF + Channels, PostgreSQL
  config/           settings, urls, asgi, wsgi
  common/           cross-module event seam
  accounts/         User, Profile, auth
  messaging/        Message
  groups_app/       Group, GroupMember
  channels_app/     Channel, ChannelMember, Topic; channel, topic and member API
  roles/            Role, permission evaluation
  media_app/        MediaFile
  notifications/    Notification
  realtime/         WebSocket consumers
  scheduling/       scheduled-message API; Celery app in config/
frontend/         React 19 + Vite SPA
  src/components/   one directory per screen family
    chat/             the conversation view and its primitives
    layout/           the navigation rail
  src/hooks/        useConversation — one conversation, whichever kind
  src/services/     api.js (axios + JWT refresh), messages.js
  src/lib/          pagination helpers
nginx/            edge reverse proxy
```

The nine backend modules are the module decomposition in `../architecture.tex` §5, one Django app
each. The rule that holds it together: **no module decides permissions for itself** — they all ask
`roles`. See `backend/roles/README.md`.

### Access control

A role is a row in a table, not a constant in a source file, which is what makes access levels
changeable without editing code (brief §5.8). Every privileged action asks `roles.services`:

```python
from roles import services

services.require_permission(request.user, channel, 'can_delete_message')
```

The eight permissions are `can_send_media`, `can_delete_message`, `can_create_topic`,
`can_edit_channel`, `can_remove_member`, `can_add_member`, `can_change_role` and
`can_delete_channel`. The channel owner holds all eight implicitly.

| Method | Endpoint | Does |
|---|---|---|
| `GET` `POST` | `/api/channels/<id>/roles/` | List or create a role |
| `GET` `PATCH` `DELETE` | `/api/channels/<id>/roles/<role_id>/` | Read, rename, re-grant or delete one |
| `GET` `PUT` `PATCH` | `/api/channels/<id>/members/<user_id>/role/` | Assign or clear a member's role |
| `GET` | `/api/channels/<id>/me/permissions/` | What the caller may do in this channel |

### Channels

A channel has an owner, members, topics and its own roles. Creating one makes you
its owner, and the owner implicitly holds all eight permissions — there is no role
row to lose. Every other action is gated by one of them, evaluated by `roles`.

| Method | Endpoint | Needs |
|---|---|---|
| `GET` `POST` | `/api/channels/` | authentication; the list is only channels you own or joined |
| `GET` | `/api/channels/<id>/` | membership |
| `PUT` `PATCH` | `/api/channels/<id>/` | `can_edit_channel` |
| `DELETE` | `/api/channels/<id>/` | `can_delete_channel` |
| `GET` `POST` | `/api/channels/<id>/topics/` | membership / `can_create_topic` |
| `GET` `PATCH` `DELETE` | `/api/channels/<id>/topics/<topic_id>/` | membership / `can_edit_channel` |
| `GET` `POST` | `/api/channels/<id>/members/` | membership / `can_add_member` |
| `DELETE` | `/api/channels/<id>/members/<user_id>/` | `can_remove_member` |

Adding a member also honours the **target's** `allow_invites` flag: with it off the
add is a 403 and no row is written, whatever the actor holds (SH.2).

Deleting a channel or a topic cascades, so both answer **200 with what went with
it** rather than a silent 204 — `{"deleted_messages": 3}` for a topic,
`{"deleted": {"topics": …, "members": …, "roles": …, "messages": …}}` for a channel.

Messages inside a topic are `messaging`'s: `GET /api/messages/?topic_id=<id>` and
`POST /api/messages/` with a `topic`. There is deliberately no message endpoint
nested under a channel. `backend/channels_app/README.md` is the detail.

### Messages

A message has **exactly one** target — a `recipient` (direct message), a `group`, or a `topic` in a
channel — refused both by the serializer and by a database check constraint. What you may read is
`Message.objects.visible_to(user)`, one queryset shared by every caller; anything outside it is a
404, never a 403.

Who may delete one is `roles.services.may_delete_message`, and it depends on where the message is:

| Context | Who may delete | Stories |
|---|---|---|
| Any | the author, always | US-3.3 |
| Group | the group admin | US-3.5, US-5.3 |
| Channel topic | the channel owner, or a role granting `can_delete_message` | US-3.4, US-3.6, US-4.6 |
| Direct message | only the author — never the recipient | US-3.3 |

`backend/messaging/README.md` is the detail.

### Real time

**Bonus, and complete end to end.** `RT-01` put the channel layer on Redis and `RT-02` replaced the
WebSocket consumer, which used to take the sender's identity from the client's JSON payload — so
anyone could post as anyone — and wrote straight to the database, bypassing every check the REST
path makes. `F-07` is its client, `RT-03` added notifications and `F-08` is theirs.

    ws://<host>/ws/dm/<user_id>/?token=<access>
    ws://<host>/ws/group/<group_id>/?token=<access>
    ws://<host>/ws/topic/<topic_id>/?token=<access>
    ws://<host>/ws/notifications/?token=<access>

Every socket is **delivery only**: messages are written with `POST /api/messages/` and pushed from
`common.events.MESSAGE_CREATED`, notifications are written by `notifications.services` and pushed
from `NOTIFICATION_CREATED`, so there is still exactly one write path for each. Identity is the
JWT's, membership is `roles.services`' answer, and a refusal is `4401` (no/bad token), `4403` (not
in this conversation) or `4404` (no such conversation).

The notification route takes **no id** — a notification belongs to one person and that person is
whoever the token says you are — and it is addressed to a per-user channel-layer group, so a
recipient receives only their own without any check on arrival. `notifications` and `realtime` do
not import each other in either direction, which is why the payload is serialized by the module that
owns it and forwarded by the one that does not; an AST test asserts both directions.

In the SPA, `frontend/src/lib/socket.js` is the only file that knows a WebSocket exists.
Conversations keep a poll underneath as a fallback (thirty seconds while connected, five while not);
the notification list re-reads on every reconnect and merges arrivals by id, so a dropped connection
loses nothing and duplicates nothing. `backend/realtime/README.md` is the detail.

### Scheduled messages

**Bonus, server side, and deliberately unfinished.** `SC-01` wired Celery to a RabbitMQ broker and
added the `celery_worker` and `celery_beat` services to compose; `SC-02` added the API:

    POST   /api/messages/schedule/          a message plus a future scheduled_at
    GET    /api/messages/scheduled/         the caller's pending schedules
    DELETE /api/messages/scheduled/<id>/cancel/

A scheduled message is an ordinary `Message` row carrying `scheduled_at` and `is_delivered=False`.
`Message.objects.visible_to` filters on `is_delivered`, so it stays out of every conversation view —
the author's included — until it is released. Posting into a group or a topic asks `roles` for
membership exactly as `POST /api/messages/` does, so scheduling cannot be used to reach a
conversation you could not write to now.

`U-12` added the UI: the clock button on every conversation's composer opens a modal that picks a
time, lists what is pending and cancels one. It refuses a past time before the request as well as
after it.

**The dispatcher does not exist yet.** There is no `scheduling/tasks.py` and no beat schedule, so
the worker starts with an empty task list and a scheduled message is stored and never sent. That is
`SC-03`, whose issue was closed on Aug 14 **without the code being written**. The two Celery
containers running is not evidence to the contrary, which is exactly why the composer carries a
notice saying so and marks a row whose time has passed as *overdue*.

### The chat surface

Direct messages, groups and channel topics are the same UI with a different target, rendered through
one set of primitives in `frontend/src/components/chat/`. There is exactly one message bubble in the
codebase and it is meant to stay that way. `frontend/src/components/chat/README.md` is the detail,
including the three field-name traps that have cost this project time.

`CLAUDE.md` has the fuller tour, including the current known gaps.

## Contributing

Branches are `<type>/<card-id>-<short-slug>`, commits are Conventional Commits, and every change
reaches `main` through a pull request. `../execution-plan.md` Part 6 is the full procedure.
