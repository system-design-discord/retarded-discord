import { getAccessToken, refreshTokens } from './tokens';

// The gateway's client, and the only file in the SPA that knows a WebSocket
// exists. `hooks/useConversation.js` and `hooks/useNotifications.js` call it and
// stay hooks about messages and notifications, exactly as `services/messages.js`
// is the only file that knows the REST shape.
//
// **Every socket here is delivery only.** `realtime/consumers.py` answers
// anything sent up one with an error naming the endpoint that does the write,
// so this file never writes. One write path, one place that validates.
//
// `F-07` landed this for conversations (US-B1.1) and `F-08` added the fourth
// route for notifications (US-B1.2). The reconnect machinery below was written
// once for the first and is shared by the second: `openSocket` owns the token,
// the backoff and the close codes, and the two exported openers are the routes
// and the frames they care about. A second copy of the retry logic would drift,
// and the half that drifted would be the one nobody was watching.
//
//     ws/dm/<user_id>/      ws/group/<group_id>/
//     ws/topic/<topic_id>/  ws/notifications/
//
// each with `?token=<access>`. The token is in the query string because a
// browser's `WebSocket` constructor cannot set an `Authorization` header —
// `realtime/middleware.py` explains the trade that forces.

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
  try {
    // `lib/tokens` writes **both** halves of the rotated pair. Storing only the
    // access token here left the blacklisted refresh token behind, so a socket
    // that recovered from one `4401` could never recover from the second — and
    // took the reader's session with it when the next REST call tried the same
    // dead token (#141). It also shares the exchange with `services/api.js`,
    // which matters because a backend restart 401s the REST call and closes the
    // socket at the same instant, and the loser of that race would be presenting
    // a token the winner had just had blacklisted.
    return await refreshTokens();
  } catch {
    // Deliberately quiet, and deliberately *not* a logout. `services/api.js`
    // clears storage and redirects when a REST refresh fails; doing that here
    // as well would mean a socket the browser suspended overnight could throw
    // the reader out mid-sentence. The REST call that follows will decide.
    return null;
  }
}

/**
 * A reconnecting socket on one gateway path.
 *
 * Handles the token, the backoff, the close codes and the `subscribed`
 * handshake; knows nothing about what the frames mean. Callers get every frame
 * that is not `subscribed` and pick out the one they want.
 *
 * @param {object} options
 * @param {string} options.path                 e.g. `/ws/dm/2/` or `/ws/notifications/`
 * @param {(frame: object) => void} options.onFrame        a parsed frame
 * @param {(status: string, detail?: string) => void} [options.onStatus]
 *   one of `connecting` | `live` | `retrying` | `stopped`. `live` fires on every
 *   successful (re)subscribe, not just the first — which is what lets a caller
 *   re-read whatever it missed while the socket was down.
 * @param {Record<number, string>} [options.refusals]
 *   close codes that retrying cannot fix, and what to say about them
 * @returns {{ close: () => void }} closing is idempotent and stops all retries
 */
export function openSocket({ path, onFrame, onStatus, refusals = {} }) {
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

    const token = getAccessToken();
    if (!token) {
      stop('Not signed in.');
      return;
    }

    report('connecting');
    socket = new WebSocket(`${wsBase()}${path}?token=${encodeURIComponent(token)}`);

    socket.onmessage = (event) => {
      let frame;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      // The consumer sends `subscribed` after `accept()`, so the *frame* is the
      // signal the subscription is real — `onopen` only means the handshake
      // completed. Everything else is the caller's business, including the
      // gateway's `error` reply to a write it declined.
      if (frame.type === 'subscribed') {
        attempt = 0;
        refreshed = false;
        report('live');
        return;
      }
      onFrame?.(frame);
    };

    socket.onclose = async (event) => {
      socket = null;
      if (stopped) return;

      // Refusals that retrying cannot fix. Reconnecting into a 4403 forever is
      // a client hammering an endpoint that has already given its final answer.
      if (refusals[event.code]) {
        stop(refusals[event.code]);
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

/**
 * Open a live socket for one conversation. F-07, US-B1.1.
 *
 * @param {object} options
 * @param {'dm'|'group'|'topic'} options.kind   which of messaging's three targets
 * @param {number|string} options.id            the target's id
 * @param {(message: object) => void} options.onMessage  a `message.created` payload
 *   — `MessageSerializer` output, the same shape `services/messages.js` returns
 * @param {(status: string, detail?: string) => void} [options.onStatus]
 * @returns {{ close: () => void }}
 */
export function openConversationSocket({ kind, id, onMessage, onStatus }) {
  return openSocket({
    path: `/ws/${kind}/${id}/`,
    onStatus,
    refusals: {
      [CLOSE_FORBIDDEN]: 'You are not a member of this conversation.',
      [CLOSE_NOT_FOUND]: 'This conversation no longer exists.',
    },
    onFrame: (frame) => {
      if (frame.type === 'message.created' && frame.message) onMessage?.(frame.message);
    },
  });
}

/**
 * Open the caller's notification socket. F-08, US-B1.2.
 *
 * No id: the route is scoped to whoever the token says you are, so there is
 * nothing to address and nothing to be refused for. `4403` and `4404` cannot
 * happen here, which is why no `refusals` are passed — an unexpected close is
 * a dropped connection and reconnecting is the right answer to it.
 *
 * @param {object} options
 * @param {(notification: object) => void} options.onNotification
 *   a `notification.created` payload — `NotificationSerializer` output, the
 *   same shape `services/notifications.js` returns
 * @param {(status: string, detail?: string) => void} [options.onStatus]
 * @returns {{ close: () => void }}
 */
export function openNotificationSocket({ onNotification, onStatus }) {
  return openSocket({
    path: '/ws/notifications/',
    onStatus,
    onFrame: (frame) => {
      if (frame.type === 'notification.created' && frame.notification) {
        onNotification?.(frame.notification);
      }
    },
  });
}

export default openConversationSocket;
