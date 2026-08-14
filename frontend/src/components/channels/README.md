# Channels — the channel, topic and role surface

Four cards built this: `F-04` (the dashboard), `F-05` (the channel view), `F-06` (the role manager)
and `A-09` (the seed that gives them something to show). It is the front end of two backend modules,
`channels_app` and `roles`, and it is the screen where `architecture.tex` §5.1 — *no module decides
permissions for itself* — becomes visible to a marker.

## The map

| File | What |
|---|---|
| `services/channels.js` | the only file naming the channel and topic API's shape |
| `services/roles.js` | the only file naming the roles API's shape |
| `hooks/useChannels.js` | the list: `channels`, `create`, `remove` |
| `hooks/useChannel.js` | one channel and its topics: `addTopic`, `removeTopic` |
| `hooks/useChannelPermissions.js` | `me/permissions/` — `isOwner`, `can(key)` |
| `hooks/useChannelRoles.js` | the roles and members of one channel, and the four writes |
| `lib/permissions.js` | the eight permission keys, in `roles.models.PERMISSION_FIELDS` order |
| `ChannelsDashboard.jsx` | `/channels` — the list, create, owner-gated delete |
| `ChannelView.jsx` | `/channels/:channelId` — topic tabs, the conversation, the member aside |
| `RoleManager.jsx` | `/channels/:channelId/roles` — the eight toggles and role assignment |
| `CreateChannelModal.jsx` | name and description; the dashboard owns the call |

`ChannelView.jsx` renders `chat/Chat.jsx` with `kind="topic"`. **It is the fourth caller of that
component, not a fourth chat.** If you are about to write a message bubble in this directory, `F-00`
has been undone — `../chat/README.md` is the detail.

There is no channel picker any more. `F-06` shipped one because the dashboard that would link to its
screen was `F-04` and had not landed; `F-04` landed, the channel view links to the role manager from
the channel it governs, and the picker and its `/channels/roles` route are gone.

## The API shapes that bite

1. **`GET channels/<id>/` nests `topics`.** One request, not two — `ChannelSerializer` renders them
   read-only. `listTopics` exists for the cases that genuinely only want the list.
2. **A topic is created at `channels/<id>/topics/` and deleted at `channels/<id>/topics/<topic_id>/`.**
   There is no top-level `topics/` collection.
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
