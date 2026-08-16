# Channels — the channel, topic and role surface

Four cards built this: `F-04` (the dashboard), `F-05` (the channel view), `F-06` (the role manager)
and `A-09` (the seed that gives them something to show). It is the front end of two backend modules,
`channels_app` and `roles`, and it is the screen where `architecture.tex` §5.1 — *no module decides
permissions for itself* — becomes visible to a marker.

Three later issues finished it. Between them, `#125`, `#126` and `#142` were the same defect written
three times: **a permission that was enforced, toggleable and granted nothing.** `can_edit_channel`
unlocked a single boolean and neither of its two topic-facing effects; `can_add_member` and
`can_remove_member` unlocked no screen at all, which meant a channel created from the UI had exactly
one member forever and the whole role system was unexercisable on it. All three were closed by
wiring, not by new endpoints — every one of those was already written and tested.

## The map

| File | What |
|---|---|
| `services/channels.js` | the only file naming the channel and topic API's shape |
| `services/roles.js` | the only file naming the roles API's shape |
| `hooks/useChannels.js` | the list: `channels`, `create`, `remove` |
| `hooks/useChannel.js` | one channel and its topics: `update`, `addTopic`, `renameTopic`, `removeTopic` |
| `hooks/useChannelPermissions.js` | `me/permissions/` — `isOwner`, `can(key)` |
| `hooks/useChannelRoles.js` | the roles and members of one channel, and the six writes |
| `lib/permissions.js` | the eight permission keys, in `roles.models.PERMISSION_FIELDS` order |
| `ChannelsDashboard.jsx` | `/channels` — the list, create, owner-gated delete |
| `ChannelView.jsx` | `/channels/:channelId` — topic tabs, the conversation, the member aside |
| `RoleManager.jsx` | `/channels/:channelId/roles` — the eight toggles, role assignment, add and remove members |
| `ChannelSettings.jsx` | `/channels/:channelId/settings` — name, description, the media default |
| `CreateChannelModal.jsx` | name and description; the dashboard owns the call |

`ChannelView.jsx` renders `chat/Chat.jsx` with `kind="topic"`. **It is the fourth caller of that
component, not a fourth chat.** If you are about to write a message bubble in this directory, `F-00`
has been undone — `../chat/README.md` is the detail.

**Channel settings are a route, not a section of the role manager** (`#125`). `ChannelSettings.jsx`
is the mirror of `groups/GroupSettings.jsx` and holds what the wireframe's *Channel Settings* screen
draws: an Overview block with the name and the description, and a Permission Defaults block with the
media restriction — which used to live on the role manager, because `A-10` had no settings screen to
put it on. It is a property of the channel rather than of a role, so it moved.

Two things that screen deliberately does not have. **Deleting the channel** stays on
`ChannelsDashboard.jsx`, which already confirms it and reports the cascade `C-03` answers with; a
second call site for the same destructive act is how two of them drift apart. **The channel avatar**
is the third field `ChannelSerializer` accepts and the one nothing edits — it is a file upload rather
than a text field, `#104` is the cautionary tale about wiring one of those halfway, and US-4.7 and
US-6.1 are satisfied without it.

There is no channel picker any more. `F-06` shipped one because the dashboard that would link to its
screen was `F-04` and had not landed; `F-04` landed, the channel view links to the role manager from
the channel it governs, and the picker and its `/channels/roles` route are gone.

## The API shapes that bite

1. **`GET channels/<id>/` nests `topics`.** One request, not two — `ChannelSerializer` renders them
   read-only. `listTopics` exists for the cases that genuinely only want the list.
2. **A topic is created at `channels/<id>/topics/`, renamed with a `PATCH` and deleted with a
   `DELETE` at `channels/<id>/topics/<topic_id>/`.** There is no top-level `topics/` collection.
   Creating takes `can_create_topic`; renaming and deleting take **`can_edit_channel`**, because
   being trusted to open a discussion is not being trusted to close somebody else's. A rename that
   collides with another topic in the same channel is a 400 keyed `name`, not a 500 from the unique
   constraint.
