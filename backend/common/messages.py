"""Every string the API can put in front of a user, in one place.

The SPA is English — every label, heading and button, every wireframe and every
user story. For a long time the API answering it was not: the error vocabulary
and the seeded demo world were Persian, so a refused group edit rendered an
English screen wrapped around a Persian sentence (#127).

The interface speaks English. That is the decision this module records, and
holding the text here rather than at the `raise` site is what keeps it true:
four of these sentences used to exist twice over — `NO_PERMISSION` lived in
`common/permissions.py` and in `roles/services.py` twice more — and a duplicate
is how a vocabulary drifts one string at a time.

Two things are deliberately *not* here. Model `verbose_name`s are Persian and
stay Persian: they are Django admin metadata, not a screen. And message *text*
written by users is whatever language they type — which is exactly why
`messaging.models.SEARCH_CONFIG` is `'simple'` (execution plan, deviation 11).
Mixed message text is a feature; mixed interface text was not.

Templates take keyword arguments, so a caller reads as
`messages.USER_ADDED_TO_GROUP.format(username=user.username)`.
"""

# --- Permissions and membership — roles.services, common.permissions --------

NO_PERMISSION = "You do not have permission to perform this action."
NOT_CHANNEL_MEMBER = "You are not a member of this channel."
NOT_GROUP_MEMBER = "You are not a member of this group."
NOT_MESSAGE_AUTHOR = "Only the author of a message may edit it."
NO_PERMISSION_TO_DELETE_MESSAGE = "You do not have permission to delete this message."
MEDIA_RESTRICTED_IN_CHANNEL = "Sending media is restricted in this channel."

# --- Groups -----------------------------------------------------------------

NO_PERMISSION_TO_EDIT_GROUP = "You do not have permission to modify this group."
ONLY_GROUP_ADMIN_MANAGES_MEMBERS = "Only the group admin can manage members."
INVALID_PARAMETERS = "The parameters supplied are not valid."
USER_DISALLOWS_GROUP_INVITES = "User {username} does not allow being added to groups."
USER_ADDED_TO_GROUP = "User {username} was added to the group."
CANNOT_REMOVE_GROUP_ADMIN = "The group admin cannot be removed."
USER_REMOVED_FROM_GROUP = "User {username} was removed from the group."

# --- Channels and topics ----------------------------------------------------

USER_ID_REQUIRED = "A user id is required."
ALREADY_CHANNEL_MEMBER = "User {username} is already a member of this channel."
USER_DISALLOWS_CHANNEL_INVITES = "User {username} does not allow being added to channels."
CANNOT_REMOVE_CHANNEL_OWNER = "The channel owner cannot be removed."
CHANNEL_NAME_REQUIRED = "A channel name cannot be empty."
TOPIC_NAME_REQUIRED = "A topic name cannot be empty."
TOPIC_NAME_TAKEN = "A topic with this name already exists in this channel."

# --- Roles ------------------------------------------------------------------

ROLE_NAME_REQUIRED = "A role name cannot be empty."
ROLE_NAME_TAKEN = "A role with this name already exists in this channel."
CANNOT_GRANT_UNHELD_PERMISSION = "You do not hold this permission, so you cannot grant it."
ROLE_BELONGS_TO_ANOTHER_CHANNEL = "This role belongs to a different channel."
# US-8.2. The offending permission keys are appended by the caller.
ROLE_GRANTS_UNHELD_PERMISSIONS = "This role grants permissions you do not hold: "

# --- Messaging --------------------------------------------------------------

MESSAGE_NEEDS_A_TARGET = "A message must have a recipient, a group or a topic."
MESSAGE_NEEDS_ONE_TARGET = "A message must have exactly one target: a recipient, a group or a topic."
MESSAGE_TEXT_REQUIRED = "Message text cannot be empty."

# --- Accounts ---------------------------------------------------------------

PASSWORDS_DO_NOT_MATCH = "The two password fields did not match."
REFRESH_TOKEN_REQUIRED = "A refresh token is required."
INVALID_VALUE = "Invalid value."
BIO_TOO_LONG = "A bio cannot be longer than {limit} characters."
USERNAME_TAKEN = "This username is already taken."

# --- Media ------------------------------------------------------------------

FILE_TYPE_NOT_ALLOWED = "File type not allowed. Allowed types: {allowed}."
FILE_TOO_LARGE = "A file cannot be larger than {limit_mb} MB."

# --- Scheduling -------------------------------------------------------------

SCHEDULE_MUST_BE_IN_THE_FUTURE = "A scheduled message must be set for a time in the future."

# --- Notification bodies ----------------------------------------------------
# These are written into `Notification.content`, so they are user-facing twice:
# once live over the socket and once for every later read of the row.

NOTIFICATION_NEW_GROUP_MESSAGE = "New message from {sender} in group {group}"
NOTIFICATION_NEW_TOPIC_MESSAGE = "New message from {sender} in {channel} › {topic}"
NOTIFICATION_NEW_DIRECT_MESSAGE = "New message from {sender}"
NOTIFICATION_ADDED_TO = "You were added to {where}."
NOTIFICATION_ROLE_CHANGED = 'Your role in {channel} changed to "{role}".'
NO_ROLE = "no role"
