// The eight permissions, in the order `roles.models.PERMISSION_FIELDS` declares
// them. That tuple is fixed by `user_stories_en.tex` §Assumptions and it is the
// contract this file mirrors — the API speaks these exact keys, the `Role`
// model has one boolean column per key, and `me/permissions/` answers with a
// `{key: bool}` map using them.
//
// One definition, for the same reason `lib/pagination.js` is one definition of
// `{count, results}`: F-06 needs them, F-05 needs `can_create_topic` for its
// create-topic gate, and A-10 will need `can_send_media`. A second list would
// drift the moment somebody renames a column.
//
// `key` is what goes over the wire and is deliberately rendered in the UI as
// well: acceptance criterion 2 of F-06 is that the eight toggles map
// one-to-one onto the model booleans, and showing the key is how that is
// demonstrated rather than asserted.

export const PERMISSIONS = [
  {
    key: 'can_send_media',
    label: 'Send media',
    hint: 'Upload images and files into this channel (US-4.8, US-7.3).',
  },
  {
    key: 'can_delete_message',
    label: "Delete others' messages",
    hint: 'Remove a message written by somebody else (US-3.6).',
  },
  {
    key: 'can_create_topic',
    label: 'Create topics',
    hint: 'Add a new topic to this channel (US-4.5).',
  },
  {
    key: 'can_edit_channel',
    label: 'Edit the channel',
    hint: 'Change the channel name, description and avatar (US-4.7, US-6.1).',
  },
  {
    key: 'can_remove_member',
    label: 'Remove members',
    hint: 'Remove somebody from this channel (US-4.3).',
  },
  {
    key: 'can_add_member',
    label: 'Add members',
    hint: 'Add somebody to this channel, unless their own settings refuse it (US-4.4, SH.2).',
  },
  {
    key: 'can_change_role',
    label: 'Manage roles',
    hint: 'Create roles and assign them — the permission this screen itself needs (US-4.2, US-8.1).',
  },
  {
    key: 'can_delete_channel',
    label: 'Delete the channel',
    hint: 'Delete this channel and everything in it (US-4.10, US-6.2).',
  },
];

// F-05's create-topic gate names one key rather than a string literal, which is
// the whole reason this file said it would be needed. A typo in a literal is a
// control that is silently never shown; a typo in an import does not build.
export const CAN_CREATE_TOPIC = 'can_create_topic';

// A-10's toggle is gated on the same key the server gates `PATCH channels/<id>/`
// on, named here for the same reason as above.
export const CAN_EDIT_CHANNEL = 'can_edit_channel';

/** Just the keys, in model order. */
export const PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key);

/** All eight set to false — the shape a freshly created role starts in. */
export function noPermissions() {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false]));
}

/** The subset of a `{key: bool}` map that is granted, as keys. */
export function grantedKeys(permissions) {
  return PERMISSION_KEYS.filter((key) => permissions?.[key]);
}
