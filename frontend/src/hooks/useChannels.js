import { useCallback, useEffect, useState } from 'react';
import { createChannel, deleteChannel, listChannels } from '../services/channels';
import { readApiError } from '../lib/apiError';
import usePresence from './usePresence';

// The caller's channels, and the two writes the dashboard makes against them.
//
// It follows `useChannelRoles.js`'s rule, which followed `useConversation.js`'s,
// for the same reason: **state only ever moves to what the server returned.**
// A channel whose creation was refused must not appear in the list, and a
// delete the server refused must not remove the row — the list is a claim about
// what exists on the server, and the only honest source for it is the server.
//
// "Only channels you belong to" is not decided here either.
// `ChannelListCreateView.get_queryset` filters to `Q(owner=user) |
// Q(memberships__user=user)`, so the list is the API's answer and a UI filter
// on top would be a second, weaker copy of it.
//
// **It re-reads on `structure.version` too**, which is what makes a channel
// somebody else deleted leave this list, and a channel somebody just added you
// to join it, without a reload. It re-reads on *any* structural change rather
// than filtering for the ones about channels: this is a list, so it does not
// know which of its rows a given id belongs to without looking, and looking is
// the re-read. `useChannel` — which holds exactly one — is the hook that can
// afford to be choosy.

export default function useChannels() {
  const { structure } = usePresence();

  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // `quiet` for the re-reads nobody asked for: a background refresh that flips
  // `loading` blanks the list and replaces it with "Loading…", which is a worse
  // lie than the stale row it was correcting.
  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      setChannels(await listChannels());
      setError('');
    } catch (caught) {
      if (!quiet) setError(readApiError(caught, 'Your channels could not be loaded.'));
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
    // `refresh` is stable and naming it changes nothing; the counter is the
    // whole dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure.version]);

  /**
   * US-4.1 — create a channel and become its admin.
   *
   * Returns the created channel, or `null` if the server refused; the message
   * is in `error` either way. The refresh is what makes "it appears in the
   * list" true without a reload — and it re-reads rather than pushing the
   * response onto the array, so the row carries the same `member_count` and
   * nested `topics` every other row does.
   */
  const create = useCallback(
    async (body) => {
      try {
        const created = await createChannel(body);
        await refresh();
        setError('');
        return created;
      } catch (caught) {
        setError(readApiError(caught, 'The channel could not be created.'));
        return null;
      }
    },
    [refresh],
  );

  /**
   * US-4.10 — delete a channel, and say what went with it.
   *
   * The API answers 200 with `{deleted: {...}}` rather than 204 precisely so
   * this can be reported; returning it lets the screen say "3 topics and 41
   * messages" instead of the row simply vanishing.
   */
  const remove = useCallback(
    async (channelId) => {
      try {
        const deleted = await deleteChannel(channelId);
        await refresh();
        setError('');
        return deleted ?? {};
      } catch (caught) {
        setError(readApiError(caught, 'The channel could not be deleted.'));
        return null;
      }
    },
    [refresh],
  );

  return { channels, loading, error, setError, refresh, create, remove };
}
