import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
import PresenceContext from './PresenceContext';
import usePresenceState from '../hooks/usePresenceState';
import {
  listNotifications,
  markAllRead as markAllReadRequest,
  markRead as markReadRequest,
} from '../services/notifications';
import { openNotificationSocket } from '../lib/socket';
import { readApiError } from '../lib/apiError';

// F-08 — one notification socket for the whole SPA, and one list behind it.
//
// **Why a context and not a hook per screen.** The card's second criterion is
// that the unread badge matches `GET /api/notifications/` when the two are
// compared. A hook that each screen called would open a socket per screen and
// keep a list per screen, and two lists that are refreshed at different moments
// disagree — the badge in the rail would drift from the centre beside it and
// both would drift from the API. There is one list here, so they cannot.
// `AuthContext` is the precedent and this mounts inside it.
//
// **The unread count is derived, not fetched.** `notifications/unread-count/`
// exists and is cheaper, but a count read separately from the list is a second
// source of truth that has to be kept in step with the first — exactly the
// drift the previous paragraph is about. One array, counted.
//
// **Reconnect is a re-read, arrival is a merge.** Both halves of the fourth
// criterion come from that pair: `refresh()` on every `live` status picks up
// whatever was generated while the socket was down, and merging by `id` means a
// notification already on screen is not shown twice when the re-read returns it
// alongside the pushed copy.
//
// **This socket also carries presence and profile changes**, and they are here
// for the reason above rather than by accretion: it is the only connection the
// SPA holds open on every screen, so a second provider wanting the same
// property would have to open a second connection per tab. The *state* lives in
// `PresenceContext`, which this renders — one socket, two concerns, neither
// leaking into the other's API.

const NotificationsContext = createContext(null);

/** Merge one notification in, newest first, without ever duplicating an id. */
function merge(current, incoming) {
  if (current.some((notification) => notification.id === incoming.id)) return current;
  return [incoming, ...current];
}

export function NotificationsProvider({ children }) {
  const { user, refreshUser } = useContext(AuthContext);
  const {
    value: presenceValue,
    receiveSnapshot,
    receivePresence,
    receiveProfile,
    receiveStructure,
    clear: clearPresence,
  } = usePresenceState();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState('');

  // `refresh` is called from the socket's status handler, which is created once
  // per connection. Holding it in a ref keeps that handler stable, so a
  // reconnect does not tear down and rebuild the socket that just reconnected.
  const refreshRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setNotifications(await listNotifications());
      setError('');
    } catch (caught) {
      setError(readApiError(caught, 'Your notifications could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  refreshRef.current = refresh;

  useEffect(() => {
    refresh();
  }, [refresh]);

  // **Keyed on `user?.id`, not on `user`.** `AuthContext.fetchProfile` answers
  // with a fresh object, so `refreshUser()` — which the effect below fires
  // whenever your own profile changes anywhere — used to change this
  // dependency's identity and tear the socket down and back up. That is a
  // presence transition each way for a rename: the server marks you offline,
  // announces it to everybody, then marks you online and announces that too.
  // The identity of the signed-in *person* is what this connection depends on.
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setLive(false);
      return undefined;
    }

    const socket = openNotificationSocket({
      onNotification: (incoming) => setNotifications((current) => merge(current, incoming)),
      onPresenceSnapshot: receiveSnapshot,
      onPresence: receivePresence,
      onProfile: receiveProfile,
      onStructure: receiveStructure,
      onStatus: (status) => {
        const connected = status === 'live';
        setLive(connected);
        // Every (re)subscribe, not just the first. Anything generated while the
        // connection was down was never pushed, and only a re-read finds it.
        if (connected) refreshRef.current?.();
      },
    });

    return () => socket.close();
  }, [userId, receiveSnapshot, receivePresence, receiveProfile, receiveStructure]);

  // Signing out is the one moment presence is genuinely unknown rather than
  // merely unreported, so the set is cleared there and nowhere else. A dropped
  // socket must *not* clear it: it would blank every dot in the product on a
  // reconnect, and the snapshot that follows would put them all back.
  useEffect(() => {
    if (!user) clearPresence();
  }, [user, clearPresence]);

  // Your own other tabs are somebody's screens too — the dashboard greeting was
  // stale in every one of them. `AuthContext` holds the copy that goes stale and
  // this provider mounts inside it, so this is the one place that can reach both
  // the frame and the copy.
  useEffect(() => {
    if (presenceValue.changedUserId != null && presenceValue.changedUserId === user?.id) {
      refreshUser?.();
    }
    // Keyed on the counter as well as the id: two changes in a row by the same
    // person are two events, and an id-only dependency would see one.
  }, [presenceValue.profileVersion, presenceValue.changedUserId, user?.id, refreshUser]);

  const unread = notifications.filter((notification) => !notification.is_read).length;

  /** Mark one read. Moves state to the row the server returned, not to an
   *  assumption about it. */
  const markRead = useCallback(async (notificationId) => {
    try {
      const updated = await markReadRequest(notificationId);
      setNotifications((current) =>
        current.map((notification) => (notification.id === notificationId ? updated : notification)),
      );
      setError('');
      return updated;
    } catch (caught) {
      setError(readApiError(caught, 'That notification could not be marked read.'));
      return null;
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllReadRequest();
      await refresh();
      setError('');
      return true;
    } catch (caught) {
      setError(readApiError(caught, 'They could not be marked read.'));
      return null;
    }
  }, [refresh]);

  const value = {
    notifications,
    unread,
    loading,
    live,
    error,
    setError,
    refresh,
    markRead,
    markAllRead,
  };

  return (
    <NotificationsContext.Provider value={value}>
      <PresenceContext.Provider value={presenceValue}>{children}</PresenceContext.Provider>
    </NotificationsContext.Provider>
  );
}

export default NotificationsContext;
