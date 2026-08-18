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
| `Chat.jsx` | The conversation view. Takes a target (`kind` + `id`) and a little chrome — title, an optional `avatar` drawn beside it, subtitle, an aside, a header slot — and renders it. Knows nothing about which kind it is showing; the `avatar` is passed no `online` prop, because a group is not a person. |
| `primitives/Avatar.jsx` | The face. An `<img>` when given a `src`, the initial when not or when the image fails to load — signed media URLs expire, and a dead token must look like no avatar rather than like a bug. An optional `online` prop draws the presence dot, so seven call sites got it without seven dots. |
| `primitives/Timestamp.jsx` | The single date-formatting rule: a clock time today, a date as well when older. |
| `primitives/MessageBubble.jsx` | Author, time, text, the `(edited)` marker, the attachment rendered as its own kind, and the inline edit form. |
| `primitives/MessageList.jsx` | The scroll container and the three states a list actually has — loading, empty, populated. |
| `primitives/MessageComposer.jsx` | Send and clear, and clear **only** once the server accepted it. Optional `onSchedule` adds the clock button; the paperclip picks a file. |
| `ScheduleMessage.jsx` | `U-12`'s modal — pick a time, list what is pending, cancel one. |
| `primitives/EmptyState.jsx` | The shared "nothing here yet" block. |
| `primitives/ConfirmDialog.jsx` | The in-app confirmation for a destructive act, plus `useConfirm()`, which answers a promise of `true`/`false`. **No `window.confirm` anywhere in `src` (#139).** |
| `../layout/NavSidebar.jsx` | The seven-link navigation, written once. |
| `../../hooks/useConversation.js` | Load, send, edit and delete one conversation. |
| `../../services/messages.js` | The only file that knows the message API's field names; exports `targetFor` / `targetOf`. |
| `../../services/media.js` | The only file that knows the media API's shape: `uploadMedia`, the extension allowlist and the size cap. |
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

## Attachments

`#123` is the card, and what it closed was not a missing endpoint. `POST media/upload/` has worked
since `A-07`, `MediaDetailView`'s scoping since `A-08`, the per-channel gate since `A-10`, and
`services/messages.js#sendMessage` had taken a `mediaId` since it was written **that no caller ever
passed**. Media sharing is `doc.tex` §4.7 and US-2.4 / US-7.1 / US-7.2 — mandatory, not bonus — and
none of it was reachable from the product. It went unnoticed because `seed_data` attaches one file
to one seeded message, so a walkthrough saw an attachment and reasonably concluded the feature
worked.

**The order is fixed by the API and it is two requests, not one.** Upload to `media/upload/`, take
the `id` off the row that comes back, then pass it as `media_id` when creating the message. There is
no one-shot "send a message with a file".

**The upload happens in `useConversation`, not in the composer**, and that placement is the point.
An attachment is two requests that must either both succeed or leave the screen untouched, so it
belongs in the one place that owns `error` and that already holds the rule about state only ever
moving to what the server returned. `send(text, file)` answers **`false` when nothing was sent**,
which is what lets the composer keep the draft *and* the attachment on a refusal — the same "clear
only on success" rule `#78` bought, extended to cover the file.

**A topic upload names its topic.** `MediaUploadView.perform_create` reads an optional `topic` from
the multipart body so `roles.require_send_media` runs at the moment of upload; without it the
restriction is checked only when the message is created, which leaves a file the server accepted and
a message it then refuses. A DM and a group send no topic, because neither has a channel and neither
has a restriction to evaluate. `messaging.views` checks it again at attach time regardless — an
upload need not declare a topic, so a single gate would be a bypass.

**`file_type` is the server's word.** `MediaFile.save()` overwrites whatever the browser claimed with
one of `image`, `video`, `audio` or `document`, derived from the extension. `MessageBubble` branches
on it: an image renders inline and links through to the original, video and audio get players, and a
document keeps the paperclip-and-filename link. Before `#123` all four rendered as the last of those,
so an image was a paperclip.

**A media-only message is legitimate.** `Message.text` is `blank=True, null=True` and the serializer
does not require it, so the composer's submit guard is "text **or** a file", not "text".

Two limits are the server's and are mirrored locally in `services/media.js` — the extension allowlist
from `MediaFileSerializer.validate_file` and the 10MB cap from `media_app.models.MAX_UPLOAD_MB`.
Refusing early saves sending megabytes that were always going to 400, and names the file rather than
reporting a field error keyed `file`. It is not the check; nginx caps the body at 12MB besides.

The one thing an attachment cannot do is be scheduled: `ScheduleMessage` is handed a draft string,
so the clock button is disabled while a file is picked rather than silently dropping it.

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

The attach path goes through `receive` as well, for the same reason: an attachment is still one
message, and it is the socket frame that usually shows it first.

**Both rules apply to the HTTP path too, and `send` is where they were missing** (#137). It appended
the created row unconditionally while `receive` deduped, so the author — and only the author — saw
every message twice: the socket frame consistently beats the POST response back, so `receive` ran
first and found nothing to dedupe against. `send` hands its row to `receive` now, which is what makes
"one merge rule" checkable rather than remembered. The blind append also bypassed the sort, so a
message written while an older frame was still in flight sorted wrongly as well.

### Edits and deletions travel too

`message.updated` and `message.deleted` are the other two frames, and they are the fix for *"the
edit does not show for the other person until they refresh"*. `MessageDetailView` published nothing
on update or delete, so the gateway had nothing to fan out and the only thing that ever corrected the
other screen was the fallback poll above — which backs off to **thirty seconds precisely while the
socket is connected**. That is why it read as "never" rather than as "slow".

`useConversation` applies them with two reducers beside `receive`, and the separation is the point:

* `applyUpdate` **replaces by id and does nothing when the id is absent.** An edit is not an arrival,
  and inserting a message this client never loaded would drop a row from the middle of the history at
  the bottom of the screen.
* `applyRemoval` filters it out.

**`receive` stays insert-if-absent.** Making it a general upsert would serve all three frames with
one function and would bring #137's doubled message straight back, because the dedupe *is* the fix.

`edit` and `remove` keep writing to local state optimistically; the socket echo that follows is
idempotent against both, so the author sees no flicker and the other end sees no delay.

### Closing on `pagehide`

`openSocket` registers a `pagehide` handler that closes the connection, and it is not a tidy-up.
**React does not run effect cleanups when the document is destroyed** — a full page load, a typed
URL, a closed tab — so `return () => socket.close()` never fires there and the socket is left for the
browser to reap whenever it likes. Four page loads in one tab measured as four connections still open
on the server, all of them until the browser exited. Nothing depended on that until presence did, and
then it was the whole bug: logging out closed the socket the current page had opened while every
socket the earlier pages left behind kept the user marked online.
