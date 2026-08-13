# The chat surface

Three screens show a conversation — direct messages (`F-03`), a group (`U-09`) and a channel topic
(`F-05`, still open) — and they are **the same UI with a different target**. `F-00` exists so that
the second and third are wiring rather than a second and third implementation.

## The one rule

**There is exactly one `MessageBubble` in this codebase.** If a fourth conversation kind appears and
somebody writes another one, `F-00` has been undone. Add a prop instead.

## What is here

| | |
|---|---|
| `Chat.jsx` | The conversation view. Takes a target (`kind` + `id`) and a little chrome — title, subtitle, an aside, a header slot — and renders it. Knows nothing about which kind it is showing. |
| `primitives/Avatar.jsx` | Initial circle, sized by prop. |
| `primitives/Timestamp.jsx` | The single date-formatting rule: a clock time today, a date as well when older. |
| `primitives/MessageBubble.jsx` | Author, time, text, the `(edited)` marker, attached media, and the inline edit form. |
| `primitives/MessageList.jsx` | The scroll container and the three states a list actually has — loading, empty, populated. |
| `primitives/MessageComposer.jsx` | Send and clear, and clear **only** once the server accepted it. |
| `primitives/EmptyState.jsx` | The shared "nothing here yet" block. |
| `../layout/NavSidebar.jsx` | The seven-link navigation, written once. |
| `../../hooks/useConversation.js` | Load, send, edit and delete one conversation. |
| `../../services/messages.js` | The only file that knows the message API's field names. |
| `../../lib/pagination.js` | `unwrapList` and `fetchAllPages`. |

## Three traps, all of which have cost this project time

1. **The write field is `recipient`, `group` or `topic` — never `*_id`.** `Chat.jsx` posted
   `{text, group_id}` for four days; the serializer takes `group`, so every group message 400'd
   (issue #78). A message carries **exactly one** of the three; sending two is a 400, enforced by the
   serializer and again by a database check constraint.
2. **The body field is `text`, not `content`.** Nothing in the API has ever taken `content`.
3. **Every list body is `{count, next, previous, results}`,** never an array (issue #77). Use
   `unwrapList`. For a conversation use `fetchAllPages` — `PAGE_SIZE` is 50 and messages are ordered
   oldest-first, so reading only `results` shows the first 50 messages ever sent and hides the rest.

There is no message endpoint nested under a channel or a group. A channel message is
`POST /api/messages/` with a `topic`, read at `?topic_id=`; `channels/<id>/topics/<id>/messages/`
does not exist and will not.

## What this layer does not decide

Whether the caller may edit or delete is **not** decided here. `roles.services` is the authority
(`architecture.tex` §5.1): `may_edit_message` grants the author and nobody else, and
`may_delete_message` also grants a group admin, a channel owner and a holder of
`can_delete_message`. `MessageBubble` takes `canEdit` and `canDelete` as props purely so the UI does
not offer a control the server will refuse — hiding one changes nothing about what the API allows,
and the hook surfaces the server's 403 rather than swallowing it.

## Known limitations

- **The direct-message conversation list is derived on the client.** There is no `conversations/`
  endpoint, so `DirectMessages.jsx` reads every visible message and groups the ones with a
  `recipient`. It works, and it reads more than it needs to. A real endpoint is the fix.
- **`messages/` returns `sender` nested but `recipient` as a bare id**, so a correspondent's username
  is unknown until they reply. The screen fills the gap with `profile/<id>/`, one call per unnamed
  partner.
- **New messages arrive by a 5-second poll, not a socket.** Live delivery is `F-07`, which was cut at
  the Aug 11 bonus gate. The poll is named as a poll in `useConversation.js` and does not pretend
  otherwise.
- **`ChannelsDashboard.jsx` does not use any of this yet.** That is `F-04` and `F-05`.
