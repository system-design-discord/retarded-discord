import api from './api';
import { readApiError } from '../lib/apiError';
import { fetchAllPages } from '../lib/pagination';

// The one place in the SPA that knows the roles API's shape.
//
// The endpoints live in `backend/roles/urls.py`, *not* in `channels_app`, even
// though every one of them hangs off `channels/<id>/`. Three things about them
// are worth stating once here rather than being rediscovered in a component:
//
//   * **Listing roles needs `can_change_role`, not just membership.** Read
//     `myPermissions` first and decide what to render; a screen that fires the
//     roles list at a plain member earns a 403 it could have predicted.
//   * **Assigning takes a role *id*; the member list returns a role *name*.**
//     `ChannelMemberSerializer` renders `role` as `role.name`, so the two
//     endpoints do not speak the same currency. `withRoleIds` below reconciles
//     them — role names are unique per channel (`unique_role_name_per_channel`),
//     which is what makes that safe.
//   * **`role: null` clears a member's role**, it does not remove them from the
//     channel. Removal is `channels_app`'s endpoint and a different permission —
//     `removeMember` below, gated on `can_remove_member` rather than
//     `can_change_role`. Both live here because this is already the only file
//     naming `channels/<id>/members/`, and a second one would drift (#142).
//
// Hiding a control is not a permission check. Everything here is refused by the
// server as well, and INT-2's matrix exercises exactly these paths with the UI
// bypassed.
//
// The channel and topic endpoints are **not** here — `services/channels.js`
// owns those. This file borrowed `listChannels` and `getChannel` while F-06 was
// the only screen with a channel to name; F-04 took them back.

/**
 * US-8.3 — what the caller may do in this channel, and under what role name.
 *
 * Answers `{channel, is_owner, role, permissions}` and needs membership only,
 * so it is safe to call before knowing anything else. The channel owner comes
 * back holding all eight implicitly.
 */
export async function myPermissions(channelId) {
  const response = await api.get(`channels/${channelId}/me/permissions/`);
  return response.data;
}

/** Every role defined in this channel. Needs `can_change_role`. */
export function listRoles(channelId) {
  return fetchAllPages(api, `channels/${channelId}/roles/`);
}

/**
 * US-8.1 — define a role with a name of your own choosing.
 *
 * US-8.2 is enforced on the way in: granting a permission the caller does not
 * themselves hold is a 400 with a per-field message, so a super-admin cannot
 * mint a role more powerful than they are and assign it to themselves.
 */
export async function createRole(channelId, body) {
  const response = await api.post(`channels/${channelId}/roles/`, body);
  return response.data;
}

/** Rename a role or change what it grants. Same US-8.2 rule applies. */
export async function updateRole(channelId, roleId, body) {
  const response = await api.patch(`channels/${channelId}/roles/${roleId}/`, body);
  return response.data;
}

/**
 * Delete a role.
 *
 * `ChannelMember.role` is `SET_NULL`, so its holders stay in the channel and
 * simply stop holding anything. Nobody is removed.
 */
export function deleteRole(channelId, roleId) {
  return api.delete(`channels/${channelId}/roles/${roleId}/`);
}

/** Every membership row in this channel. Needs membership, not a permission. */
export function listMembers(channelId) {
  return fetchAllPages(api, `channels/${channelId}/members/`);
}

/**
 * R-03 / US-4.9 — assign, change or clear the role a member holds.
 *
 * The change is one column write and `roles.services` reads that column on
 * every call, so it takes effect on the member's very next request with no
 * restart and no deploy. That is brief §5.8, and it is the thing INT-2 checks.
 */
export async function assignRole(channelId, userId, roleId) {
  const response = await api.patch(`channels/${channelId}/members/${userId}/role/`, {
    role: roleId ?? null,
  });
  return response.data;
}

/**
 * US-4.4 / SH.1 — add somebody to this channel. Needs `can_add_member`.
 *
 * Direct, not an invitation: SH.1 records the team's decision to add users
 * straight in rather than through a link. **SH.2 is the other half of that
 * decision** — the target's own `allow_invites` can refuse, and it answers 403
 * naming them. That refusal is not predictable from here: `PublicUserSerializer`
 * withholds the flag on purpose, so the directory cannot tell an inviter in
 * advance whether the invitation would be accepted.
 *
 * Adding somebody already in the channel is a 400, not a cheerful no-op — which
 * is the opposite of how `groups_app` answers the same mistake.
 */
export async function addMember(channelId, userId) {
  const response = await api.post(`channels/${channelId}/members/`, { user_id: userId });
  return response.data;
}

/**
 * US-4.3 — remove somebody from this channel. Needs `can_remove_member`.
 *
 * The owner cannot be removed and the server answers 400 saying so: `ERD.tex`
 * makes `Channel : ChannelMember` a `1 : 1..N`, and removing the one member who
 * implicitly holds every permission would leave a channel nobody can administer.
 *
 * Distinct from clearing a role, which is `assignRole(…, null)` above: that
 * leaves them in the channel holding nothing, this takes them out of it.
 */
export function removeMember(channelId, userId) {
  return api.delete(`channels/${channelId}/members/${userId}/`);
}

/**
 * Members with their role resolved to an id.
 *
 * The member list carries `role` as a display name and the assign endpoint
 * wants an id, so a `<select>` bound to ids has nothing to select against until
 * the two are joined. Doing it here keeps the mismatch in the file that owns
 * the API's shape instead of in a component — and keeps it out of
 * `channels_app/serializers.py`, which is another card's module.
 */
export function withRoleIds(members, roles) {
  const idByName = new Map(roles.map((role) => [role.name, role.id]));
  return members.map((member) => ({
    ...member,
    role_id: member.role ? (idByName.get(member.role) ?? null) : null,
  }));
}

/**
 * The server's complaint, in the shape DRF actually sends it.
 *
 * Kept as a name because `RoleManager.jsx` and `useChannelRoles.js` call it;
 * the reader itself is `lib/apiError.js`, shared with the channels service.
 */
export const readRoleError = readApiError;
