import api from './api';

// The one place in the SPA that knows the own-profile API's shape.
//
// Three screens read and write a profile — `profile/ViewProfile`,
// `profile/EditProfile` and `settings/MyAccount` — and all three had derived
// the endpoint themselves. All three derived it wrong, in the same way, and
// that is #96 and #97:
//
//   * **The own profile is `GET`/`PATCH /api/profile/`,** `ProfileDetailView`,
//     a `RetrieveUpdateAPIView`. `auth/me/` is a `RetrieveAPIView`, so a
//     `PATCH` at it is a **405** and nothing anybody typed was ever saved.
//   * **`auth/me/` renders through `UserSerializer`, whose fields are `id`,
//     `username` and `email`** — no `bio`. That is why the bio read back as
//     `undefined` and the "no bio yet" fallback was permanent even for a user
//     who had set one. `UserSerializer` is deliberately *not* widened to fix
//     it: several modules nest it, and it is the minimal public shape.
//     `AuthContext` still calls `auth/me/`, because an id is all it wants.
//   * **The reply says everything twice.** `ProfileSerializer` nests `user` and
//     *also* maps `username`/`email` onto `user.*` at the top level, so
//     `data.username` and `data.user.username` are the same string.
//     `normalizeProfile` flattens it so no component has to pick.
//
// Writing an avatar means **multipart**: `Profile.avatar` is an `ImageField`
// and DRF's default parsers accept `MultiPartParser`, so `updateMyProfile`
// switches on the presence of a `File` rather than making every caller build a
// `FormData` it usually does not need.

/**
 * One flat profile, whichever of the two serialised shapes it arrived in.
 *
 * `ProfileSerializer` (own) carries `user: {id, username, email}` plus a
 * repeated top-level `username`/`email`; `PublicProfileSerializer` (#101's,
 * another user's) carries `user: {id, username}` and no email at all. Both
 * answer the same object here, so a screen rendering one renders the other.
 */
export function normalizeProfile(data) {
  const user = data?.user ?? {};
  return {
    id: user.id ?? null,
    username: data?.username ?? user.username ?? '',
    email: data?.email ?? user.email ?? '',
    bio: data?.bio ?? '',
    avatar: data?.avatar ?? null,
    allowInvites: data?.allow_invites,
  };
}

/** The caller's own profile, bio included. */
export async function getMyProfile() {
  return normalizeProfile((await api.get('profile/')).data);
}

/**
 * Patch the caller's own profile, and answer what the server stored.
 *
 * Takes camelCase-free field names because they go straight at the API:
 * `username`, `email`, `bio`, `avatar`, `allow_invites`. An `avatar` that is a
 * `File` promotes the whole request to multipart; anything else stays JSON.
 * Answering the saved row rather than the submitted one is what stops a screen
 * seeding its state from its own form and drifting from the database.
 */
export async function updateMyProfile(fields) {
  const { avatar, ...rest } = fields;

  if (!(avatar instanceof File)) {
    const body = avatar === undefined ? rest : { ...rest, avatar };
    return normalizeProfile((await api.patch('profile/', body)).data);
  }

  const form = new FormData();
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  form.append('avatar', avatar);

  return normalizeProfile((await api.patch('profile/', form)).data);
}
