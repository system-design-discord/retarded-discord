import api from './api';
import { fetchAllPages } from '../lib/pagination';

// The one place in the SPA that knows the channel and topic API's shape.
//
// The endpoints are `backend/channels_app/urls.py`. Four things about them are
// worth stating once here rather than being rediscovered in a component:
//
//   * **A channel carries its topics.** `ChannelSerializer` nests them
//     read-only, so opening a channel is one request and not two. `listTopics`
//     exists for the case where only the topics changed.
//   * **A topic is created at `channels/<id>/topics/` and nowhere else.** The
//     body names only `name`; `channel` comes from the URL, because letting the
//     body name a different channel would route around the permission check
//     that resolved that id.
//   * **Deleting answers 200 with a body, not 204.** C-03's criterion is that a
//     cascade is not silent, so a channel delete reports
//     `{deleted: {topics, members, roles, messages}}` and a topic delete
//     `{deleted_messages: n}`. A caller that checks for 204 sees a failure that
//     did not happen.
//   * **Messages in a topic are not here.** They are `services/messages.js` —
//     `messages/?topic_id=` to read and `messages/` with a `topic` to write.
//     `channels/<id>/topics/<id>/messages/` does not exist and will not.
//
// Nothing here decides access. The list is scoped by
// `ChannelListCreateView.get_queryset` to channels the caller owns or belongs
// to, creating a topic is gated on `can_create_topic` by the server, and every
// refusal below is the server's.

/** Channels the caller owns or belongs to, across all pages. */
export function listChannels() {
  return fetchAllPages(api, 'channels/');
}

/** One channel, with its topics nested. Needs membership, not a permission. */
export async function getChannel(channelId) {
  const response = await api.get(`channels/${channelId}/`);
  return response.data;
}

/**
 * US-4.1 — create a channel and become its admin.
 *
 * "Become its admin" needs no second call: `Channel.objects.create_with_owner`
 * writes the creator's `ChannelMember` in the same transaction, and
 * `roles.services` treats the owner as implicitly holding all eight
 * permissions, so there is no role row to assign either.
 */
export async function createChannel(body) {
  const response = await api.post('channels/', body);
  return response.data;
}

/** US-4.7 / US-6.1 — rename or re-describe a channel. Needs `can_edit_channel`. */
export async function updateChannel(channelId, body) {
  const response = await api.patch(`channels/${channelId}/`, body);
  return response.data;
}

/**
 * US-4.10 / US-6.2 — delete a channel. Needs `can_delete_channel`.
 *
 * Answers **200** with `{deleted: {topics, members, roles, messages}}`, which
 * is what went with it. Returned rather than discarded so a caller can say so.
 */
export async function deleteChannel(channelId) {
  const response = await api.delete(`channels/${channelId}/`);
  return response.data?.deleted ?? null;
}

/** The topics of one channel. Needs membership. */
export function listTopics(channelId) {
  return fetchAllPages(api, `channels/${channelId}/topics/`);
}

/** US-4.5 — add a topic. Needs `can_create_topic`; the server enforces it. */
export async function createTopic(channelId, name) {
  const response = await api.post(`channels/${channelId}/topics/`, { name });
  return response.data;
}

/**
 * Delete a topic. Needs `can_edit_channel` — being trusted to open a discussion
 * is not the same as being trusted to close somebody else's.
 *
 * Also 200 with a body: `{deleted_messages: n}`.
 */
export async function deleteTopic(channelId, topicId) {
  const response = await api.delete(`channels/${channelId}/topics/${topicId}/`);
  return response.data?.deleted_messages ?? 0;
}
