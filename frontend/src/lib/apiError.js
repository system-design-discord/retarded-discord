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
//
// `error` joined `detail` and `non_field_errors` when `U-10` arrived.
// `groups_app` hand-rolls its refusals as `{"error": "..."}` where everything
// routed through `roles` answers `{"detail": "..."}`, and `accounts`' privacy
// view does the same. Without it the group screens render *"error: تنها ادمین
// گروه…"* — a field name in front of a sentence, naming a field that does not
// exist. Normalising it in `services/groups.js` instead would have meant either
// rewriting an axios error in flight or catching inside a service, and the
// service layer's rule is that errors propagate.

export function readApiError(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;

  const messages = Object.entries(data).flatMap(([field, value]) => {
    const texts = Array.isArray(value) ? value : [String(value)];
    const anonymous = field === 'detail' || field === 'non_field_errors' || field === 'error';
    return texts.map((text) => (anonymous ? text : `${field}: ${text}`));
  });

  return messages.length > 0 ? messages.join('\n') : fallback;
}

export default readApiError;
