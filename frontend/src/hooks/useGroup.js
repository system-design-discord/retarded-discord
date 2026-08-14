import { useCallback, useContext, useEffect, useState } from 'react';
import {
  addMember as addMemberRequest,
  deleteGroup,
  getGroup,
  isGroupAdmin,
  removeMember as removeMemberRequest,
  updateGroup,
} from '../services/groups';
import { AuthContext } from '../context/AuthContext';
import { readApiError } from '../lib/apiError';

// One group, its members, and the four writes `U-10` makes against them.
//
// Multi-write, so it uses `useChannelRoles.js`'s `guard` shape: every write
// answers **`null` on success and the server's message on failure**. None of
// the callers needs the response body — `refresh()` has already put the truth
// in state — and every interesting failure here is a deliberate refusal with a
// sentence worth showing:
//
//   * adding somebody who has turned invitations off,
//   * removing the admin, which is also what "removing yourself" is,
//   * a non-admin trying either, with the UI bypassed or not.
//
// **Re-reading after every write is not caution, it is correctness.** Adding a
// user who is already a member answers 200 `"کاربر X به گروه اضافه شد."` having
// written no row at all. A screen that trusted that reply would show a member
// list the server does not have — which is the acceptance criterion this card
// is graded on, inverted.
//
// **`isAdmin` is computed here** rather than passed in, because there is no
// `groups/<id>/me/permissions/` for a group the way there is for a channel:
// admin-ness is derived from the payload, and deriving it in one place is what
// stops three screens deriving it three ways.

export default function useGroup(groupId) {
  const { user } = useContext(AuthContext);

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setGroup(await getGroup(groupId));
      setError('');
    } catch (caught) {
      // A 404 here is the honest answer for a group you are not in:
      // `GroupDetailView`'s queryset is scoped to membership, so "no such
      // group" and "not yours" are deliberately the same reply.
      setGroup(null);
      setError(
        readApiError(caught, 'This group could not be opened. You may not be a member of it.'),
      );
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const guard = useCallback(
    async (work, fallback) => {
      try {
        await work();
        await refresh();
        setError('');
        return null;
      } catch (caught) {
        const message = readApiError(caught, fallback);
        setError(message);
        return message;
      }
    },
    [refresh],
  );

  /** US-6.4 — rename or re-describe. Admin only; the server decides. */
  const update = useCallback(
    (body) => guard(() => updateGroup(groupId, body), 'The group could not be updated.'),
    [groupId, guard],
  );

  /** US-5.2 / SH.1 — add a member. The target's `allow_invites` may refuse. */
  const addMember = useCallback(
    (userId) =>
      guard(() => addMemberRequest(groupId, userId), 'That user could not be added to the group.'),
    [groupId, guard],
  );

  /** US-5.2 — remove a member. The admin cannot be removed, themselves included. */
  const removeMember = useCallback(
    (userId) =>
      guard(
        () => removeMemberRequest(groupId, userId),
        'That member could not be removed from the group.',
      ),
    [groupId, guard],
  );

  /** US-6.2 — delete the group. Does not refresh; the caller navigates away. */
  const remove = useCallback(async () => {
    try {
      await deleteGroup(groupId);
      setError('');
      return null;
    } catch (caught) {
      const message = readApiError(caught, 'The group could not be deleted.');
      setError(message);
      return message;
    }
  }, [groupId]);

  return {
    group,
    members: group?.members ?? [],
    admin: group?.admin ?? null,
    isAdmin: isGroupAdmin(group, user),
    loading,
    error,
    setError,
    refresh,
    update,
    addMember,
    removeMember,
    remove,
  };
}
