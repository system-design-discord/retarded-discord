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
| `primitives/MessageComposer.jsx` | Send and clear, and clear **only** once the server accepted it. Optional `onSchedule` adds the clock button. |
| `ScheduleMessage.jsx` | `U-12`'s modal — pick a time, list what is pending, cancel one. |
| `primitives/EmptyState.jsx` | The shared "nothing here yet" block. |
| `primitives/ConfirmDialog.jsx` | The in-app confirmation for a destructive act, plus `useConfirm()`, which answers a promise of `true`/`false`. **No `window.confirm` anywhere in `src` (#139).** |
| `../layout/NavSidebar.jsx` | The seven-link navigation, written once. |
| `../../hooks/useConversation.js` | Load, send, edit and delete one conversation. |
| `../../services/messages.js` | The only file that knows the message API's field names; exports `targetFor` / `targetOf`. |
| `../../services/scheduling.js` | The scheduled-message endpoints, and the `datetime-local` ↔ ISO conversion. |
| `../../hooks/useScheduledMessages.js` | The pending list and the two writes, plus `pendingFor`. |
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

## Confirming a destructive action

`useConfirm()` answers `[confirm, dialog]`. Call `confirm(options)` and render `dialog`:

```jsx
const [confirm, confirmDialog] = useConfirm();

const destroy = async () => {
  if (!(await confirm({ title: 'Delete it?', body: 'This cannot be undone.' }))) return;
  await remove();
};

return (<>{page}{confirmDialog}</>);
```

Three things to know before you use it.

- **Call the hook above any early `return`.** `ChannelsDashboard` and `GroupSettings` both return
  early — for a stale query parameter and for the loading state — and a hook underneath one of those
  runs on some renders and not others.
- **Render `dialog` as a sibling of a surrounding modal, not a child.** `ScheduleMessage`'s backdrop
  carries `backdrop-blur`, which makes it the containing block for any `fixed` descendant. The
  dialog is `fixed inset-0` and carries the same `z-50`, so being *later in the DOM* is what puts it
  on top.
- **It confirms an intention; it grants nothing.** `roles` is the authority (`architecture.tex`
  §5.1) and the server refuses regardless of what the UI drew. Do not give it a permission prop.

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

## Scheduling

`U-12`, US-B2.1. `MessageComposer` takes an optional `onSchedule`; `Chat.jsx` passes one built from
the target it already holds, so the direct-message, group and topic views all gained the clock
button in one change and none of them mentions scheduling. That is the one rule above, applied: a
second scheduler written into one screen would have undone `F-00`.

The composer awaits `onSchedule` and clears its draft only if the answer is truthy — the same rule
it applies to a send, so a refused schedule leaves the text where the writer can fix it. Because the
modal resolves whenever it is closed rather than when it is opened, `Chat.jsx` parks the promise in
a ref and settles it from `onSettled`, with an unmount cleanup that resolves `false` so a closed tab
cannot leave the button disabled forever.

**Scheduled messages are delivered by a beat task** (`SC-03`,
`backend/scheduling/tasks.py`). It runs every 60 seconds, claims each due row conditionally so two
ticks cannot double-send, and publishes `MESSAGE_CREATED` — so a released message arrives over the
socket and raises a notification exactly like one sent by hand, with the author offline. A row
leaves this modal's list on its own when its time comes.

The amber notice and the *overdue* marker that stood in for the missing dispatcher are **gone**, as
`U-12` said they would be. A row sitting a moment past its time now means the next tick has not
fired yet — at most a minute — so the field's hint says delivery is *around* the chosen time and
nothing is labelled as wrong.

## Known limitations

- **The direct-message conversation list is derived on the client.** There is no `conversations/`
  endpoint, so `DirectMessages.jsx` reads every visible message and groups the ones with a
  `recipient`. It works, and it reads more than it needs to. A real endpoint is the fix.
- **`messages/` returns `sender` nested but `recipient` as a bare id**, so a correspondent's username
  is unknown until they reply. The screen fills the gap with `profile/<id>/`, one call per unnamed
  partner.
- **A pending scheduled message is invisible in its conversation, its author's included.**
  `Message.objects.visible_to` filters `is_delivered=True`, which is what keeps an unreleased
  message out of every view rather than leaving each one to remember. `messages/scheduled/` is the
  only way to see one, which is why the pending list lives inside the modal.
- **The "N scheduled elsewhere" rows are labelled by kind, not by name.** The scheduled list returns
  bare target ids, and resolving a topic's name would need the channel list plus its topics. Saying
  *a channel topic* is less useful than a title and more honest than inventing one.
- **The poll is still there, as a fallback.** `F-07` landed the socket, so a connected conversation
  receives a message the moment it is written and the header says *Live*. `useConversation.js` keeps
  polling underneath at thirty seconds while connected and five while not, because a Redis outage
  makes `realtime/publisher.py` log and skip and a proxy that drops `Upgrade` never completes the
  handshake — in both cases messages arrive late rather than not at all. The header says *Polling*
  when that is what is happening, so the two states are never confused at a demo.

## Who calls this

Four screens, one implementation: `dms/DirectMessages.jsx` (`kind="dm"`), `groups/GroupChat.jsx`
(`kind="group"`), and `channels/ChannelView.jsx` (`kind="topic"`), which `F-05` added as the fourth
caller rather than a third chat. `channels/ChannelsDashboard.jsx` is the channel *list* and links
into the third of those; it no longer renders messages itself.

## Live delivery

`lib/socket.js` is the only file in the SPA that knows a WebSocket exists, the same way
`services/messages.js` is the only one that knows the REST shape. `useConversation` opens one socket
per conversation and closes it on unmount; `openConversationSocket` handles the reconnect,
the exponential backoff with jitter, and the single token refresh a `4401` earns. It never writes —
`realtime/consumers.py` is delivery only and answers anything sent up it with an error naming
`POST /api/messages/`. Two rules in the hook are load-bearing: messages are **deduped by id**,
because a direct message's channel-layer group is symmetric and fans back to its own sender, and
they are **re-sorted by `created_at`**, because a frame can arrive after a later one.

**Both rules apply to the HTTP path too, and `send` is where they were missing** (#137). It appended
the created row unconditionally while `receive` deduped, so the author — and only the author — saw
every message twice: the socket frame consistently beats the POST response back, so `receive` ran
first and found nothing to dedupe against. `send` hands its row to `receive` now, which is what makes
"one merge rule" checkable rather than remembered. The blind append also bypassed the sort, so a
message written while an older frame was still in flight sorted wrongly as well.
