// The server's complaint, in the shape DRF actually sends it.
//
// A DRF failure is keyed by field: a permission overreach comes back as
// `{can_delete_channel: ["..."]}`, one entry per permission the caller tried to
// grant beyond their own (US-8.2), a name clash as `{name: ["..."]}`, and a
// plain refusal as `{detail: "..."}`. Flattening loses which field failed, so
// callers get the field names too — except for `detail` and `non_field_errors`,
// which name nothing the user can see.
//
// This lived in `services/roles.js` as `readRoleError` and nothing about it was
// roles-specific. `services/channels.js` needs the same reader and a second copy
// would drift, so it moved here; `roles.js` keeps the old name as an alias so
// its callers are unchanged.

export function readApiError(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;

  const messages = Object.entries(data).flatMap(([field, value]) => {
    const texts = Array.isArray(value) ? value : [String(value)];
    return texts.map((text) => (field === 'detail' || field === 'non_field_errors' ? text : `${field}: ${text}`));
  });

  return messages.length > 0 ? messages.join('\n') : fallback;
}

export default readApiError;
