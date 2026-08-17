import api from './api';

// The one place in the SPA that knows the media API's shape.
//
// Until #123 there was no such place, because nothing in the SPA uploaded
// anything: `grep -rn "FormData\|multipart" src` answered nothing, and
// `services/messages.js#sendMessage` had taken a `mediaId` since it was written
// that no caller ever passed. The backend half has been complete since `A-07`,
// `A-08` and `A-10` — this file is the client it never had.
//
// Four things about the endpoint are worth stating once here rather than being
// rediscovered in a component:
//
//   * **Upload first, attach second.** `POST media/upload/` answers a
//     `MediaFile` row, and `media_id` on `POST messages/` is what ties it to a
//     conversation. There is no one-shot "send a message with a file".
//   * **An upload names its topic when it has one.** The multipart body takes an
//     optional `topic`, and `MediaUploadView.perform_create` reads it to run
//     `roles.require_send_media` at the moment of upload. Without it the
//     restriction is checked only at attach time, which leaves an upload the
//     server accepted and a message it then refuses. DMs and groups have no
//     channel, so they send no topic and there is nothing to evaluate.
//   * **The limits are the server's, mirrored.** The extension allowlist is
//     `media_app.serializers.MediaFileSerializer.validate_file` and the size cap
//     is `media_app.models.MAX_UPLOAD_MB`. Refusing locally is a courtesy that
//     saves a 10MB round trip; it is not the check, and nginx caps the body at
//     12MB besides.
//   * **`file_type` is the server's word, not the browser's.** The view passes
//     the HTTP content type and `MediaFile.save()` then overwrites it from the
//     extension, so the value that comes back is one of `image`, `video`,
//     `audio` or `document` — never a MIME type. `MessageBubble` branches on it.

/** The extensions `MediaFileSerializer.validate_file` accepts, and no others. */
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.mp4', '.mp3', '.pdf', '.zip'];

/** `media_app.models.MAX_UPLOAD_MB`. */
export const MAX_UPLOAD_MB = 10;

/** The `accept` attribute for a file input, from the one allowlist above. */
export const ACCEPT = ALLOWED_EXTENSIONS.join(',');

/**
 * Why this file cannot be uploaded, or `null` if it can.
 *
 * Both rules are the server's and both are enforced there regardless. This
 * exists so a 10MB upload that was always going to be refused is refused before
 * it is sent, and so the reason names the file rather than arriving as a field
 * error keyed `file`.
 */
export function rejectionReason(file) {
  if (!file) return null;

  const dot = file.name.lastIndexOf('.');
  const extension = dot === -1 ? '' : file.name.slice(dot).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `${file.name} is not a kind of file this app accepts. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`;
  }

  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `${file.name} is larger than the ${MAX_UPLOAD_MB}MB limit.`;
  }

  return null;
}

/**
 * US-7.1 — upload one file and get the row back.
 *
 * `topic` is the id of the topic the file is destined for, and is passed only
 * for a channel conversation: it is what lets `A-10`'s restriction be evaluated
 * here rather than only at attach time. Omitting it for a DM or a group is not
 * an oversight — neither has a channel, so neither has a restriction.
 *
 * The axios instance sets no `Content-Type`, which is deliberate: the browser
 * has to write the multipart boundary itself, and naming the header by hand is
 * the classic way to send a body the server cannot parse.
 */
export async function uploadMedia(file, { topic = null } = {}) {
  const body = new FormData();
  body.append('file', file);
  if (topic) body.append('topic', topic);

  const response = await api.post('media/upload/', body);
  return response.data;
}

/** A file size in the units a person reads. */
export function humanSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The last segment of an upload's path — what a person calls the file. */
export function fileNameOf(media) {
  return media?.file ? media.file.split('/').pop() : '';
}
