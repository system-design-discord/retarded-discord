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
docker compose exec backend python manage.py seed_data
```

Open **http://localhost:8080**. Sign in as `majid`, `amirm` or `arvin`, password `testpass123`, or
register a new account.

One origin serves the whole product:

| Path | Serves |
|---|---|
| `/` | the React SPA |
| `/api/` | the REST API |
| `/media/` | uploaded files |
| `/ws/` | the WebSocket gateway |
| `/admin/` | Django admin |

Change the published port with `NGINX_PORT` in `.env`.

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
  scheduling/       scheduled messages, background jobs
frontend/         React 19 + Vite SPA
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

`CLAUDE.md` has the fuller tour, including the current known gaps.

## Contributing

Branches are `<type>/<card-id>-<short-slug>`, commits are Conventional Commits, and every change
reaches `main` through a pull request. `../execution-plan.md` Part 6 is the full procedure.
