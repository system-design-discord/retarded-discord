import api from './api';
import { unwrapList } from '../lib/pagination';

// The user directory — `A-11`, `GET /api/users/?search=`.
//
// Small enough to look like it does not need a module, which is exactly how the
// second copy appears. `DirectMessages.jsx` had the only one until `U-10`
// needed the same picker to add a group member.
//
// Three things the endpoint does on purpose:
//
//   * **A blank or whitespace term answers nothing**, rather than enumerating
//     the account table. Do not "helpfully" list everyone when the box is empty.
//   * **Results are `{id, username}` only.** `PublicUserSerializer` is narrow by
//     design, and in particular there is **no `allow_invites`** — SH.2 refuses
//     to let an inviter know in advance whether an invitation would be accepted.
//   * **Ranking is exact match, then prefix, then substring**, tie-broken
//     case-insensitively, so the order is deterministic. That is also why this
//     reads one page rather than following `next`: paging past a ranked list
//     would be reading the least relevant answers.

/** Users matching `term`, excluding the caller and inactive accounts. */
export async function searchUsers(term) {
  const search = term?.trim();
  if (!search) return [];
  return unwrapList(await api.get('users/', { params: { search } }));
}
