import api from './api';
import { targetFor } from './messages';
import { fetchAllPages } from '../lib/pagination';

// The one place in the SPA that knows the scheduled-message API's shape.
//
// The endpoints are `backend/scheduling/urls.py`. A scheduled message is an
// ordinary `Message` carrying `scheduled_at` and `is_delivered=false`, so the
// body is a message body plus one field — `services/messages.js` owns the
// target mapping and this file imports it rather than restating it.
//
// Five things about this surface, stated once:
//
//   * **`scheduled_at` must be strictly in the future, against the server's
//     clock.** The comparison is `value <= timezone.now()`, so "now" is refused
//     too. A browser a minute fast will have a schedule it thinks is valid
//     rejected, which is why the composer defaults well clear of the boundary.
//   * **A channel message is addressed by its `topic` id.** There is no
//     `channel` field; sending one is silently ignored and the request then
//     fails for having no target at all.
//   * **A pending message is invisible in its conversation, its author's view
//     included.** `Message.objects.visible_to` filters `is_delivered=True`, so
//     `messages/scheduled/` is the only way to see one.
//   * **Cancel is a hard delete and answers 404, never 403**, for anything that
//     is not yours-and-pending — someone else's, an already-delivered one, or
//     an id that never existed all look the same.
//   * **There is no PATCH.** A scheduled message cannot be edited or moved;
//     cancel and re-create is the only reschedule.
//
// **And the one worth knowing about timing:** `SC-03` landed the dispatcher, so
// these are delivered. `backend/scheduling/tasks.py` runs from the beat schedule
// every 60 seconds, flips `is_delivered` under a conditional claim and publishes
// `MESSAGE_CREATED`, which is what puts the message on the socket and raises the
// recipient's notification whether or not the author is still connected. The
// consequence for a caller here is that delivery is accurate to the tick and not
// to the second: a row can appear on `messages/scheduled/` for up to a minute
// after its time, and that is the schedule rather than a failure.

/**
 * US-B2.1 — write a message now and have it sent later.
 *
 * `scheduledAt` is an ISO 8601 string. Answers the created message with
 * `is_delivered: false`; the server refuses a past time with a `scheduled_at`
 * field error and a non-member with 403, exactly as `POST /api/messages/` does.
 */
export async function scheduleMessage(target, { text, scheduledAt, mediaId = null }) {
  const payload = { ...targetFor(target), text, scheduled_at: scheduledAt };
  if (mediaId) payload.media_id = mediaId;

  const response = await api.post('messages/schedule/', payload);
  return response.data;
}

/** The caller's pending schedules, soonest first, across all pages. */
export function listScheduledMessages() {
  return fetchAllPages(api, 'messages/scheduled/');
}

/** Cancel one before it sends. 204 and a hard delete; nothing to return. */
export async function cancelScheduledMessage(messageId) {
  await api.delete(`messages/scheduled/${messageId}/cancel/`);
  return null;
}

/**
 * `<input type="datetime-local">` gives a naive local string; the API wants
 * ISO 8601 with an offset.
 *
 * `new Date(value)` reads that string in the browser's zone, which is the zone
 * the person picking the time is in, and `toISOString` converts it to UTC. The
 * round trip is what stops "9am" meaning 9am UTC to a reader in Tehran.
 * Answers `null` for an unparseable value rather than `"Invalid Date"`.
 */
export function isoFromLocalInput(value) {
  if (!value) return null;
  const when = new Date(value);
  return Number.isNaN(when.getTime()) ? null : when.toISOString();
}

/**
 * Now, in the shape `<input type="datetime-local">` wants for its `min`.
 *
 * The input takes local time with no zone, so `toISOString` is exactly wrong
 * here — it would offset the floor by the reader's distance from UTC and let a
 * Tehran user pick a time three and a half hours in the past.
 */
export function localInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
