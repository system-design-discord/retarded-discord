import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteMessage,
  editMessage,
  listMessages,
  sendMessage,
} from '../services/messages';

// One conversation, whichever of the three kinds it is. The DM view, the group
// view and the channel topic view differ in exactly one value — the target —
// which is the whole premise of F-00.
//
// Two things this hook deliberately does not do:
//
//   * it never invents a message. The old Chat.jsx appended a locally-built
//     object inside its catch block, so a write that 400'd looked identical to
//     one that succeeded (issue #78). Here state only ever moves to what the
//     server returned.
//   * it never decides who may edit or delete. It reports the server's refusal;
//     roles.services is the authority (architecture.tex §5.1).

// Live delivery is F-07, and F-07 was cut at the Aug 11 bonus gate. This is a
// poll, it is honest about being one, and it is what makes two browsers see
// each other's messages without a manual refresh.
const REFRESH_MS = 5000;

function readError(error, fallback) {
  const body = error?.response?.data;
  if (typeof body === 'string') return body;
  if (body?.detail) return body.detail;
  if (Array.isArray(body) && body.length) return String(body[0]);
  if (body && typeof body === 'object') {
    const first = Object.values(body)[0];
    if (Array.isArray(first) && first.length) return String(first[0]);
  }
  return fallback;
}

export default function useConversation(kind, id) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const target = useMemo(() => (id ? { kind, id } : null), [kind, id]);

  // Refreshing must not flip the list back to its loading state, or the view
  // blanks every five seconds.
  const loaded = useRef(false);

  const refresh = useCallback(
    async ({ quiet = false } = {}) => {
      if (!target) {
        setMessages([]);
        return;
      }

      if (!quiet) setLoading(true);
      try {
        setMessages(await listMessages(target));
        setError('');
        loaded.current = true;
      } catch (caught) {
        if (!quiet) setError(readError(caught, 'This conversation could not be loaded.'));
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [target],
  );

  useEffect(() => {
    loaded.current = false;
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!target) return undefined;
    const timer = setInterval(() => refresh({ quiet: true }), REFRESH_MS);
    return () => clearInterval(timer);
  }, [target, refresh]);

  const send = useCallback(
    async (text) => {
      if (!target) return;
      try {
        const created = await sendMessage(target, { text });
        setMessages((current) => [...current, created]);
        setError('');
      } catch (caught) {
        setError(readError(caught, 'The message could not be sent.'));
      }
    },
    [target],
  );

  const edit = useCallback(async (messageId, text) => {
    try {
      const updated = await editMessage(messageId, text);
      setMessages((current) =>
        current.map((message) => (message.id === messageId ? updated : message)),
      );
      setError('');
    } catch (caught) {
      setError(readError(caught, 'Only the author may edit this message.'));
    }
  }, []);

  const remove = useCallback(async (messageId) => {
    try {
      await deleteMessage(messageId);
      setMessages((current) => current.filter((message) => message.id !== messageId));
      setError('');
    } catch (caught) {
      setError(readError(caught, 'You are not allowed to delete this message.'));
    }
  }, []);

  return { messages, loading, error, send, edit, remove, refresh };
}