3. **Deleting a channel or a topic answers 200 with a body**, not 204 — `{deleted: {topics, members,
   roles, messages}}` and `{deleted_messages: n}`. That is `C-03`'s convention, and the dashboard
   shows the counts rather than discarding them: a cascade the user cannot see is a cascade they
   cannot consent to.
4. **There is no message endpoint under a channel.** A topic message is `POST /api/messages/` with a
   `topic`, read at `?topic_id=`. `channels/<id>/topics/<id>/messages/` never existed;
   `ChannelsDashboard.jsx` called it until `F-04`, which is why that file was rewritten rather than
   extended.
5. **Every list body is `{count, next, previous, results}`** (`PAGE_SIZE` 50, issue #77). Use
   `lib/pagination.js`. `listChannels` uses `fetchAllPages` — a user in more than fifty channels
   would otherwise silently lose the rest.

## The two role shapes that bite

- **Listing roles needs `can_change_role`; listing members needs only membership.** `ChannelView`
  reads the member list to render the aside and would earn a predictable 403 if it asked for roles.
  `useChannelRoles` reads the two **independently** for that reason, and it did not always: they
  shared one `Promise.all` behind one `enabled` flag, so the roles call's 403 took the member list
  down with it. That was harmless while `can_change_role` was the only thing the screen did, and
  stopped being harmless the moment `#142` gave the same screen two controls gated on other
  permissions — a member holding `can_add_member` and nothing else got an empty page.
- **Adding a member is `POST channels/<id>/members/` with a `user_id`; removing is a `DELETE` on
  `channels/<id>/members/<user_id>/`.** Different permissions (`can_add_member`,
  `can_remove_member`), and different again from clearing a role, which is `assignRole(…, null)` and
  leaves the member in the channel holding nothing. Two refusals are worth surfacing rather than
  swallowing: the target has invitations turned off (403, and **SH.2 makes that unpredictable in
  advance** — `PublicUserSerializer` withholds the flag on purpose), and the owner cannot be removed
  (400, because `ERD.tex` makes `Channel : ChannelMember` a `1 : 1..N`). Both are keyed **`error`**
  rather than `detail`, which `lib/apiError.js` already handles.
- **The member list renders `role` as a *name*; assignment takes an *id*.** `ChannelMemberSerializer`
  exposes `['id', 'user', 'role', 'is_owner', 'joined_at']` and carries **none** of the eight
  permission booleans, so a component that needs to know what the current user may do must ask
  `me/permissions/` — which is what `useChannelPermissions` is. `services/roles.js#withRoleIds`
  joins the name back to the id for the assignment control.

## What none of this decides

Nothing here is a permission check. `roles.services` is the authority and `common/permissions.py`
asks it on every call, so every control this directory hides is refused by the server as well with
this UI bypassed entirely — which is exactly what `INT-2`'s matrix exercises, and the reason a
hidden button is evidence of nothing on its own. Hiding a control the server would refuse is a
courtesy to the user; that is its whole job.

Two examples worth knowing, because they are the ones a marker will try:

- **Create topic.** `TopicListCreateView` sets `required_permission = 'can_create_topic'`. The tab
  strip hides the form for a member who does not hold it; `curl -X POST` as that member still gets
  403.
- **Delete a message.** `roles.services.may_delete_message` grants the author, the channel owner and
  a holder of `can_delete_message`. `ChannelView` computes the same rule from `me/permissions/` for
  the delete control, and `MessageDetailView` decides it again for real.
- **Remove a member.** The owner's row offers no Remove button, and that is not what stops the
  removal: `ChannelMemberDetailView.destroy` answers 400 for it whether or not a button was drawn.

One thing the wireframes ask for that the model cannot answer, recorded here rather than half-built.
The Topics screen shows *"Created by @username"* and a per-topic posting lock — but `Topic` is
`id`, `channel`, `name`, `created_at` with no creator FK, and permissions are per **channel**, not
per topic. Both would need a schema change and an `ERD.tex` amendment, so `#126` left them alone;
they are the wireframe over-reaching past the ERD rather than the code falling short.
