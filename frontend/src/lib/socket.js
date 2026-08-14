import axios from 'axios';
import { API_BASE_URL } from '../services/api';

// F-07 — the client for the gateway `RT-02` landed. US-B1.1.
//
// The server side has been real since Aug 11 and nothing in the browser opened
// a socket, so the SPA polled every five seconds. This is the file that closes
// that gap, and it is deliberately the *only* file in the SPA that knows a
// WebSocket exists: `hooks/useConversation.js` calls it and stays a hook about
// messages, exactly as `services/messages.js` is the only file that knows the
// REST shape.
//
// **The socket is delivery only.** `realtime/consumers.py` answers anything sent
// up it with an error telling you to POST instead, so this file never writes.
// Sending stays `services/messages.js`. One write path, one place that validates.
//
// The three routes mirror messaging's three targets: `ws/dm/<user_id>/`,
// `ws/group/<group_id>/`, `ws/topic/<topic_id>/`, each with `?token=<access>`.
// The token is in the query string because a browser's `WebSocket` constructor
// cannot set an `Authorization` header — `realtime/middleware.py` explains the
// trade that forces.

/** The close codes `realtime/consumers.py` documents. */
const CLOSE_UNAUTHENTICATED = 4401;
const CLOSE_FORBIDDEN = 4403;
const CLOSE_NOT_FOUND = 4404;
/** A normal closure — ours, or the server shutting down politely. */
const CLOSE_NORMAL = 1000;

const FIRST_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

/**
 * Where the gateway is.
 *
 * Same origin by default, because the container stack publishes exactly one
 * port and nginx proxies `/ws/` alongside `/api/`. The scheme has to track the
 * page's: a `ws://` socket opened from an `https://` page is blocked as mixed
 * content, which presents as a connection that fails instantly and forever.
 * `VITE_WS_BASE_URL` overrides it for the split dev setup, the same way
 * `VITE_API_BASE_URL` overrides the REST base.
 */
function wsBase() {
  const configured = import.meta.env.VITE_WS_BASE_URL;
  if (configured) return configured.replace(/\/$/, '');
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${window.location.host}`;
}

/**
 * Exponential backoff with jitter, capped.
 *
 * The jitter is not decoration. Every open conversation in every tab loses its
 * socket at the same instant when the backend restarts, and without it they all
 * come back at the same instant too — a thundering herd against a process that
 * is still booting. Spreading the retries is what makes the reconnect gentle.
 */
function backoffFor(attempt) {
  const ceiling = Math.min(FIRST_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  return ceiling / 2 + Math.random() * (ceiling / 2);
}

/** A fresh access token, or `null` if the refresh token is spent too. */
async function refreshAccessToken() {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return null;
  try {
    const response = await axios.post(`${API_BASE_URL}auth/refresh/`, { refresh });
    const access = response.data?.access;
    if (!access) return null;
    localStorage.setItem('access_token', access);
    return access;
  } catch {
    // Deliberately quiet, and deliberately *not* a logout. `services/api.js`
    // clears storage and redirects when a REST refresh fails; doing that here
    // as well would mean a socket the browser suspended overnight could throw
    // the reader out mid-sentence. The REST call that follows will decide.
    return null;
  }
}

/**
 * Open a live socket for one conversation.
 *
 * @param {object} options
 * @param {'dm'|'group'|'topic'} options.kind   which of messaging's three targets
 * @param {number|string} options.id            the target's id
 * @param {(message: object) => void} options.onMessage  a `message.created` payload
 *   — `MessageSerializer` output, the same shape `services/messages.js` returns
 * @param {(status: string, detail?: string) => void} [options.onStatus]
 *   one of `connecting` | `live` | `retrying` | `stopped`
 * @returns {{ close: () => void }} closing is idempotent and stops all retries
 */
export function openConversationSocket({ kind, id, onMessage, onStatus }) {
  let socket = null;
  let timer = null;
  let attempt = 0;
  let refreshed = false;
  let stopped = false;

  const report = (status, detail) => {
    if (!stopped || status === 'stopped') onStatus?.(status, detail);
  };

  const stop = (detail) => {
    stopped = true;
    report('stopped', detail);
  };

  const retry = () => {
    if (stopped) return;
    const delay = backoffFor(attempt);
    attempt += 1;
    report('retrying');
    timer = setTimeout(connect, delay);
  };

  function connect() {
    if (stopped) return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      stop('Not signed in.');
      return;
    }

    report('connecting');
    socket = new WebSocket(`${wsBase()}/ws/${kind}/${id}/?token=${encodeURIComponent(token)}`);

    socket.onmessage = (event) => {
      let frame;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      // `subscribed` confirms the join and `error` is the gateway declining a
      // write; only a created message is this file's business. The consumer
      // sends `subscribed` after `accept()`, so the *frame* is the signal the
      // subscription is real — `onopen` only means the handshake completed.
      if (frame.type === 'subscribed') {
        attempt = 0;
        refreshed = false;
        report('live');
      } else if (frame.type === 'message.created' && frame.message) {
        onMessage?.(frame.message);
      }
    };

    socket.onclose = async (event) => {
      socket = null;
      if (stopped) return;

      // Refusals that retrying cannot fix. Reconnecting into a 4403 forever is
      // a client hammering an endpoint that has already given its final answer.
      if (event.code === CLOSE_FORBIDDEN) {
        stop('You are not a member of this conversation.');
        return;
      }
      if (event.code === CLOSE_NOT_FOUND) {
        stop('This conversation no longer exists.');
        return;
      }

      // An expired access token is the one refusal worth one silent repair —
      // it is what a tab left open past the token's lifetime always produces.
      // Exactly one, though: a second 4401 after a fresh token means the token
      // is not the problem, and looping on it would be a refresh storm.
      if (event.code === CLOSE_UNAUTHENTICATED) {
        if (refreshed) {
          stop('Your session has expired.');
          return;
        }
        refreshed = true;
        const access = await refreshAccessToken();
        if (!access) {
          stop('Your session has expired.');
          return;
        }
        if (!stopped) connect();
        return;
      }

      // A clean close is either ours or a server saying goodbye properly.
      // Anything else — 1006 from a dropped connection, 1012 from a restart —
      // is exactly what reconnecting is for.
      if (event.code === CLOSE_NORMAL) {
        stop();
        return;
      }
      retry();
    };

    // `onerror` always precedes an `onclose`, so retrying here as well would
    // schedule two reconnects for one failure.
    socket.onerror = () => {};
  }

  connect();

  return {
    close() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
      if (socket) {
        // Handlers off first: closing fires `onclose`, and a handler that runs
        // after the caller has let go would report a status into a component
        // that has unmounted.
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.close(CLOSE_NORMAL);
        socket = null;
      }
    },
  };
}

export default openConversationSocket;
