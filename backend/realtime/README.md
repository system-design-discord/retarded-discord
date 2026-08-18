# Realtime — the WebSocket gateway

`architecture.tex` §5, bonus. Owns no entities: it maintains connections and pushes what other
modules produced.

**US-B1.1.** Cards `RT-01` (the channel layer) and `RT-02` (this).

## The one rule

**The socket is delivery only. There is exactly one write path and it is `POST /api/messages/`.**

The consumer this replaced created `Message` rows straight from the client's JSON. That bypassed
`MessageSerializer.validate`, the `message_has_exactly_one_target` database check constraint, and
the membership rule in `MessageListCreateView.perform_create` — three guarantees the REST path
spends real code establishing, all of them optional if a second way in exists. If you are about to
make `receive()` save something, stop: the REST endpoint is already there and already correct.

## Connecting

    ws://<host>/ws/dm/<user_id>/?token=<access>
    ws://<host>/ws/group/<group_id>/?token=<access>
    ws://<host>/ws/topic/<topic_id>/?token=<access>
    ws://<host>/ws/notifications/?token=<access>

The first three mirror `messaging`'s three targets exactly, so a client that can name a conversation
for the REST API can name it here.

The fourth is `RT-03` and takes **no id**: a notification belongs to exactly one person, and that
person is whoever the token says you are. Putting a user id in the path would be an invitation to
ask for somebody else's.

**Identity is `scope['user']`, never the payload.** The old consumer took `user_id` and `username`
out of the client's JSON, so the sender was whoever the client claimed to be — anyone could post as
anyone. `middleware.py` puts a verified user on the scope or nobody.

**The token is a query parameter and that is a deliberate trade.** A browser's `WebSocket`
constructor takes a URL and a subprotocol list; it cannot set an `Authorization` header. The cost is
that the token appears in access logs, bounded by the access token's lifetime and confined to the
single origin nginx serves. A cookie-based handshake is the better answer and was out of scope for a
bonus card landed after the freeze — say so in `D-01` rather than leaving it to be found.

### Close codes

| Code | Means |
|---|---|
| `4401` | no token, or expired/forged |
| `4403` | authenticated, but not in this conversation |
| `4404` | no such conversation — or a path that is not one of the three routes |

The handshake is accepted before closing, on purpose: a rejected handshake reaches the browser as a
generic `1006` and tells the caller nothing.

## Messages you receive

```json
{"type": "subscribed", "conversation": {"kind": "dm", "id": 2}}
{"type": "message.created", "message": { … MessageSerializer … }}
{"type": "message.updated", "message": { … MessageSerializer … }}
{"type": "message.deleted", "id": 41}

{"type": "subscribed", "notifications": true}
{"type": "notification.created", "notification": { … NotificationSerializer … }}
{"type": "presence.snapshot",  "online": [1, 2]}
{"type": "presence.changed",   "user_id": 2, "online": false}
{"type": "profile.updated",    "user_id": 2, "profile": { … PublicProfileSerializer … }}

{"type": "structure.changed", "scope": "channel", "action": "updated", "id": 3,
                              "object": { … ChannelSerializer … }}
{"type": "structure.changed", "scope": "topic",   "action": "deleted", "id": 7, "channel_id": 3}
{"type": "structure.changed", "scope": "group",   "action": "member_added", "id": 5, "user_id": 9}
```

Each payload is the REST endpoint's own output — identical to `GET /api/messages/` and
`GET /api/notifications/` respectively. A client reconciling two shapes for the same object ends up
with two renderers, which is the mistake `F-00` spent three points undoing on the frontend.
`message.updated` therefore carries the whole message and not a diff.

`message.deleted` is the one frame that is not a serialized object, and it cannot be: the row is
gone by the time the gateway can say so. An id is also all a client needs, because the only correct
reaction to a deletion is to drop what it is already holding.

**A `type` with no matching method on the consumer kills the socket.** Channels resolves a
channel-layer `type` of `"message.updated"` to a method named `message_updated`, and raises if there
is none. Adding a frame means adding both halves.

Both sockets are **delivery only**. Sending anything up either one answers with an error naming the
REST endpoint that does the write.

## Presence

The notification socket carries presence as well, and it is there rather than on a route of its own
for one reason: it is the only connection the SPA holds open on **every** screen. A conversation
socket comes and goes with the route, so "connected" would have meant "currently reading a
conversation".

`presence.py` is the store. It is deliberately **not** a database column: a `last_seen` timestamp
would be a migration and an `ERD.tex` amendment, and it would still answer wrong — a process that
dies leaves the column saying *online* for ever. Redis holds one set of channel names per user, so a
restart starts from nobody (`config/asgi.py` calls `reset()`; it is **not** in
`RealtimeConfig.ready()`, because `celery_worker` and `celery_beat` run that too and either
restarting would wipe live users).

