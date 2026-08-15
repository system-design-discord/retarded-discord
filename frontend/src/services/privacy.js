import api from './api';

// The one place in the SPA that knows the privacy API's shape.
//
// The endpoint is `PrivacySettingsView` in `backend/accounts/urls.py`, mounted
// at `settings/privacy/`, and it carries exactly one field: `allow_invites`, a
// plain boolean. Four things about it have cost time already, so they are
// stated once here rather than being rediscovered in a component:
//
//   * **It is `settings/privacy/`, not `auth/privacy/` and not
//     `auth/preferences/`.** Both of those are 404s in both directions, and
//     both were live in `settings/` until #100.
//   * **`allow_invites` is the only privacy field the backend has.** There is
//     no friends concept anywhere in the ERD and no per-conversation privacy,
//     so anything else a screen offers corresponds to nothing.
//   * **Read and write answer different shapes.** `GET` is
//     `{allow_invites}`; `PATCH` is `{success, allow_invites}`. Both are read
//     through `readAllowInvites` below so no caller has to know which it got.
//   * **A refusal is keyed `error`,** not `detail` — the view hand-rolls its
//     400 rather than raising. `lib/apiError` treats both as anonymous.
//
// The flag is the *target's*, and it is deliberately unreadable by anybody
// else: `PublicProfileSerializer` omits it (SH.2), so an inviter cannot know in
// advance and finds out from the 403 when they try.

function readAllowInvites(response) {
  return Boolean(response?.data?.allow_invites);
}

/** The caller's own `allow_invites`. */
export async function getAllowInvites() {
  return readAllowInvites(await api.get('settings/privacy/'));
}

/**
 * Set it, and answer what the server stored rather than what was sent.
 *
 * The view echoes the saved value back, so a caller that seeds its state from
 * this reply cannot drift from the database the way one seeding from its own
 * form would.
 */
export async function setAllowInvites(allowInvites) {
  return readAllowInvites(await api.patch('settings/privacy/', { allow_invites: allowInvites }));
}
