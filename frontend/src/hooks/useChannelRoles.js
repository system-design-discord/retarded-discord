import { useCallback, useEffect, useState } from 'react';
import {
  assignRole,
  createRole,
  deleteRole,
  listMembers,
  listRoles,
  readRoleError,
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
// Members and roles load together because they are joined: the member list
// renders `role` as a *name* and assignment takes an *id*. `withRoleIds` does
// that join, and re-doing it after every write is what makes "assigning a role
// updates the member list without a page reload" true.

export default function useChannelRoles(channelId, { enabled = true } = {}) {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!channelId || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Members need membership only, roles need `can_change_role`. Asking for
      // both together means one failure reports one error, which is what a
      // reader of this screen wants — not two half-loaded panels.
      const [nextRoles, nextMembers] = await Promise.all([
        listRoles(channelId),
        listMembers(channelId),
      ]);
      setRoles(nextRoles);
      setMembers(withRoleIds(nextMembers, nextRoles));
      setError('');
    } catch (caught) {
      setError(readRoleError(caught, 'The roles for this channel could not be loaded.'));
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

  return { roles, members, loading, error, setError, refresh, create, update, remove, assign };
}
