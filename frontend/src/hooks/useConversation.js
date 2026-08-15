import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteMessage,
  editMessage,
  listMessages,
  sendMessage,
} from '../services/messages';
import { openConversationSocket } from '../lib/socket';

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

// F-07 opened the socket, so live delivery is the socket's job now and the poll
// is the fallback rather than the mechanism. It is kept, not deleted: a Redis
// outage makes `realtime/publisher.py` log and skip, a proxy that does not
// forward `Upgrade` never completes the handshake, and in both cases messages
// still arrive — just slowly. Deleting the poll would trade "five seconds late"
// for "silently broken".
//
// So the interval tracks the socket. Five seconds while nothing is connected,
// thirty once the gateway has confirmed the subscription — still a safety net
// against a frame the socket dropped, at a sixth of the requests.
const REFRESH_MS = 5000;
const LIVE_REFRESH_MS = 30000;

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
  const [live, setLive] = useState(false);

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
    const period = live ? LIVE_REFRESH_MS : REFRESH_MS;
    const timer = setInterval(() => refresh({ quiet: true }), period);
    return () => clearInterval(timer);
  }, [target, refresh, live]);

  // One message off the wire. Two rules, both load-bearing:
  //
  //   * **Dedupe by id.** `realtime/publisher.py` fans a message out to the
  //     conversation's group, and for a direct message that group is
  //     `dm_group(sender, recipient)` — symmetric, so the sender's own socket
  //     is in it. The poll may deliver the same row again too. Without this the
  //     author sees every message they write twice.
  //
  //     `send` below routes the row the POST returned through here rather than
  //     appending it, so there is one merge rule and not two (issue #137). It
  //     used to append unconditionally, on the assumption that the response
  //     lands before the socket frame — it does not: the gateway publishes on
  //     commit and the frame travels back over an open connection while the
  //     response is still being serialised, so the socket wins every time and
  //     the author saw both copies for up to a poll interval.
  //   * **Keep `created_at` order.** `MessageList` renders the array as given
  //     and `listMessages` hands it over oldest-first; appending blindly is
  //     right almost always and wrong exactly when a frame arrives late, which
  //     is the case the ordering exists for. Ties break on id, because two
  //     messages in the same conversation can share a timestamp to the second.
  const receive = useCallback((incoming) => {
    setMessages((current) => {
      if (current.some((message) => message.id === incoming.id)) return current;
      return [...current, incoming].sort(
        (a, b) =>
          new Date(a.created_at) - new Date(b.created_at) || a.id - b.id,
      );
    });
  }, []);

  // The socket. It carries no error into `error`: a refused *write* is
  // something the user did and must see, while a gateway that will not connect
  // is something the poll already covers, and turning it into a red banner
  // would make a working conversation look broken.
  useEffect(() => {
    if (!target) return undefined;
    setLive(false);
    const socket = openConversationSocket({
      kind: target.kind,
      id: target.id,
      onMessage: receive,
      onStatus: (status) => setLive(status === 'live'),
    });
    return () => socket.close();
  }, [target, receive]);

  const send = useCallback(
    async (text) => {
      if (!target) return;
      try {
        receive(await sendMessage(target, { text }));
        setError('');
      } catch (caught) {
        setError(readError(caught, 'The message could not be sent.'));
      }
    },
    [target, receive],
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

  return { messages, loading, error, live, send, edit, remove, refresh };
}
