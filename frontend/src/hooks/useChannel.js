import { useCallback, useEffect, useState } from 'react';
import {
  createTopic,
  deleteTopic,
  getChannel,
  updateChannel,
  updateTopic,
} from '../services/channels';
import { readApiError } from '../lib/apiError';
import usePresence from './usePresence';

// One channel and its topics.
//
// **One request, not two.** `ChannelSerializer` nests `topics` read-only, so
// `GET channels/<id>/` already carries everything the channel view's tab strip
// needs; a separate `listTopics` call would be a second round trip for data
// that already arrived.
//
// Same rule as everywhere else in this layer: state only ever moves to what the
// server returned, so a refused `can_create_topic` leaves the tab strip exactly
// as it was rather than showing a tab the server does not have.
//
// **It listens for structural changes, and unlike the list hooks it is choosy.**
// `useChannels` re-reads on any change because a list cannot tell whose id it
// just heard without looking. This holds exactly one channel, so it can, and it
// must: re-reading a channel every time somebody renames a group somewhere else
// in the product is a request per member per event for nothing.
//
// It also reports `gone`. A channel that was deleted under you is not an error
// and not an empty state — it is a screen with no subject, and the only correct
// thing to do with it is leave. The hook says so; `ChannelView` decides where
// to go, because navigation is not a data concern.

export default function useChannel(channelId) {
  const { structure } = usePresence();

  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gone, setGone] = useState(false);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!channelId) {
      setChannel(null);
      setLoading(false);
      return;
    }

    if (!quiet) setLoading(true);
    try {
      setChannel(await getChannel(channelId));
      setError('');
    } catch (caught) {
      // A 404 here is the honest answer for a channel you are not in:
      // `ChannelDetailView` gates GET on membership, so "no such channel" and
      // "not yours" are deliberately the same reply.
      setChannel(null);
      setError(
        readApiError(caught, 'This channel could not be opened. You may not be a member of it.'),
      );
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    setGone(false);
    refresh();
  }, [refresh]);

  // Which frames are about *this* channel: a change to the channel itself, and
  // a change to any of its topics — a topic names its channel precisely so a
  // holder of the channel can tell. A membership change is included because
  // `member_count` is on the row and losing your own membership is what makes
  // the channel unreadable to you from the next request onwards.
  const mine = Number(channelId);
  const aboutThisChannel =
    (structure.scope === 'channel' && structure.id === mine) ||
    (structure.scope === 'topic' && structure.channelId === mine);

  useEffect(() => {
    if (!structure.version || !aboutThisChannel) return;

    if (structure.scope === 'channel' && structure.action === 'deleted') {
      setGone(true);
      return;
    }
    // Re-read rather than patching the cached row. The frame carries the object
    // for a rename, but not for a new topic's position in the strip, not for
    // `member_count`, and not at all for a delete — one rule that always works
    // beats three that each work sometimes.
    refresh({ quiet: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure.version]);

  const topics = channel?.topics ?? [];

  /**
   * US-4.7 / US-6.1 — rename or re-describe the channel. Needs
   * `can_edit_channel`, which the server enforces.
   *
   * Answers **`null` on success and the server's message on failure**, the
   * `useGroup` / `useChannelRoles` guard shape, because the caller is a form
   * that needs to know whether to say "Saved." A refused PATCH leaves `channel`
   * exactly as the server last described it, so the fields re-seed to what is
   * stored rather than to what was typed.
   */
  const update = useCallback(
    async (body) => {
      try {
        setChannel(await updateChannel(channelId, body));
        setError('');
        return null;
      } catch (caught) {
        const message = readApiError(caught, 'The channel could not be updated.');
        setError(message);
        return message;
      }
    },
    [channelId],
  );

  /** US-4.5 — add a topic. Returns it, or `null` if the server refused. */
  const addTopic = useCallback(
    async (name) => {
      try {
        const created = await createTopic(channelId, name);
        await refresh();
        setError('');
        return created;
      } catch (caught) {
        setError(readApiError(caught, 'The topic could not be created.'));
        return null;
      }
    },
    [channelId, refresh],
  );

  /** Rename a topic. Returns it, or `null` if the server refused (#126). */
  const renameTopic = useCallback(
    async (topicId, name) => {
      try {
        const renamed = await updateTopic(channelId, topicId, { name });
        await refresh();
        setError('');
        return renamed;
      } catch (caught) {
        setError(readApiError(caught, 'The topic could not be renamed.'));
        return null;
      }
    },
    [channelId, refresh],
  );

  /** Delete a topic. Answers how many messages went with it (C-03), or null. */
  const removeTopic = useCallback(
    async (topicId) => {
      try {
        const deletedMessages = await deleteTopic(channelId, topicId);
        await refresh();
        setError('');
        return deletedMessages;
      } catch (caught) {
        setError(readApiError(caught, 'The topic could not be deleted.'));
        return null;
      }
    },
    [channelId, refresh],
  );

  return {
    channel,
    topics,
    loading,
    error,
    setError,
    gone,
    refresh,
    update,
    addTopic,
    renameTopic,
    removeTopic,
  };
}
