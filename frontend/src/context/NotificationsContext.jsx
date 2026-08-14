import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext';
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

const NotificationsContext = createContext(null);

/** Merge one notification in, newest first, without ever duplicating an id. */
function merge(current, incoming) {
  if (current.some((notification) => notification.id === incoming.id)) return current;
  return [incoming, ...current];
}

export function NotificationsProvider({ children }) {
  const { user } = useContext(AuthContext);

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

  useEffect(() => {
    if (!user) {
      setLive(false);
      return undefined;
    }

    const socket = openNotificationSocket({
      onNotification: (incoming) => setNotifications((current) => merge(current, incoming)),
      onStatus: (status) => {
        const connected = status === 'live';
        setLive(connected);
        // Every (re)subscribe, not just the first. Anything generated while the
        // connection was down was never pushed, and only a re-read finds it.
        if (connected) refreshRef.current?.();
      },
    });

    return () => socket.close();
  }, [user]);

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

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export default NotificationsContext;
