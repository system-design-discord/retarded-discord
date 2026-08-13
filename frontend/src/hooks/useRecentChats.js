import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { listVisibleMessages } from '../services/messages';
import { unwrapList } from '../lib/pagination';

// The conversation-list derivation, in one place.
//
// `conversationsFrom` and `nameMissingPartners` were written for
// `dms/DirectMessages.jsx` and now serve the dashboard too — U-02 needed the
// same rows and the alternative was a second implementation of the same
// grouping, which is the mistake `F-00` exists to prevent on the rendering side.
//
// **There is no `conversations/` endpoint**, so all of this reads every visible
// message to build a list. That is a real limitation, not a stand-in; it is
// recorded in `services/messages.js` and in the report.

/** Group direct messages into one row per correspondent, newest first. */
export function conversationsFrom(messages, meId) {
  const byPartner = new Map();

  for (const message of messages) {
    // `sender` is nested and `recipient` is a bare id — that asymmetry is the
    // serializer's, and it is why a partner's username is sometimes unknown.
    const partnerId = message.sender?.id === meId ? message.recipient : message.sender?.id;
    if (!partnerId || partnerId === meId) continue;

    const known = byPartner.get(partnerId);
    const username = message.sender?.id === partnerId ? message.sender.username : known?.username;

    if (!known || new Date(message.created_at) >= new Date(known.at)) {
      byPartner.set(partnerId, {
        id: partnerId,
        username: username ?? known?.username ?? null,
        preview: message.text ?? '',
        at: message.created_at,
      });
    } else if (username && !known.username) {
      byPartner.set(partnerId, { ...known, username });
    }
  }

  return [...byPartner.values()].sort((a, b) => new Date(b.at) - new Date(a.at));
}

/** Fill in the usernames the message payload could not supply. */
export async function nameMissingPartners(conversations) {
  const unnamed = conversations.filter((conversation) => !conversation.username);
  if (unnamed.length === 0) return conversations;

  const names = new Map();
  await Promise.all(
    unnamed.map(async ({ id }) => {
      try {
        const { data } = await api.get(`profile/${id}/`);
        names.set(id, data.user?.username ?? `User ${id}`);
      } catch {
        names.set(id, `User ${id}`);
      }
    }),
  );

  return conversations.map((conversation) =>
    conversation.username ? conversation : { ...conversation, username: names.get(conversation.id) },
  );
}

/** Group messages into one row per group, newest first. */
function groupThreadsFrom(messages, groupNames) {
  const byGroup = new Map();

  for (const message of messages) {
    if (!message.group) continue;

    const known = byGroup.get(message.group);
    if (known && new Date(message.created_at) < new Date(known.at)) continue;

    byGroup.set(message.group, {
      id: message.group,
      // A group the caller is in but which has no name yet is still a real
      // row; falling back keeps it clickable rather than blank.
      title: groupNames.get(message.group) ?? `Group ${message.group}`,
      preview: message.sender?.username
        ? `${message.sender.username}: ${message.text ?? ''}`
        : (message.text ?? ''),
      at: message.created_at,
    });
  }

  return [...byGroup.values()];
}

/**
 * The dashboard's recent conversations — direct messages and groups together,
 * newest first.
 *
 * Group names come from `groups/` rather than from the message payload, which
 * carries `group` as a bare id. That is one extra request for the whole list,
 * against one profile request per unnamed correspondent, which is why the two
 * halves resolve their names differently.
 */
export default function useRecentChats(meId, { limit = 6 } = {}) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!meId) return;

    try {
      const [messages, groupsResponse] = await Promise.all([
        listVisibleMessages(),
        api.get('groups/'),
      ]);

      const groupNames = new Map(
        unwrapList(groupsResponse).map((group) => [group.id, group.name]),
      );

      const directs = await nameMissingPartners(
        conversationsFrom(messages.filter((message) => message.recipient !== null), meId),
      );

      const rows = [
        ...directs.map((conversation) => ({
          key: `dm-${conversation.id}`,
          to: `/dms?user=${conversation.id}`,
          title: conversation.username,
          preview: conversation.preview,
          at: conversation.at,
        })),
        ...groupThreadsFrom(messages, groupNames).map((thread) => ({
          key: `group-${thread.id}`,
          to: `/groups/${thread.id}/chat`,
          title: thread.title,
          preview: thread.preview,
          at: thread.at,
        })),
      ].sort((a, b) => new Date(b.at) - new Date(a.at));

      setChats(rows.slice(0, limit));
      setError('');
    } catch {
      setError('Your recent conversations could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [meId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { chats, loading, error };
}
