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

The three kinds mirror `messaging`'s three targets exactly, so a client that can name a conversation
for the REST API can name it here.

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
```

`message` is `MessageSerializer`'s output, identical to `GET /api/messages/`. A client reconciling
two shapes for the same object ends up with two renderers, which is the mistake `F-00` spent three
points undoing on the frontend.

## How a message gets here

`messaging` publishes `common.events.MESSAGE_CREATED` and does not know who is listening.
`notifications` subscribed to it in `N-02`; `publisher.py` subscribes to the same event in
`RealtimeConfig.ready()`. **Neither imports the other, and no domain module imports `realtime`** —
`tests/test_decoupling.py` parses the ASTs and fails if one ever does.

That indirection is `architecture.tex` §5.1, and it is what made this card possible after the code
freeze without touching `messaging` at all.

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

## Not done

**There is no client.** `F-07` — the SPA's WebSocket client — was cut at the Aug 11 bonus gate and
has not been revived, so the app still receives new messages by the five-second poll in
`hooks/useConversation.js`. The gateway is real, authenticated and tested; nothing in the browser
calls it yet. `D-01` must say exactly that rather than claiming live delivery.