Two properties are load-bearing and both were bugs before they were properties:

* **Transitions are reference-counted**, so somebody with three tabs who closes one stays online.
  `mark_online` and `mark_offline` answer *whether the user crossed the boundary*, and the consumer
  broadcasts only on the crossing.
* **Each transition is one Lua script.** A page load closes the old socket and opens the new one at
  the same instant, so the two calls genuinely interleave; written as separate commands they left the
  connection set and the online set disagreeing, which shows up as a user with no sockets still
  listed as online — permanently. Redis runs a script atomically.

A client is never told about its own transition (`presence_changed` drops it): the
`presence.snapshot` it received on connect already said so, and sending it anyway raced that
snapshot, since one is a direct send and the other travels through the channel layer.

**The client has to close its socket on `pagehide`**, and `frontend/src/lib/socket.js` does. React
does not run effect cleanups when the document is destroyed, so before that every full page load left
a connection open on the server — four page loads in one tab measured as four connections, all of
them until the browser exited. Logging out then closed only the socket the current page had opened
while the earlier ones kept the user marked online.

## Profile changes

`profile.updated` goes to `broadcast_group()` — everybody — because a username and an avatar are
rendered on every screen that has ever mentioned that person, and working out which of those a given
client has open is the client's business. The payload arrives already serialized for the same reason
`notification.created` does, with a different motive: it reaches every connected socket, so which
fields of a profile are public is `accounts`' decision and not the gateway's.

## Structural changes

`structure.changed` is one frame for eight events, and that is the whole of its design.

**What it says.** `scope` is `channel`, `group` or `topic`; `action` is `created`, `updated`,
`deleted`, `member_added` or `member_removed`; `id` names the thing. A topic frame also carries
`channel_id`, because a client holding one channel has to decide whether a topic is one of its own
without a second read. `updated` and `created` carry `object`, already serialized, for the reason
`notification.created` does. `deleted` carries none — the row is gone, exactly as with
`message.deleted`. The membership actions carry `user_id` and no object: who joined or left is the
whole of the news, and what they can now see is the client's own re-read to make.

**Why one frame and not eight.** A `type` with no matching consumer method kills the socket (above),
so every wire type is a method that has to exist. Eight types would be eight chances to forget one,
against a `scope`/`action` pair a client switches on anyway. The *seam* still names all eight
events separately — `common/events.py` is a domain contract and `groups_app` publishing
`GROUP_DELETED` should not have to know that the gateway flattens it.

**Why the audience travels in the payload.** Every one of these events carries
`audience`, a list of user ids, computed by the publishing module. `realtime` never asks who the
members are:

* it *cannot*, on the delete paths — memberships are CASCADE, so by the time a subscriber runs there
  is nobody left to ask. The audience is read immediately **before** `.delete()`, next to where the
  view already counts the cascade for its report.
* it *should not*, on the rest — who may see a channel is `roles`' decision, and a gateway that
  queried memberships would be deciding it a second time, in a second place, against
  `architecture.tex` §5.1.

`MEMBER_ADDED` is the one event whose audience is read *after* the write, because the new member has
to be in it.

**Why `user_group` and not a group per channel.** `_fan_out_structure` loops and sends one
`group_send` per member. The alternative — a channel-layer group per channel that every notification
socket joins — needs joins and leaves kept in step with membership changes, and the delete path is
the worst possible place to be maintaining that bookkeeping. Audiences here are one channel's or one
group's members, so the loop is cheap and it cannot drift.

**What it is for.** Before this, `profileVersion` was the SPA's only cross-client invalidation
signal, and it ticks for *user* profiles only — so every hook holding a channel, group or topic list
re-read on mount and never again. Leaving the screen and coming back was the fix. Now the client
counts `structure.changed` frames and re-reads the lists on any of them; `useChannel` and `useGroup`
are choosier, matching on `scope`/`id`, and expose `gone` when the thing they are showing was
deleted under them.

## How a message gets here

`messaging` publishes `common.events.MESSAGE_CREATED` and does not know who is listening.
`notifications` subscribed to it in `N-02`; `publisher.py` subscribes to the same event in
`RealtimeConfig.ready()`. **Neither imports the other, and no domain module imports `realtime`** —
`tests/test_decoupling.py` parses the ASTs and fails if one ever does.

That indirection is `architecture.tex` §5.1, and it is what made this card possible after the code
freeze without touching `messaging` at all.

## How a notification gets here

`RT-03`, and the same seam with one difference worth knowing before you change it.

