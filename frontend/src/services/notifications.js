import api from './api';
import { fetchAllPages } from '../lib/pagination';

// The one place in the SPA that knows the notification API's shape.
//
// The endpoints are `backend/notifications/urls.py`. Three things about them
// are worth stating once here rather than being rediscovered in a component:
//
//   * **`title` and `body` are derived, not stored.** `ERD.tex` gives the
//     entity one text column; the serializer splits it for the screen. `content`
//     is the same string as `body` and is there for the API's own sake — render
//     `body`.
//   * **Marking read is idempotent and answers the row**, not a bare 204, so a
//     caller can move state to what came back rather than to what it assumed.
//   * **`unread-count/` exists**, and is cheaper than reading the list and
//     counting it — which matters because the badge is on every route.
//
// Nothing here decides access. Every view scopes to `request.user` in
// `get_queryset` and none takes a user id from anywhere, so somebody else's
// notification is a 404 rather than a 403 — the absence of a code path rather
// than a check that could be forgotten.

/** Every notification the caller has, newest first, across all pages. */
export function listNotifications() {
  return fetchAllPages(api, 'notifications/');
}

/** US-11.1 — the badge. One integer, so the count never has to be derived. */
export async function unreadCount() {
  const response = await api.get('notifications/unread-count/');
  return response.data?.unread ?? 0;
}

/** Mark one read. Idempotent; answers the updated row. */
export async function markRead(notificationId) {
  const response = await api.post(`notifications/${notificationId}/read/`);
  return response.data;
}

/** Mark every unread one read. Answers how many actually changed. */
export async function markAllRead() {
  const response = await api.post('notifications/mark-all-read/');
  return response.data?.updated ?? 0;
}
