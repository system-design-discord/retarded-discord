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

/** The query parameter that narrows `messages/` to one conversation. */
function selectorFor({ kind, id }) {
  if (kind === 'dm') return { user_id: id };
  if (kind === 'group') return { group_id: id };
  if (kind === 'topic') return { topic_id: id };
  throw new Error(`unknown conversation kind: ${kind}`);
}

/** The write field that addresses one conversation. */
function targetFor({ kind, id }) {
  if (kind === 'dm') return { recipient: id };
  if (kind === 'group') return { group: id };
  if (kind === 'topic') return { topic: id };
  throw new Error(`unknown conversation kind: ${kind}`);
}

/** Every message in one conversation, oldest first, across all pages. */
export function listMessages(target) {
  return fetchAllPages(api, 'messages/', { params: selectorFor(target) });
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
