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
  groups_app/       Group
  channels_app/     Channel, ChannelMember (Topic still open — see its README)
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

`CLAUDE.md` has the fuller tour, including the current known gaps.

## Contributing

Branches are `<type>/<card-id>-<short-slug>`, commits are Conventional Commits, and every change
reaches `main` through a pull request. `../execution-plan.md` Part 6 is the full procedure.
