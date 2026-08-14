# media_app — uploads, and the channel media restriction

One entity, `MediaFile`, and two endpoints. `A-08` scoped who may read a file; `A-10` decided who may
send one.

## The API

| Method | Path | Notes |
|---|---|---|
| `POST` | `media/upload/` | multipart `file`, plus an **optional `topic`** — see below |
| `GET` | `media/upload/` | the caller's own uploads only. Deliberate, not an oversight |
| `GET` `DELETE` | `media/<id>/` | scoped to the conversation the file was attached to (`A-08`) |

Attaching is two steps: upload, then pass the returned `media_id` on `POST /api/messages/`.

## The restriction — `A-10`, US-2.4 and US-7.3

`Channel.media_restricted` is a per-channel flag, **default off**. When it is on, sending a file into
any of that channel's topics needs `can_send_media`; when it is off, every member may, the same as
posting text. The channel owner is never refused.

**This module does not decide that.** The rule is
`roles.services.may_send_media(user, channel)` / `require_send_media`, which composes the flag with
the permission so that no caller has to read `media_restricted` and work out what it means — a caller
that did would be deciding its own access, which is what `architecture.tex` §5.1 forbids. `media_app`
was the last module in the codebase doing that, and `A-10` is what closed it.

### Why the gate is in two places

An upload is **context-free**: `POST media/upload/` names no conversation, and the file is tied to a
topic only later, when `media_id` is attached to a message. So either check alone is a bypass.

1. **At upload** — `MediaUploadView.perform_create` accepts an optional `topic` in the multipart
   body. When it is present the view resolves it and asks `roles` for membership and
   `require_send_media`. This is the check that fires for the composer, which knows where the file
   is going at the moment it sends it.
2. **At attach** — `messaging.views` and `scheduling.views` ask `require_send_media` again when a
   `media_id` arrives with a `topic` target. This is the check that catches an upload that declined
   to say where it was going, and it is why the caller cannot simply omit `topic` to get around
   step 1.

With no `topic` supplied the upload behaves exactly as it did before `A-10`, which is what keeps
**DMs and groups unaffected in both states**: neither has a channel, so neither has a restriction to
evaluate. Note in particular that a group upload must *not* be routed through
`has_group_permission(..., 'can_send_media')` — `GROUP_ADMIN_PERMISSIONS` excludes that permission on
purpose, so it answers `False` for every group member including the admin.

`tests/test_media_restriction.py` covers the matrix, including both bypasses and the
grant-takes-effect-without-a-restart case (brief §5.8).

## Two things that look like bugs and are not

- `MediaUploadView.perform_create` passes the HTTP content type as `file_type`, and `MediaFile.save()`
  then overwrites it from the file extension. The view's assignment is dead code, not a wrong result.
- File size is constrained twice — `validate_file_size` on the model (10 MB) and `validate_file` on
  the serializer (an extension allowlist) — and nginx caps the request body at 12 MB.
