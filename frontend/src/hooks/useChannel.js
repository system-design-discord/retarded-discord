import { useCallback, useEffect, useState } from 'react';
import {
  createTopic,
  deleteTopic,
  getChannel,
  updateChannel,
  updateTopic,
} from '../services/channels';
import { readApiError } from '../lib/apiError';

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

export default function useChannel(channelId) {
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!channelId) {
      setChannel(null);
      setLoading(false);
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
    refresh,
    update,
    addTopic,
    renameTopic,
    removeTopic,
  };
}
