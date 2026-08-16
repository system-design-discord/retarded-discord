import api from './api';
import { fetchAllPages } from '../lib/pagination';

// The one place in the SPA that knows the message API's shape.
//
// Three field names have cost this project real time, so they are stated once
// here and nowhere else:
//
//   * the target field is `recipient`, `group` or `topic` — never `*_id`;
//   * the body field is `text` — never `content`;
//   * a list body is `{count, results}` — never an array.
//
// A message carries exactly one target. That is enforced twice on the server
// (MessageSerializer.validate and a database check constraint), so sending two
// is a 400, not a silent preference.
//
// `targetFor` and `targetOf` are exported for `services/scheduling.js`, which
// addresses the same three targets on a different endpoint. It imports them
// rather than restating the mapping, because "never `*_id`" is only true while
// there is one place that could get it wrong.

/** The query parameter that narrows `messages/` to one conversation. */
function selectorFor({ kind, id }) {
  if (kind === 'dm') return { user_id: id };
  if (kind === 'group') return { group_id: id };
  if (kind === 'topic') return { topic_id: id };
  throw new Error(`unknown conversation kind: ${kind}`);
}

/** The write field that addresses one conversation. */
export function targetFor({ kind, id }) {
  if (kind === 'dm') return { recipient: id };
  if (kind === 'group') return { group: id };
  if (kind === 'topic') return { topic: id };
  throw new Error(`unknown conversation kind: ${kind}`);
}

/**
 * The conversation a message belongs to — `targetFor` read backwards.
 *
 * `messages/` and `messages/scheduled/` both return `recipient`, `group` and
 * `topic` as **bare ids** with the other two null, so anything holding a
 * message and wanting to know where it goes has to invert the mapping. Doing
 * that here keeps the three field names in one file.
 *
 * Note the asymmetry a caller has to live with: a DM's target is its
 * `recipient`, which is the *other* person only when you are the sender. The
 * scheduled list is the caller's own, so there it always is.
 */
export function targetOf(message) {
  if (message?.recipient != null) return { kind: 'dm', id: message.recipient };
  if (message?.group != null) return { kind: 'group', id: message.group };
  if (message?.topic != null) return { kind: 'topic', id: message.topic };
  return null;
}

/** Every message in one conversation, oldest first, across all pages. */
export function listMessages(target) {
  return fetchAllPages(api, 'messages/', { params: selectorFor(target) });
}

/**
 * US-9.1 — every hit for `q`, across all pages.
 *
 * The search screen used to keep `results` alone and then label its length as
 * the total (#103), so a query matching 60 messages reported "50 matches" and
 * the other ten were both uncounted and unreachable. Following `next` fixes the
 * count and the omission together, which reading `count` alone would not.
 */
export function searchMessages(q) {
  return fetchAllPages(api, 'messages/search/', { params: { q } });
}

/**
 * Every message the caller can see, across all pages.
 *
 * There is no `conversations/` endpoint, so both conversation lists in the app
 * are derived client-side from the messages themselves: `messages/` with no
 * selector returns everything `Message.objects.visible_to` allows, and each
 * target is a subset of that. A real `conversations/` endpoint is the fix and
 * belongs to whoever picks it up.
 */
export function listVisibleMessages() {
  return fetchAllPages(api, 'messages/');
}

/** The direct-message subset — those carrying a `recipient`. */
export async function listDirectMessages() {
  const messages = await listVisibleMessages();
  return messages.filter((message) => message.recipient !== null);
}

export async function sendMessage(target, { text, mediaId = null }) {
  const payload = { ...targetFor(target), text };
  if (mediaId) payload.media_id = mediaId;

  const response = await api.post('messages/', payload);
  return response.data;
}

/**
 * US-3.1 — edit one's own message.
 *
 * Only `text` is writable; the server reads a PATCH through a serializer with
 * exactly one writable field, so an edit cannot move a message into another
 * conversation. Anyone but the author gets 403 — including a moderator who may
 * *delete* the same message, which is the asymmetry US-3.2 asks for.
 */
export async function editMessage(id, text) {
  const response = await api.patch(`messages/${id}/`, { text });
  return response.data;
}

/** US-3.3 to US-3.6 — the author, a group admin, a channel owner, or a holder
 *  of `can_delete_message`. The server decides; this only asks. */
export function deleteMessage(id) {
  return api.delete(`messages/${id}/`);
}
