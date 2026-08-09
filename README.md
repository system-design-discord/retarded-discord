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

## Layout

```
backend/          Django 6 + DRF + Channels, PostgreSQL
  config/           settings, urls, asgi, wsgi
  common/           cross-module event seam
  accounts/         User, Profile, auth
  messaging/        Message
  groups_app/       Group
  channels_app/     Channel, Topic, ChannelMember
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

`CLAUDE.md` has the fuller tour, including the current known gaps.

## Contributing

Branches are `<type>/<card-id>-<short-slug>`, commits are Conventional Commits, and every change
reaches `main` through a pull request. `../execution-plan.md` Part 6 is the full procedure.
