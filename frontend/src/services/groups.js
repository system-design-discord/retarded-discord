import api from './api';
import { fetchAllPages } from '../lib/pagination';
import { toRequestBody } from '../lib/multipart';

// The one place in the SPA that knows the group API's shape.
//
// The endpoints are `backend/groups_app/urls.py`, and there are only three of
// them. Seven things about that surface have cost time already, so they are
// stated once here rather than being rediscovered in a component:
//
//   * **`POST groups/<id>/members/` with `{user_id, action}` is the only member
//     mutation.** `DELETE groups/<id>/members/<user_id>/` looks like it should
//     exist because `channels_app` has exactly that shape. It does not.
//   * **Refusals here are keyed `error`, not `detail`,** because the view hand-
//     rolls them instead of raising. `lib/apiError` treats both as anonymous.
//   * **The admin gate runs *before* the body is validated,** deliberately: an
//     unauthorized caller learns nothing about the parameters. So a non-admin
//     sending nonsense gets 403, not 400.
//   * **Adding is refused by the *target's* `allow_invites`, and that flag is
//     unreadable in advance.** `PublicProfileSerializer` omits it on purpose —
//     SH.2 is precisely that an inviter may not know. So the UI cannot grey
//     anybody out; it attempts the add and shows the 403.
//   * **Removing the group admin is a 400, not a 403,** and since a group has
//     exactly one admin, "remove the last admin" and "the admin removes
//     themselves" are the same refusal.
//   * **There is no leave endpoint.** A plain member removing themselves hits
//     the admin gate above and gets 403. Nothing in the UI should offer it.
//   * **`DELETE groups/<id>/` answers 204 with no body** — unlike a channel
//     delete, which reports what cascaded. There is nothing to show afterwards.
//
// Writable fields on a group are exactly `name`, `description` and `avatar`;
// `members` is read-only and changes only through the members endpoint.
//
// Nothing here decides access. The list is scoped by `GroupListCreateView` to
// groups the caller belongs to, edit and delete are gated on
// `roles.may_edit_group` / `roles.may_delete_group` — which is *membership*,
// not the admin flag (#124) — and every refusal below is the server's.

/** Groups the caller belongs to, across all pages. */
export function listGroups() {
  return fetchAllPages(api, 'groups/');
}

/**
 * One group, with its members nested.
 *
 * A non-member gets **404, not 403** — the queryset excludes them, so "no such
 * group" and "not yours" are deliberately the same reply.
 */
export async function getGroup(groupId) {
  const response = await api.get(`groups/${groupId}/`);
  return response.data;
}

/**
 * US-5.1 — create a group and become its admin.
 *
 * No second call: `perform_create` writes the creator's `GroupMember` with
 * `is_admin=True` in the same request.
 */
export async function createGroup(body) {
  const response = await api.post('groups/', body);
  return response.data;
}

/** US-6.4 — rename or re-describe a group. Group admin only; the server checks
 *  `can_edit_channel`, which is the permission name a group reuses because it
 *  has no role table of its own. */
export async function updateGroup(groupId, body) {
  // A `File` under `avatar` promotes the write to multipart; anything else
  // stays JSON. `lib/multipart` owns that branch so this file and the two
  // beside it cannot disagree about it.
  const response = await api.patch(`groups/${groupId}/`, toRequestBody(body));
  return response.data;
}

/** Delete a group. Admin only (`can_delete_channel`). 204 and no body, so
 *  there is nothing to return and nothing to report. */
export async function deleteGroup(groupId) {
  await api.delete(`groups/${groupId}/`);
  return null;
}

/**
 * US-5.2 / SH.1 — add a member.
 *
 * Refused with 403 if the target has turned group invitations off, and that is
 * not knowable beforehand. Adding somebody who is already a member answers a
 * cheerful 200 having written nothing, which is why every caller re-reads the
 * group rather than trusting this.
 */
export async function addMember(groupId, userId) {
  const response = await api.post(`groups/${groupId}/members/`, {
    user_id: userId,
    action: 'add',
  });
  return response.data;
}

/** US-5.2 — remove a member. Admin only, and never the admin themselves. */
export async function removeMember(groupId, userId) {
  const response = await api.post(`groups/${groupId}/members/`, {
    user_id: userId,
    action: 'remove',
  });
  return response.data;
}

/**
 * Whether `user` administers `group`.
 *
 * This lives here because it *is* the API's shape rather than a convenience:
 * there is no `groups/<id>/me/permissions/` the way there is for a channel, so
 * the only answer available to a client is the `admin` object on the group
 * itself. Three screens ask the question and one comparison is what stops them
 * answering it three slightly different ways.
 */
export function isGroupAdmin(group, user) {
  return Boolean(group?.admin?.id && user?.id && group.admin.id === user.id);
}
