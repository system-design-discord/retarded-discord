import { useContext } from 'react';
import NotificationsContext from '../context/NotificationsContext';

// The notification list, the unread count and the two writes — F-08, US-B1.2.
//
// A thin reader over `NotificationsContext` rather than a hook that fetches,
// because every consumer must see the *same* list: the badge in the navigation
// rail and the centre it links to are on screen together, and two independently
// refreshed copies would disagree with each other and with the API. The context
// explains why that matters and owns the socket.
//
// Outside a provider it answers an inert, empty state rather than throwing, so
// a screen rendered in isolation degrades to "no notifications" instead of a
// blank page.

const NOT_PROVIDED = {
  notifications: [],
  unread: 0,
  loading: false,
  live: false,
  error: '',
  setError: () => {},
  refresh: async () => {},
  markRead: async () => null,
  markAllRead: async () => null,
};

export default function useNotifications() {
  return useContext(NotificationsContext) ?? NOT_PROVIDED;
}
