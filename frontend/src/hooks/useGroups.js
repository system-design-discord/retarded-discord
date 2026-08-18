import { useCallback, useEffect, useState } from 'react';
import { createGroup, deleteGroup, listGroups } from '../services/groups';
import { readApiError } from '../lib/apiError';
import usePresence from './usePresence';

// The caller's groups, and the two writes the dashboard makes against them.
// The mirror of `useChannels.js`, and the same rule: **state only ever moves to
// what the server returned.**
//
// **This hook is also the fix for a bug that had made `/groups` useless.**
// `GroupsDashboard` did `setGroups(response.data)` against a paginated body, so
// `groups.length` was `undefined`, so the screen rendered its "No Groups Yet"
// empty state however many groups you were in — issue #77's last survivor,
// three cards after `lib/pagination` was written to end it. Going through
// `listGroups` means the mistake is not available to make here.
//
// "Only groups you belong to" is not decided here either:
// `GroupListCreateView.get_queryset` filters on membership, and a UI filter on
// top would be a second, weaker copy of it.
//
// **It re-reads on `structure.version`**, exactly as `useChannels` does and for
// the same reason: a group somebody else deleted has to leave this list, and a
// group somebody just added you to has to join it, without a reload.

export default function useGroups() {
  const { structure } = usePresence();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // `quiet` for the re-reads nobody asked for — see `useChannels.js`.
  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      setGroups(await listGroups());
      setError('');
    } catch (caught) {
      if (!quiet) setError(readApiError(caught, 'Your groups could not be loaded.'));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!structure.version) return;
    refresh({ quiet: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure.version]);

  /**
   * US-5.1 — create a group and become its admin.
   *
   * Returns the created group, or `null` if the server refused. Re-reads rather
   * than appending the response, so the new row carries its nested `admin` and
   * `members` exactly as every other row does.
   */
  const create = useCallback(
    async (body) => {
      try {
        const created = await createGroup(body);
        await refresh();
        setError('');
        return created;
      } catch (caught) {
        setError(readApiError(caught, 'The group could not be created.'));
        return null;
      }
    },
    [refresh],
  );

  /**
   * US-6.2 — delete a group. Admin only.
   *
   * Answers `true`, not a cascade report: the API returns 204 with no body, so
   * unlike a channel delete there is genuinely nothing to tell the user about
   * what went with it.
   */
  const remove = useCallback(
    async (groupId) => {
      try {
        await deleteGroup(groupId);
        await refresh();
        setError('');
        return true;
      } catch (caught) {
        setError(readApiError(caught, 'The group could not be deleted.'));
        return null;
      }
    },
    [refresh],
  );

  return { groups, loading, error, setError, refresh, create, remove };
}
