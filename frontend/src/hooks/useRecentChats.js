import { useCallback, useEffect, useState } from 'react';
import usePresence from './usePresence';
import api from '../services/api';
import { listVisibleMessages } from '../services/messages';
import { listGroups } from '../services/groups';

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
    const fromPartner = message.sender?.id === partnerId;
    const username = fromPartner ? message.sender.username : known?.username;
    // The avatar rides along with the username and for the same reason: it is
    // only present on messages the *partner* sent, because `sender` is the only
    // nested user a message carries. When they have never replied it stays null
    // and `nameMissingPartners` fills it from their profile.
    const avatar = fromPartner ? message.sender.avatar ?? null : known?.avatar ?? null;

    if (!known || new Date(message.created_at) >= new Date(known.at)) {
      byPartner.set(partnerId, {
        id: partnerId,
        username: username ?? known?.username ?? null,
        avatar: avatar ?? known?.avatar ?? null,
        preview: message.text ?? '',
        at: message.created_at,
      });
    } else if (username && !known.username) {
      byPartner.set(partnerId, { ...known, username, avatar: avatar ?? known.avatar });
    }
  }

  return [...byPartner.values()].sort((a, b) => new Date(b.at) - new Date(a.at));
}

/** Fill in the display fields the message payload could not supply.
 *
 *  One request answers both: `/api/profile/<id>/` carries the username and the
 *  avatar together, so a correspondent who has never replied gets a face as
 *  well as a name rather than a name and a letter. */
export async function nameMissingPartners(conversations) {
  const unnamed = conversations.filter((conversation) => !conversation.username);
  if (unnamed.length === 0) return conversations;

  const found = new Map();
  await Promise.all(
    unnamed.map(async ({ id }) => {
      try {
        const { data } = await api.get(`profile/${id}/`);
        found.set(id, {
          username: data.user?.username ?? `User ${id}`,
          avatar: data.avatar ?? null,
        });
      } catch {
        found.set(id, { username: `User ${id}`, avatar: null });
      }
    }),
  );

  return conversations.map((conversation) =>
    conversation.username
      ? conversation
      : { ...conversation, ...found.get(conversation.id) },
  );
}

/** Group messages into one row per group, newest first.
 *
 *  `groupsById` is the whole row and not just the name, because a group has a
 *  picture as well — the same one `GroupSettings` uploads — and a rail that
 *  drew a face for every direct message and a blank square for every group was
 *  drawing a distinction the product does not make. A message payload cannot
 *  supply it: `group` comes back as a bare id, which is why this map exists at
 *  all. */
function groupThreadsFrom(messages, groupsById) {
  const byGroup = new Map();

  for (const message of messages) {
    if (!message.group) continue;

    const known = byGroup.get(message.group);
    if (known && new Date(message.created_at) < new Date(known.at)) continue;

    const group = groupsById.get(message.group);

    byGroup.set(message.group, {
      id: message.group,
      // A group the caller is in but which has no name yet is still a real
      // row; falling back keeps it clickable rather than blank.
      title: group?.name ?? `Group ${message.group}`,
      avatar: group?.avatar ?? null,
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
  const { profileVersion, structure } = usePresence();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!meId) return;

    try {
      // `listGroups` follows `next`, so this is every group rather than the
      // first fifty — the raw `groups/` read it replaced was page one only, and
      // a name missing from this map renders as a blank conversation title.
      const [messages, groups] = await Promise.all([listVisibleMessages(), listGroups()]);

      const groupsById = new Map(groups.map((group) => [group.id, group]));

      const directs = await nameMissingPartners(
        conversationsFrom(messages.filter((message) => message.recipient !== null), meId),
      );

      const rows = [
        ...directs.map((conversation) => ({
          key: `dm-${conversation.id}`,
          to: `/dms?user=${conversation.id}`,
          title: conversation.username,
          // Carried onto the row rather than left on the conversation, because
          // the two halves are merged and sorted below and the dashboard reads
          // only the merged shape.
          avatar: conversation.avatar ?? null,
          userId: conversation.id,
          preview: conversation.preview,
          at: conversation.at,
        })),
        ...groupThreadsFrom(messages, groupsById).map((thread) => ({
          key: `group-${thread.id}`,
          to: `/groups/${thread.id}/chat`,
          title: thread.title,
          avatar: thread.avatar,
          userId: null,
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

  // The rail's names come from `nameMissingPartners`, which reads a profile
  // per correspondent, so any profile changing anywhere may be one of these.
  //
  // `structure.version` is here for the other direction: a group that was
  // deleted or renamed, or one you were just added to, changes which rows this
  // list should have. The messages of a deleted group are gone at the database
  // level, so the row disappears on a re-read — but only if something re-reads,
  // and until this nothing did.
  useEffect(() => {
    load();
  }, [load, profileVersion, structure.version]);

  return { chats, loading, error };
}
