import { useCallback, useEffect, useState } from 'react';
import {
  addMember as addMemberRequest,
  assignRole,
  createRole,
  deleteRole,
  listMembers,
  listRoles,
  readRoleError,
  removeMember as removeMemberRequest,
  updateRole,
  withRoleIds,
} from '../services/roles';

// The roles and members of one channel, and the four writes F-06 makes against
// them. R-02 and R-03 are the endpoints; this is the state around them.
//
// It follows useConversation.js's rule, for the same reason: **state only ever
// moves to what the server returned.** A role whose creation was refused for
// overreach (US-8.2) must not appear in the list, and a member whose assignment
// 403'd must not show the new role — the whole point of the card is that the
// server decides, so optimism here would be a lie in the one screen whose
// subject is permission.
//
// Members and roles are joined — the member list renders `role` as a *name* and
// assignment takes an *id*, and `withRoleIds` does that join. Re-doing it after
// every write is what makes "assigning a role updates the member list without a
// page reload" true.
//
// **They are not, however, read under the same permission, and #142 is where
// that stopped being an academic distinction.** Listing members needs membership;
// listing roles needs `can_change_role`. They used to load in one `Promise.all`
// behind a single `enabled` flag, which was harmless while the only consumer was
// the role manager's role editor — but `can_add_member` and `can_remove_member`
// are separate permissions, and a member holding one of those and not
// `can_change_role` got an empty screen: the roles call 403'd and took the
// member list down with it. So the two reads are independent now. `enabled`
// gates the roles half alone, and the members half loads for anybody who can see
// the channel.

export default function useChannelRoles(channelId, { enabled = true } = {}) {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!channelId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // `enabled` is `can_change_role`. Without it there are no roles to read
      // and no join to do, and the member list is still perfectly readable —
      // which is the whole point of splitting these.
      const nextRoles = enabled ? await listRoles(channelId) : [];
      const nextMembers = await listMembers(channelId);
      setRoles(nextRoles);
      setMembers(withRoleIds(nextMembers, nextRoles));
      setError('');
    } catch (caught) {
      setError(readRoleError(caught, 'The members of this channel could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [channelId, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Every write returns the server's error text rather than throwing, because
  // the interesting failures here are deliberate refusals with a message worth
  // showing — US-8.2's per-field overreach complaint above all.
  const guard = useCallback(
    async (work, fallback) => {
      try {
        await work();
        await refresh();
        setError('');
        return null;
      } catch (caught) {
        const message = readRoleError(caught, fallback);
        setError(message);
        return message;
      }
    },
    [refresh],
  );

  const create = useCallback(
    (body) => guard(() => createRole(channelId, body), 'The role could not be created.'),
    [channelId, guard],
  );

  const update = useCallback(
    (roleId, body) => guard(() => updateRole(channelId, roleId, body), 'The role could not be updated.'),
    [channelId, guard],
  );

  const remove = useCallback(
    (roleId) => guard(() => deleteRole(channelId, roleId), 'The role could not be deleted.'),
    [channelId, guard],
  );

  const assign = useCallback(
    (userId, roleId) =>
      guard(() => assignRole(channelId, userId, roleId), "The member's role could not be changed."),
    [channelId, guard],
  );

  /** US-4.4 / SH.1 — add a member. The target's `allow_invites` may refuse. */
  const addMember = useCallback(
    (userId) =>
      guard(
        () => addMemberRequest(channelId, userId),
        'That user could not be added to the channel.',
      ),
    [channelId, guard],
  );

  /** US-4.3 — remove a member. The channel owner cannot be removed. */
  const removeMember = useCallback(
    (userId) =>
      guard(
        () => removeMemberRequest(channelId, userId),
        'That member could not be removed from the channel.',
      ),
    [channelId, guard],
  );

  return {
    roles,
    members,
    loading,
    error,
    setError,
    refresh,
    create,
    update,
    remove,
    assign,
    addMember,
    removeMember,
  };
}
