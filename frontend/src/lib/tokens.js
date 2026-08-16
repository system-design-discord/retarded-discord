import axios from 'axios';
import { API_BASE_URL } from './apiBase';

// The one place in the SPA that writes the JWT pair — #141.
//
// `SIMPLE_JWT` has `ROTATE_REFRESH_TOKENS` on with `BLACKLIST_AFTER_ROTATION`
// (`backend/config/settings.py`), so `POST auth/refresh/` answers **both**
// halves and kills the refresh token that was presented. Two call sites read
// that reply — the axios interceptor in `services/api.js` and the socket's
// recovery in `lib/socket.js` — and both stored `access` alone. The refresh
// token in `localStorage` was therefore blacklisted from the first refresh
// onwards: the *second* one presented a dead token, got a 401, and the
// interceptor's catch cleared storage and sent the reader to `/login`
// mid-session. One refresh worked; the next logged you out.
//
// `ACCESS_TOKEN_LIFETIME` is a day, which is the only reason it never showed
// up in a demo.
//
// Two things follow from that and are the whole reason this module exists.
//
// **The pair is written in one place.** Three files used to write
// `localStorage` directly and only one of them wrote both keys. A helper each
// of them calls is what makes "the stored refresh token is the one the server
// last issued" a property of the code rather than of remembering.
//
// **The refresh itself is single-flight.** Rotation turns a concurrent refresh
// into a *bug*: two requests that 401 together, or a REST call and the socket
// recovering at the same moment, would each present the same refresh token, and
// the second presenter is holding a token the first one has already had
// blacklisted. Sharing the in-flight promise means the token is spent once and
// every waiter gets the same new pair.

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

/** The current access token, or `null`. */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

/** The current refresh token, or `null`. */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

/**
 * Store whichever halves of the pair the server just issued.
 *
 * `refresh` is written **only when the response carries one**, so this still
 * behaves if `ROTATE_REFRESH_TOKENS` is ever turned off and the refresh reply
 * narrows to `{access}` — in that case the token already in storage is still
 * the live one and must not be cleared.
 */
export function storeTokens({ access, refresh } = {}) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  return access ?? null;
}

/** Forget both halves. Logging out, and giving up on a spent refresh token. */
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// The refresh in flight, shared by every caller that asks while it is running.
let inFlight = null;

/**
 * Exchange the stored refresh token for a fresh pair, once.
 *
 * Answers the new access token, or `null` if there was no refresh token or the
 * server refused it. **It does not log anybody out** — the two callers want
 * different things from a failure (`services/api.js` redirects, `lib/socket.js`
 * stays quiet and lets the next REST call decide), so that choice stays theirs.
 *
 * Uses a bare `axios` rather than the shared instance on purpose: the instance
 * carries the response interceptor that calls *this*, and a 401 here would
 * otherwise recurse.
 */
export function refreshTokens() {
  if (inFlight) return inFlight;

  const refresh = getRefreshToken();
  if (!refresh) return Promise.resolve(null);

  inFlight = axios
    .post(`${API_BASE_URL}auth/refresh/`, { refresh })
    .then((response) => storeTokens(response.data))
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