`notifications.services` — the only place a `Notification` row is written — publishes
`NOTIFICATION_CREATED` after every write, carrying `user_id` and an **already-serialized**
`payload`. Every other event on the seam hands over the model and lets the subscriber render it;
`on_message_created` imports `MessageSerializer` to do exactly that. This one cannot, because
`realtime` importing `notifications` is the thing `tests/test_decoupling.py` forbids in both
directions. So the owning module serializes and the gateway forwards bytes whose shape it never has
to know.

The fan-out is addressed to `user_group(user_id)` — every socket that one person has open, and
nobody else's. "A recipient receives only their own" is therefore a property of *where the message
was sent*, not a check on arrival: there is no filter in `NotificationConsumer` to get wrong.

A recipient with no socket open loses nothing. The row is committed before anyone is told, and
`GET /api/notifications/` is still the product; the push is a convenience over it.

A handler that raises is logged and skipped by `events.publish`, so a Redis outage degrades to *no
live delivery* rather than *messages cannot be sent*. The socket is a convenience over a REST write
that has already succeeded and been persisted by the time the handler runs.

## Membership

Every "may they" question goes to `roles.services` — `is_group_member`, `is_channel_member`. This
module compares no owner ids of its own, and a test asserts that against the parsed tree.

A direct message needs no membership: anyone may open a conversation with anyone, which is what
makes US-2.1 work for a brand-new account. The only check is that the other person exists, so a typo
in the URL is `4404` rather than a socket subscribed to nothing.

## Group names

`groups.py` is the single definition. The consumer subscribes and the publisher sends, and if those
two ever disagree the message goes nowhere and nothing errors — which is why the convention is one
importable module and not a formatted string in each.

A DM is the case that needs care: the participants connect from opposite ends, so the pair is sorted
(`dm.<low>.<high>`) to make the name symmetric.

`user_group(user_id)` is `user.<id>` — per person rather than per socket, so every tab someone has
open updates from one `group_send`.

## The channel layer

`RT-01`. Redis when `REDIS_URL` is set, in-process when it is not — see `config/settings.py`.
`InMemoryChannelLayer` only fans out inside one process, so it looks like it works until there is a
second worker and then it fails for whichever half of the users landed elsewhere.

Two traps, both hit while building this:

- **Redis outlives the process, so tests must not share channel names.** A fixed name leaves a
  message behind for the next run to read as its own. Every name in `tests/` is unique per test.
- **nginx resolves the backend's address once, at startup.** `docker compose up -d --build backend`
  gives the container a new IP and every request through nginx then answers **502** until
  `docker compose up -d --force-recreate nginx`. Nothing to do with this module, everything to do
  with believing a walk failed when the product was fine.

## The client

`F-07` was cut at the Aug 11 bonus gate and revived; the SPA now calls this gateway.
`frontend/src/lib/socket.js` is the whole of it, and it is the only file in the SPA that knows a
WebSocket exists — `hooks/useConversation.js` calls `openConversationSocket({kind, id, onMessage,
onStatus})` and stays a hook about messages.

What it does with what this module documents above:

- **The URL** comes from `window.location` — `wss:` under https, because a `ws://` socket opened
  from an https page is blocked as mixed content and presents as a connection that fails instantly
  and forever. `VITE_WS_BASE_URL` overrides it for a split-origin dev setup; the container stack and
  `npm run dev` both proxy `/ws/` on the one origin, so it is normally blank.
- **The token** goes in the query string, because a browser's `WebSocket` constructor cannot set a
  header — the trade this module's `middleware.py` explains.
- **`subscribed` is the signal**, not `onopen`. The handshake completing only means the consumer
  called `accept()`, which it also does before closing with a refusal code; the frame means the
  group join is real.
- **The close codes are acted on, separately.** `4403` and `4404` are final answers — the client
  stops and reports rather than reconnecting into a refusal forever. `4401` earns exactly one
  refresh through `auth/refresh/` and one reconnect, since an expired access token is what a tab
  left open always produces; a second `4401` stops, because looping would be a refresh storm. A
  clean `1000` never reconnects. Everything else — `1006` from a dropped connection, `1012` from a
  restart — retries with exponential backoff and jitter capped at thirty seconds. The jitter matters
  here: every open conversation in every tab loses its socket at the same instant when this backend
  restarts, and without it they all return at the same instant too.

The five-second poll in `useConversation.js` is **kept** as a fallback and backed off to thirty
seconds while a socket is connected. A handler that raises is logged and skipped by
`events.publish`, so a Redis outage degrades to "no live delivery"; the poll is what makes that
"messages arrive late" instead of "messages do not arrive". The chat header shows which of the two
is in effect, so `D-01` can demonstrate the difference rather than assert it.
