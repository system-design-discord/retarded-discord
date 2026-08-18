# The group surface

`U-07`, `U-08` and `U-10`. Three screens over three endpoints, and the endpoints are the
interesting part — `groups_app` is the module whose API shape least resembles the rest of the
product, and most of what is below exists because of that.

## What is here

| | |
|---|---|
| `GroupsDashboard.jsx` | The groups you belong to. Create, open, and a link to settings on every row. |
| `GroupChat.jsx` | The conversation, through the shared `Chat`. Adds the name and the member aside. |
| `GroupSettings.jsx` | `U-10`. Rename, re-describe, add and remove members, delete. Route `/groups/:groupId/settings`. |
| `CreateGroupModal.jsx` | Name and description. Presentational; the write is the hook's. |
| `../../services/groups.js` | The only file that knows the group API's shape. |
| `../../hooks/useGroups.js` | The list, plus create and delete. |
| `../../hooks/useGroup.js` | One group, plus the four writes `U-10` makes. |
| `../../services/users.js` | `GET /api/users/?search=` — the picker behind "add a member". |

## The API shapes that bite

- **`POST groups/<id>/members/` with `{user_id, action}` is the only member mutation.**
  `DELETE groups/<id>/members/<user_id>/` looks like it should exist because `channels_app` has
  exactly that shape. It does not.
- **Refusals here are keyed `error`, not `detail`.** The view hand-rolls them rather than raising,
  so `lib/apiError` had to learn a third anonymous key. Everything routed through `roles` still
  answers `detail`, and both reach the banner as a plain sentence.
- **The admin gate runs before the body is validated**, so a non-admin sending nonsense gets 403 and
  not 400 — deliberate, so an unauthorized caller learns nothing about the parameters.
- **Adding is refused by the target's `allow_invites`, and that flag is unreadable in advance.**
  `PublicProfileSerializer` omits it because SH.2 is precisely that an inviter may not know. The UI
  cannot grey anybody out; it attempts the add and shows the server's 403, which names them.
- **Adding an existing member answers 200 having written nothing.** Every write re-reads the group
  for this reason, and the picker filters out current members so the cheerful reply is never the
  only thing the user sees.
- **Removing the admin is a 400, not a 403.** A group has exactly one admin, so *remove the last
  admin* and *the admin removes themselves* are the same act and the same message.
- **There is no leave *endpoint*, but leaving works.** Since `A-10`,
  `roles.may_remove_group_member` grants `actor == target` for any member, so leaving is
  `removeMember(groupId, myOwnId)` — the same call with your own id. The admin is the one member
  still refused, and that is the 400 above and not a permission refusal. `GroupSettings` offers it in
  its danger zone, and that screen is linked from the group list and from the chat header, so every
  member can reach it.
- **`DELETE groups/<id>/` is 204 with no body.** Unlike a channel delete, which reports what
  cascaded, there is nothing to show afterwards — so the screen warns before instead.
- **The list is paginated.** It always was; reading it as an array is what made `/groups` show its
  empty state to everybody until `U-10`. `useGroups` goes through `lib/pagination`.

## The group picture, and edits arriving live

A group has an `avatar` — the same signed-URL field a user profile has — and `GroupSettings` uploads
it through the shared `AvatarField`. Its Remove control sends `avatar: null`, which reaches the
server as JSON: `lib/multipart.js#toRequestBody` only builds a `FormData` when the body carries a
`File`, and a `FormData` would drop the `null` on the way. So picking a file and removing the
picture are mutually exclusive in the UI because they are mutually exclusive on the wire.

The picture is then drawn wherever the group's name is — the group list, the chat header, the
settings header and the dashboard's recent conversations. It is an `Avatar` with no `online` prop,
so no presence dot: a group is not a person. `useRecentChats` carries it on the row, taken from the
`listGroups()` map the hook already fetches, because a message payload names its group by bare id.

`useGroups` and `useGroup` re-read on `structure.changed` frames off the notification socket — a
rename by another member reaches the header without a reload, and a group you were just added to
appears in the list. `useGroup` matches on `scope === 'group' && id === mine` and sets `gone` when
the frame says this group was deleted, at which point `GroupChat` and `GroupSettings` navigate to
`/groups` rather than re-reading into a 404. `backend/realtime/README.md` describes the frame.

## Why settings is a route and not a modal

`/groups/:groupId/settings`, mirroring `/channels/:channelId/roles`. `GroupChat`'s member aside is
`hidden lg:block`, so before this card a phone had no member list at all, let alone a way to manage
one — the chat header's ⚙️ link is the way in and it is shown to everyone, which since `#124` is
not merely a courtesy: a member reaching this screen can rename the group and delete it. A dialog
holding a rename form, a member list, a search and a danger zone is also not a dialog. And "the
change survives a reload" is trivially demonstrable at a URL.

## What none of this decides

Not one permission. `roles.may_edit_group` and `roles.may_delete_group` gate the edit and the
delete, and the members view gates add and remove.

**Which of those is the admin's is not the same answer for all four**, and `#124` is why. Editing
and deleting the group are **member** rights — doc.tex §4.6, US-6.3, US-6.4 — while adding and
removing a member is the admin's. The two used to be asked as
`has_group_permission(group, 'can_edit_channel' | 'can_delete_channel')`, which handed a group the
channel's rule along with the channel's name and refused an ordinary member both. So the only
`isAdmin` guards left on `GroupSettings.jsx` are the ones around member management.

There is **no `groups/<id>/me/permissions/`** the way there is for a channel, so `isGroupAdmin`
compares `group.admin.id` to the signed-in user; that is the only answer a client can get, it lives
in `services/groups.js`, and hiding a control with it is a courtesy on top of a refusal that happens
anyway. Walk any of it with the UI bypassed and the API still says no.
