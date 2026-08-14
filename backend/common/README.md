# common — the seams the nine modules share

`common/` is not a tenth module. It holds the few things that would otherwise be
copied into several of the nine, and nothing that belongs to any one of them.

| File | What it is |
|---|---|
| `events.py` | The event seam. A module announces what happened; `notifications` listens. Neither imports the other. |
| `permissions.py` | DRF glue for `roles.services`, so a view declares `required_permission` instead of writing an `if`. |
| `mixins.py` | Small serializer/view helpers used in more than one app. |
| `messages.py` | Every string the API can put in front of a user. |

## The one rule worth stating

**The interface speaks English, and any string the SPA can render lives in
`messages.py`.**

The product used to be half a language apart from itself: an English SPA — every
screen, every wireframe, every user story — answered by a Persian API, so a
refused group edit rendered English chrome around a Persian sentence, and the
seeded demo world was Persian too. Issue #127 closed that.

Keeping the text here rather than at the `raise` site is what stops it drifting
back. Four sentences already existed twice over before this module did:
`NO_PERMISSION` was written out in `common/permissions.py` and twice more in
`roles/services.py`, which is how one of them gets reworded and the other does
not.

Two exclusions are deliberate:

- **Model `verbose_name`s are Persian and stay Persian.** They are Django admin
  metadata; no user of the SPA ever sees one, and translating all sixty-five
  would mean an `AlterField` migration in six apps for nothing on screen.
- **Message text is whatever language a user types.** That is exactly why
  `messaging.models.SEARCH_CONFIG` is `'simple'` rather than a stemmer
  (execution plan, deviation 11). Mixed *message* text is a feature; mixed
  *interface* text was not.

Notification `Kind` labels are the one user-facing string that is *not* here:
they are field choices, `notifications.serializers` exposes them as the `title`
the SPA renders, and moving them out of the model would put a migration's
contents somewhere the migration cannot see.
