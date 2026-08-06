# Sprint Calendar — Aug 5 to Aug 12, 2026

> **This is the living document.** [`execution-plan.md`](execution-plan.md) explains *how* we work and does not change often. This file is *what happens on each day*, and it is **edited every night at the 22:00 sync**.
>
> **Editor:** the Scrum Master. **Everyone else:** tick your own cards as you finish them, and add a line to the day's reality log if something notable happened.
>
> Every card below carries a short description — the user story it serves, what already exists in the repository, and the trap to avoid. That is deliberately enough to start work from this file alone. The full acceptance criteria live on the card's GitHub issue.

---

## The 8 days at a glance

| Day | Date | | Sprint | Day of sprint | Headline |
|---|---|---|---|---|---|
| 1 | Aug 5 | Wed | **Sprint 1** | 1 of 4 | Sprint boundary opens · plan re-cut |
| 2 | Aug 6 | Thu | Sprint 1 | 2 of 4 | **Sprint 1 Planning 20:00** · unblock the runtime |
| 3 | Aug 7 | Fri | Sprint 1 | 3 of 4 | Containers, Postgres, module split · **Refinement 21:00** |
| 4 | Aug 8 | Sat | Sprint 1 | 4 of 4 | Roles engine · **Freeze 18:00 · Review 20:00 · Retro 20:45 · Reports 23:00** |
| 5 | Aug 9 | Sun | **Sprint 2** | 1 of 4 | **Sprint 2 Planning 20:00** · channels, groups, roles API |
| 6 | Aug 10 | Mon | Sprint 2 | 2 of 4 | Topics, media, search, the three chat surfaces |
| 7 | Aug 11 | Tue | Sprint 2 | 3 of 4 | **INT-2 permission matrix · BONUS GO/NO-GO 21:00** · report drafting |
| 8 | Aug 12 | Wed | Sprint 2 | 4 of 4 | **Freeze 18:00 · Final Review · Retro · Reports · Delivery** |

**Every single day:** async stand-up **13:00** · board and burndown sync **22:00**.

**Blockers are marked `◆`.** A blocker card names what it blocks. If a blocker is not going to land on its scheduled day, say so at the 13:00 stand-up, not at 22:00 — somebody else's day depends on it.

---

## How to edit this file

**At 22:00, the Scrum Master:**

1. Ticks the cards that reached **Done** (passed the full DoD in `execution-plan.md` Part 4). A card that is merely merged is not ticked.
2. Fills in the burndown line: `Planned` is fixed at Planning and never edited; `Done` is points that passed the DoD today; `Carried` is points scheduled for today that did not finish; `Remaining` is the sprint's committed points minus everything done so far.
3. Writes one or two honest lines in the **Reality log**. Blockers, surprises, things that took twice as long. This is the raw material for the Retrospective and for everyone's iteration report — an empty log on a bad day is a wasted day.

**Moving a card between days inside a sprint is fine** — that is just scheduling, and reality moves. **Adding scope to a running sprint is not.** New work goes to the Product Backlog for the next sprint.

**When a card carries past the sprint boundary:** leave it unticked in its original day, add a line to that day's log saying where it went, and put it back on the table at the next Planning **before** any new work is considered.

---

# SPRINT 1 — Aug 5 to Aug 8

> **Sprint Goal:** from a clean clone, one `docker compose up` brings the whole stack up on PostgreSQL; a user can register, log in, manage a profile and exchange direct messages in the running app; and the `Channel` and `Role` models exist behind the API.

**Committed: 56 points.**

**The critical path is `F-01` → `P-01` / `P-03` → `P-04` → `R-01` → `R-04`.** Every one of those is Arman's and every one of them gates somebody else. If that chain slips, Sprint 2 has no foundation to build on — it is the first thing to talk about at every stand-up this sprint.

---

## Day 1 — Wed, Aug 5 · Sprint 1, day 1 of 4

**13:00** async stand-up · **22:00** board sync

*Recorded retroactively.* The sprint boundary opens here, but the plan was re-cut on Aug 6, so no cards were scheduled against this day. What it records is the **starting increment** — what is already on `main` before this sprint does anything:

- A Django backend in a single `users` app: `Profile`, `Group`, `MediaFile` and `Message` models, JWT register/login/refresh, group CRUD with add/remove member, media upload with size and extension validation, a `seed_data` command, and a WebSocket `ChatConsumer` — all committed by **Majid** on Jul 28–29.
- A Vite/React SPA: the app shell and routing, wired `Login`, `Register`, `EditProfile` and `Chat` screens, and static mockups for the dashboard, DMs, groups, channels, search, notifications and settings — committed by **Ali** on Jul 27–28 and **Majid** on Jul 29.
- **None of it runs end to end.** `axios` is missing from `package.json`; three components import `'../api'`, which does not resolve; login is mounted at `/api/api/auth/login/` while the client calls `/api/auth/login/`; there are no CORS headers; and `Message` has no migration, so a fresh `migrate` never creates its table.
- Absent entirely: channels, topics, roles and permissions, search, notifications, message editing, PostgreSQL, Docker, nginx, CI, tests and `requirements.txt`.

`Planned 0 · Done 0 · Carried 0 · Remaining 56`

**Reality log:**
> The 12-day / three-sprint plan was replaced with this 8-day / two-sprint one on Aug 6. Sprint 1 formally starts today; Planning is held tomorrow.

---

## Day 2 — Thu, Aug 6 · Sprint 1, day 2 of 4

**13:00** async stand-up · **20:00–21:30 Sprint 1 Planning (synchronous, everyone)** · **22:00** board sync

Planning covers: the Sprint Goal, the whole Sprint 1 backlog from `execution-plan.md` Part 8, Planning Poker on every card, people pulling their cards, and the commitment. Also the first walkthrough of DoR and DoD — nobody should leave this meeting unsure what "Done" means. Four of the six of us have never estimated anything, so `G-03` runs inside this meeting rather than as a separate one.

**Everything scheduled today is a blocker or a prerequisite for tomorrow.**

**Cards scheduled today — 18 pts**

- [ ] `F-01` ◆ Move the SPA into `frontend/`, update Vite config and Docker paths — 1 · *Arman*
      *Blocks `P-01`.* The SPA sits at the repository root, which makes separate backend and frontend Dockerfiles impossible. Move it wholesale, fix the Vite root and the paths in `package.json`.
- [ ] `P-06` ◆ Runtime unblock: add `axios`, fix the broken `api` imports, remove the `/api/api/` double prefix, enable CORS — 2 · *Arman*
      *Blocks `A-05`, `F-02`, `F-03`, `U-04`, `U-06`, `U-07`, `U-08`.* Four defects stop the app running at all: `axios` missing from `package.json`; `AuthContext.jsx`/`Register.jsx`/`Chat.jsx` importing `'../api'` when the file is `src/services/api.js`; `core/urls.py` mounting `users.urls` under `api/` while `users/urls.py` already declares `api/auth/login/`; and no `django-cors-headers`. Nothing on the frontend can be wired until all four are fixed.
- [ ] `P-03` ◆ SQLite → PostgreSQL, settings from env, `requirements.txt`, generate the missing `Message` migration — 3 · *Arman*
      *Blocks `M-01`, `A-09`, `M-08`.* `settings.py` still uses SQLite, `SECRET_KEY` is the hardcoded insecure default and `DEBUG` is `True`. There is no `requirements.txt` at all. And `Message` has **no migration** — `makemigrations` was never run, so a fresh `migrate` never creates its table. Postgres is also what US-9.1 search needs; full-text search and GIN indexes do not exist on SQLite.
- [ ] `G-02` ◆ Projects v2 board: fields, 4-day Sprint iteration starting Aug 5, views, workflows, milestones — 2 · *Amirhossein*
      *Blocks every card on the board — until it exists there is nowhere to track work.* Brief Rule 10 makes the board mandatory and it is the evidence a grader actually looks at. Most of it is scripted in `scripts/gh/`; four things (Status ladder, Sprint iteration field, workflows, views) have no API and must be done in the browser. `scripts/gh/README.md` is the step-by-step.
- [ ] `G-01` Repository public; issue and PR templates committed — 1 · *Amirhossein*
      Brief Rule 9 — the TAs must be able to see it. The templates already exist on disk but have never been committed. **There is deliberately no branch protection**: `main` is open and anyone can merge. The PR and the teammate review stay in the DoD as a team agreement, not as a platform gate.
- [ ] `F-00` ◆ Shared message primitives — avatar, timestamp, bubble, composer — 3 · *Amir*
      *Blocks `F-02`, `F-05`, `U-09`.* Three chat surfaces are coming — DM, channel topic and group — and they are the same UI with a different fetch. Build the primitives once so the other three are wiring, not re-implementation. Note the existing wired components use Tailwind class names while Tailwind is not a dependency, so those classes currently render unstyled.
- [ ] `U-01` React application shell and routing, authenticated vs guest route groups — 2 · *Ali*
      The shell exists with `PrivateRoute` and `AuthProvider`, but `App.jsx` only defines `/login`, `/register`, `/profile` and `/chat/:groupId`. The dashboard, DMs, groups, channels, search, notifications and settings screens all `navigate()` to routes that do not exist, so the catch-all bounces them to `/profile`. Defining those routes is the work.
- [ ] `A-04` Registration endpoint and JWT login/refresh — 2 · *Majid*
      **US-1.1** register with a username and password; **US-1.2** log in with them. Already written with SimpleJWT. Two things to finish: the route resolves to `/api/api/auth/login/` (`P-06` fixes the mount), and `BLACKLIST_AFTER_ROTATION` is set while `token_blacklist` is not in `INSTALLED_APPS`, so rotation silently does not blacklist. `G-04` depends on that.
- [ ] `B-01` Order and partition the Product Backlog: confirm Must / Nice / Won't on every card — 1 · *Arvin*
      The backlog is seeded from `scripts/gh/backlog.tsv`, so this is not data entry — it is the PO taking ownership of the ordering. `methodology.md` §7.5: **Must** is the mandatory product (3 of the 4 marks), **Nice** is real-time and scheduled messages (the 4th), **Won't** is parked and visible.
- [ ] `G-03` Planning Poker calibration on three sample stories; DoR/DoD walkthrough — 1 · *Arvin*
      Run it inside tonight's Planning. The reference is **3 points ≈ one focused day of one person's work**; everything else is judged against it.

`Planned 18 · Done __ · Carried __ · Remaining __`

**Reality log:**
>

---

## Day 3 — Fri, Aug 7 · Sprint 1, day 3 of 4

**13:00** async stand-up · **21:00–21:45 Backlog Refinement** (PO + 2 devs) · **22:00** board sync

Refinement prepares the Sprint 2 stories — channels, topics, roles, groups, media, search, notifications — so Planning on Aug 9 does not stall on unclear wording. Bring each to Ready.

**This is the heaviest day of the sprint, and `P-01` and `P-04` are both on it.**

**Cards scheduled today — 26 pts**

- [ ] `P-01` ◆ Dockerfiles + `docker-compose.yml` (db, backend, frontend, nginx) + `.env.example` — 5 · *Arman*
      *Blocks `INT-1`, `INT-2`, `INT-3`.* None of this exists yet. This is the card a grader exercises first — the sprint-level DoD is a fresh clone brought up with a single command. Depends on `F-01` for the frontend path and pairs with `P-03` for the database service.
- [ ] `P-04` ◆ Split `backend/users/` into the nine modules of `architecture.tex` §5 — 5 · *Arman*
      *Blocks `A-02`, `A-03`, `A-04`, `A-06`, `A-07`, `A-08`, `C-01`, `M-01`, `N-01`, `R-01`.* Everything lives in one `users` app today. `architecture.tex` §5 states nine modules and brief Rule 12 grades that alignment, so one app containing every domain visibly contradicts our own design document. **Naming traps:** not `channels` (collides with Django Channels) and not `groups` (collides with `django.contrib.auth.Group`) — use `channels_app` and `groups_app`. Move without losing data: explicit `db_table` on each model plus `migrations.SeparateDatabaseAndState`, and inspect `migrate --plan` before running it.
- [ ] `P-02` ◆ nginx: serve the SPA, proxy `/api`, pass `/ws` upgrade headers — 2 · *Amirhossein*
      *Blocks `A-08`, `F-07`, `RT-02`.* `architecture.tex` puts nginx in front of both halves — one origin, so no CORS in production and one URL for a grader. Get the `/ws` upgrade headers right now even though real-time is a bonus; retro-fitting them is where this usually goes wrong.
- [ ] `C-01` ◆ `Channel` and `ChannelMember` models and migration — 2 · *Amirhossein*
      *Blocks `C-02`, `C-03`, `C-04`, `R-03`, `F-04`, `F-05`, `A-10`.* **US-4.1** "As a user, I want to be able to create a new channel and become its admin, so that I have a space for discussion, message sharing and file sharing with multiple users." Nothing channel-shaped exists in the codebase at all. `ChannelMember` joins user → channel and carries the role FK. Match the entities in `ERD.tex`.
- [ ] `M-01` ◆ `Message` model and migration — 2 · *Majid*
      *Blocks `M-02`, `M-06`, `M-07`, `M-08`, `F-02`, `F-03`, `SC-02`.* **US-2.1** "…send and receive messages with other users…". The model is written and the dual-target rule (recipient XOR group) is already enforced in `MessageSerializer.validate` — but there is no migration, so a fresh clone never gets the table. Add the channel/topic target now rather than later; `C-03` and US-2.3 need it.
- [ ] `A-02` `Profile` model, migration, serializer, own-profile endpoint — 2 · *Majid*
      **US-10.1** "As a user, I want to have a user profile and be able to edit it, so that I can keep my personal information up to date in the system." Already written as `Profile` + `ProfileDetailView`. This card moves it into `accounts/` behind `P-04` and brings it to the full DoD — reviewed, merged through a PR, tested against its criteria.
- [ ] `F-02` Chat view: message list with author and timestamp, plus the composer — 3 · *Amir*
      **US-2.1** in the UI. `Chat.jsx` exists and opens a WebSocket, but it imports `'../../api'` (unresolvable) and `AuthContext` never fetches the user, so it sends `user_id: undefined` — which makes the consumer skip persisting the message while still broadcasting it. Rebuild on the `F-00` primitives and read history over REST; the socket is a Sprint 2 bonus, not this card.
- [ ] `U-02` Dashboard screen: navigation between DMs, groups and channels — 1 · *Ali*
      Exists as a static mockup with local `useState` and no API calls. Wire the navigation to the real routes from `U-01` and show the real user from `AuthContext`.
- [ ] `U-03` Direct-messages screen: conversation list layout — 2 · *Ali*
      Exists as a static English mockup with the mock data already stripped out. This card is the layout and selection behaviour; Amir wires it to the API in `F-03` next sprint, so keep the data source in one place so he only has to swap it.
- [ ] `M-03` Public profile endpoint — view another user's profile — 1 · *Arvin*
      **US-10.2** "As a user, I want to be able to view other users' profiles, so that I can better identify my contacts in the system." There is no user lookup of any kind today — `ProfileDetailView` is self-only. Use a **separate serializer** rather than excluding fields from the existing one; excluding is how private fields leak back in later.
- [ ] `B-02` Batch the team's open questions to the TA stakeholder — 1 · *Arvin*
      Arvin is the only channel to the TA, so the stakeholder gets one consistent set of questions instead of six. Known open items: the exact delivery zip filename and our group number, and whether channel membership needs an invite flow at all given SH.1 chose direct adding.

`Planned 26 · Done __ · Carried __ · Remaining __`

**Reality log:**
> Anything from Day 2 that slipped is picked up here — note it explicitly rather than silently re-dating it. The sprint boundary does not move.

---

## Day 4 — Sat, Aug 8 · Sprint 1, day 4 of 4 · **SPRINT END**

**13:00** stand-up · **18:00 CODE FREEZE** · **20:00–20:45 Review** · **20:45–21:30 Retro** · **22:00** Arvin posts the numbers · **23:00 everyone's report to the TA**

**Cards scheduled today — 12 pts**

- [ ] `R-01` ◆ `Role` model with the eight permission booleans, plus migration — 3 · *Arman*
      *Blocks `R-02`, `R-03`, `R-04`, `R-05`, `C-02`, `C-03`, `C-04`, `F-06`, `A-10`.* **US-8.1** "As a channel super-admin, I want to be able to define different roles with different names for users, so that I can structure the management of the channel." The eight permissions, fixed by `user_stories_en.tex` §Assumptions: `can_send_media`, `can_delete_message`, `can_create_topic`, `can_edit_channel`, `can_remove_member`, `can_add_member`, `can_change_role`, `can_delete_channel`. A role is a **database row**, not a code constant.
- [ ] `R-04` ◆ Permission evaluation service `has_permission(user, channel, permission)` — 3 · *Arman*
      *Blocks `C-02`, `C-03`, `C-04`, `R-05`, `A-10`, `F-06`.* **US-8.3.** The single most important line in `architecture.tex` is §5.1: **no module decides permissions for itself.** Messaging, Channels, Groups and Media all call in here. It is what makes brief §5.8 — access levels manageable without editing code — literally true. If you find yourself writing `if user.id == channel.owner_id` outside this module, stop and call in here instead. The channel owner implicitly holds all eight.
- [ ] `M-02` Message list/create/detail API, scoped to the caller's conversations — 2 · *Majid*
      **US-2.5** "…receive and view messages sent by others (in direct messages, groups or channels)…". `MessageListCreateView` and `MessageDetailView` exist and filter on `?user_id=` / `?group_id=`. Two gaps: with neither parameter the view returns everything the user can see instead of 403-ing on an out-of-scope request, and pagination is not configured.
- [ ] `A-03` Privacy-settings endpoint toggling `allow_invites` — 1 · *Majid*
      **US-5.4** "As a user, I want to control who can add me to a group (or channel), so that no one can add me to a group without my permission." **SH.2** is the same requirement from the stakeholder conversation. `PrivacySettingsView` exists — but note `GroupAddRemoveMemberView` never actually checks the flag. Honouring it is `M-05` and `C-04`; this card is what those read.
- [ ] `G-04` Logout that actually invalidates: blacklist the refresh token server-side — 2 · *Arvin*
      **US-1.3** "As a logged-in user, I want to be able to log out of my account, so that the security of my information is maintained." There is no logout endpoint at all — the client just drops the token from `localStorage`, which is not logging out. `settings.py` already sets `BLACKLIST_AFTER_ROTATION` but `rest_framework_simplejwt.token_blacklist` is not in `INSTALLED_APPS`; add it and run its migration.
- [ ] `INT-1` Clean-clone verification of the Sprint Goal, before the freeze — 1 · *Arman*

**`INT-1` script** — run before 18:00:
1. Clone into an empty directory.
2. `cp .env.example .env` and `docker compose up`.
3. Run the seed command.
4. Register, log in, edit the profile, view another user's profile, send direct messages both ways, refresh, log out.
5. Walk every merged story against its own acceptance criteria.

Anything that cannot be reproduced goes back to **In Progress**, carries to Sprint 2 and scores zero — however finished it feels on someone's laptop.

**Review demo script** — run from `main`, in this order:
1. Fresh clone, `docker compose up`, seed.
2. Register a new account. Log in.
3. Edit the profile. View a second user's profile.
4. Send direct messages both directions. Refresh the page — history is intact.
5. Log out; confirm the old token no longer works.

**Retro:** Continue / Stop / Start → agree **one or two** concrete actions and write them below.

`Planned 12 · Done __ · Carried __ · Remaining __`

**Sprint 1 close-out**

- Committed: **56** · Done: `__` · Carried: `__` · **Velocity V₁ = `__`** · Reliability = `__`
- Stories rejected at Review: `__`
- Did the critical path (`F-01` → `P-01`/`P-03` → `P-04` → `R-01` → `R-04`) complete? `__` — if not, this is the first item at Sprint 2 Planning.
- Retro actions for Sprint 2: `__`

**Reality log:**
>

---

# SPRINT 2 — Aug 9 to Aug 12

> **Sprint Goal:** channels, topics, groups, media, search and notifications are complete and every privileged action is decided by the `roles` module; the bonus lands only if the core is green; and the product is stabilised, reported and delivered.

**Committed: `__` points** (set at Planning from V₁). **Scheduled below: 71 `Must` points, plus 21 `Nice` points behind the Aug 11 gate.**

> **The overhang is real and named.** 71 mandatory points across four days is above what a six-person team plausibly finishes. This is what being behind looks like; the honest response is to say so at Planning and pick the cut order in advance rather than discovering it on Aug 12. **Cut order if we fall behind:** (1) every `Nice` card, immediately and without discussion; (2) `U-13` polish; (3) `M-09` search UI — the API alone demonstrates US-9.1; (4) `A-10` media restriction — US-7.3 is one story; (5) `U-11` notifications centre — `N-02` demonstrates US-11.1 over the API. **Never cut:** `INT-3`, `D-01`, or anything in the roles chain.

---

## Day 5 — Sun, Aug 9 · Sprint 2, day 1 of 4

**13:00** stand-up · **20:00–21:30 Sprint 2 Planning** · **22:00** board sync

Planning starts with the carried-over cards from Sprint 1, before anything new is pulled.

**Cards scheduled today — 20 pts**

- [ ] `R-02` Role CRUD API: create, rename, delete named roles; set their permissions — 3 · *Arman*
      **US-4.2** lets a channel admin assign differently named roles with varying permissions. **US-8.2** "…assign various capabilities **that fall within my own permissions** to user roles…" — note the constraint; it is a real check to implement, not decoration. Deleting a role must not orphan its members.
- [ ] `M-04` `GroupMember` join entity per the ERD, replacing the bare many-to-many — 1 · *Arman*
      `ERD.tex` models group membership as its own entity; the code uses a plain `ManyToManyField`. Brief Rule 12 grades alignment between product and Phase 1 design, and this is one of the two places a grader can spot a gap in thirty seconds. Do it before `M-05` builds on top.
- [ ] `C-02` Channel API: create (creator becomes admin), edit name/description/image, delete — each permission-gated — 3 · *Amirhossein*
      **US-4.1**, **US-4.7** change channel information, **US-4.10** delete the channel, **US-6.1**/**US-6.2** the same two from the editing-and-deleting section. The creator ends up holding all eight permissions. Every gate is a call into `roles.services`, **not** an inline owner check.
- [ ] `M-06` Edit own message with an `is_edited` flag; only the author may edit — 2 · *Arvin*
      **US-3.1** edit your own message to fix a typo; **US-3.2** "…I want *only and exclusively myself* to be able to edit my own sent message, so that no one can distort my message" — so unlike deletion this is **not** an admin capability. `MessageDetailView` is a `RetrieveDestroyAPIView` today: no PUT, no PATCH, no `edited` field on the model. Both need adding; the original timestamp is preserved.
- [ ] `N-01` ◆ `Notification` model and migration — 1 · *Arvin*
      *Blocks `N-02`, `U-11`.* **US-11.1** names exactly three trigger events: a new message, being added to a group or channel, and a role change. Model the kind as an enum over those three rather than free text.
- [ ] `A-06` `Group` model, serializer, create/list/detail API; creator becomes admin — 2 · *Majid*
      **US-5.1** "As a user, I want to be able to create a group, so that I can communicate with people without dealing with the complexity of channels." Already written as `Group` + `GroupListCreateView` + `GroupDetailView`. This card moves it into `groups_app` behind `P-04` and brings it to the DoD. Listing returns only the caller's groups; a non-member cannot read a group's detail.
- [ ] `A-05` React auth context, Login and Register screens, API client with token interceptor — 2 · *Majid*
      **US-1.1**, **US-1.2** in the UI. Already written, but `AuthContext.login` never fetches the user, so `user` is `{isAuthenticated, username}` with **no id** — which is why `Chat.jsx` sends `user_id: undefined` and the consumer silently skips persisting the message. Fetching the user after login is the real work.
- [ ] `F-03` Wire `DirectMessages.jsx` to the message API — real conversations, no mock data — 3 · *Amir*
      **US-2.1**, **US-2.5** in the UI. Builds on Ali's `U-03` layout and the `F-00` primitives, reading `M-02`. Two accounts in two browsers exchange messages; a refresh shows full history; an expired token refreshes and retries rather than silently failing. **If anything slips this sprint, protect this card** — it is what the Review demo hinges on.
- [ ] `U-04` Account and privacy settings screens wired to the endpoints — 2 · *Ali*
      **US-10.1** edit your profile; **US-5.4** control who can add you to a group or channel. All three screens (`MyAccount`, `PrivacySettings`, `GroupInvitationPreferences`) exist as static mockups. Wire them to `A-02` and `A-03`; show API validation errors rather than swallowing them.
- [ ] `U-06` View-profile screen for another user — 1 · *Ali*
      **US-10.2.** `ViewProfile.jsx` is a static mockup; `EditProfile.jsx` is already wired correctly and is the one component importing `services/api.js` properly. Reads `M-03`. Your own profile shows the edit affordance; someone else's does not.

`Planned 20 · Done __ · Carried __ · Remaining __`

**Reality log:**
>

---

## Day 6 — Mon, Aug 10 · Sprint 2, day 2 of 4

**13:00** stand-up · **22:00** board sync

**Cards scheduled today — 25 pts**

- [ ] `R-03` Assign or change a member's role; a member can read their own roles — 2 · *Arman*
      **US-4.9** change users' roles; **US-8.3** "As a user, I want to be able to receive the roles assigned to me in a channel, so that I can act according to the defined permissions." Changing a role needs `can_change_role` and takes effect on the **next request** with no restart. `F-06` reads this endpoint to decide which controls to show.
- [ ] `F-06` Role management UI: create a role, toggle its eight permissions, assign it — 3 · *Arman*
      **US-4.2**, **US-4.9.** *(Moved off Amir to keep his sprint on the chat surfaces.)* This is the screen that demonstrates US-4.2 and US-8.1–8.3 at the Review. Controls the user lacks permission for are hidden **and** the server still rejects the request if called directly — hiding alone fails the DoD, and `INT-2`'s permission matrix deliberately bypasses this UI to prove it.
- [ ] `C-03` `Topic` model and API; creating a topic needs `can_create_topic`; channel messages scoped to a topic — 2 · *Amirhossein*
      **US-4.5** create topics so discussion is categorised; **US-2.3** "As a member of a channel, I want to be able to send and receive messages in the channel's topics." `user_stories_en.tex` is explicit that a channel is a collection of topics and **all** members can exchange messages in them — the per-topic restriction is only on media (US-2.4).
- [ ] `C-04` Add and remove channel members, honouring `allow_invites` — 2 · *Amirhossein*
      **US-4.3** remove a member, **US-4.4** add a member, both with the appropriate permission. **SH.1** records the team's decision to add users directly rather than via an invite link; **SH.2** is the user's right to refuse that — the `allow_invites` flag from `A-03`. Both halves have to be real: direct adding, **and** a flag that actually stops it. Adding a user whose flag is off returns 403 and the user is not added.
- [ ] `M-07` Delete own message in any of the three contexts — 1 · *Arvin*
      **US-3.3** "…delete my own sent message in a direct message, group or channel, so that an unnecessary or erroneous message is removed from the chat history." The sender-scoped delete already exists; the work is extending it to the channel context and making sure it composes with `R-05` rather than duplicating its checks.
- [ ] `M-08` Message search over PostgreSQL full-text with a GIN index, scoped to the caller — 3 · *Arvin*
      **US-9.1** "As a user, I want to be able to search through message texts in any chat (direct message, group or channel), so that I can quickly find the messages or information I am looking for." Nothing search-shaped exists. **Blocked on `P-03`** — `SearchVector`, `SearchQuery` and `GinIndex` are Postgres-only and do nothing on SQLite. `architecture.tex` deliberately chose Postgres full-text over a separate engine, so no Elasticsearch. **Verify scoping by searching a term that exists only in a stranger's chat and confirming zero results.**
- [ ] `A-07` `MediaFile` model and upload endpoint with size and MIME validation — 2 · *Majid*
      **US-7.1** send images, video, audio or files in any direct or group message; **US-2.4** attach them to a text message. Already written, with two defects: `MediaFileSerializer` is defined **twice** in `serializers.py` (the second wins), and `MediaUploadView.perform_create` overwrites `file_type` with the HTTP content type, defeating the model's own categorisation into image/video/audio/document.
- [ ] `A-08` Media detail and serving endpoint, access-scoped to the conversation — 2 · *Majid*
      **US-7.1**, **US-7.2.** The trap is serving media as plain static files, which makes every upload world-readable to anyone who can guess a path — the access check has to be **in front of** the file. A direct URL guess must not bypass it. Depends on `P-02` for the nginx location.
- [ ] `F-04` Channels dashboard wired to the channel API: list, create, open — 2 · *Amir*
      **US-4.1** in the UI. `ChannelsDashboard.jsx` exists as a static mockup with an empty `useState`. Creating a channel makes you its admin; the list shows only channels you belong to. Depends on `C-02`.
- [ ] `F-05` Topic tabs and the channel message view, reusing the chat component — 3 · *Amir*
      **US-2.3**, **US-4.5.** Depends on `C-03` and `F-00` — the point of the primitives is that this is wiring, not a third chat implementation. The create-topic control is hidden without `can_create_topic` **and** the API refuses it anyway.
- [ ] `U-07` Groups dashboard wired to the group API — 2 · *Ali*
      **US-5.1** in the UI. `GroupsDashboard.jsx` exists as a static mockup with local `useState`. Reads `A-06`. The list shows only groups you belong to; handle the empty state.
- [ ] `U-08` Create-group modal wired to the create endpoint — 1 · *Ali*
      Already built as a mockup. Reads `A-06`. Creating a group makes you its admin and it appears in the list without a reload; an invalid name shows the API's own error.

`Planned 25 · Done __ · Carried __ · Remaining __`

**Reality log:**
>

---

## Day 7 — Tue, Aug 11 · Sprint 2, day 3 of 4

**13:00** stand-up · **21:00 BONUS GO/NO-GO** · **22:00** board sync

### The gate

One question, answered honestly: **is the mandatory product green?**

- [ ] Every `Must` card is Done and accepted
- [ ] A clean clone reproduces the whole mandatory product (`INT-2` passed today)
- [ ] No known defect breaks a core flow

**All three ticked → continue the bonus cards.**
**Any one missing → every remaining `Nice` card drops to `Won't` and the whole team moves to stabilisation for Aug 11–12.**

The mandatory work is worth 3 marks and the bonus 1. This is not a close call, and it is not a discussion about how nearly finished the bonus is.

**Decision:** `__` **Decided at:** `__` **Cut cards:** `__`

**Cards scheduled today — 20 Must pts + 18 Nice pts**

- [ ] `R-05` Message deletion by channel admin, group admin, or holder of `can_delete_message` — 2 · *Arman*
      **US-3.4** channel admin deletes any message; **US-3.5** group admin deletes any message; **US-3.6** a channel member with the delete-others permission does too. `user_stories_en.tex` §Assumptions is explicit: in a group only the sender and the group admin; in a channel only the sender, the channel admin, or a permission holder. Route every one of those through `roles.services` — do not re-implement the check in the messaging view. The author can always delete their own.
- [ ] `INT-2` Clean-clone verification **plus the permission matrix** — 2 · *Arman*
- [ ] `N-02` Notifications generated on new message, group/channel add and role change; list and mark-read API — 3 · *Arvin*
      **US-11.1** "…receive notifications when events occur — such as receiving a new message, being added to a group or channel, or having my role in a channel changed — so that I am kept informed of relevant activity without having to check manually." The notification must be created by an **event emitted from the owning module**, not by the messaging view calling notifications directly — that indirection is `architecture.tex` §5.1 and it is what lets the real-time bonus hook the same events without touching messaging.
- [ ] `M-09` Wire the search screen to the search API — 1 · *Arvin*
      **US-9.1** in the UI. `SearchMessages.jsx` exists as a static mockup with a hardcoded array. Replace the array with the `M-08` endpoint; clicking a result opens that conversation at that message.
- [ ] `D-01` Phase 2 report: requirement fulfilment, architecture alignment, deviations, ERD alignment, process summary — 5 · *Arvin*
      Half the Phase 2 mark. One table row per user story — the ID, the story, where it is implemented (module and endpoint), how it was verified. Include the stories we cut, **marked honestly**: Rule 12 explicitly permits revising a design when issues arise, but a report claiming alignment a grader can disprove in five minutes is far worse than one that says what actually happened. Arman writes the architecture sections. **Start today, not on Aug 12.**
- [ ] `A-09` Seed command: users, conversations, groups, channels, roles, sample media — 1 · *Majid*
      `seed_data` exists and makes three users and one group. Extend it so the Review demo and `INT-2`'s permission matrix have something to run against. Every clean-clone verification card depends on this working.
- [ ] `A-10` Per-channel media restriction, evaluated by the roles module — 2 · *Majid*
      **US-7.3** "As a channel admin, I want to be able to restrict the ability to send media in my channel, so that I have greater control over the channel's content." **US-4.8** is the member-side half. The check **must** call `roles.services.has_permission` — if `media_app` decides this for itself, `architecture.tex` §5.1 is broken and the report cannot honestly claim alignment. Refused by the API, not by a hidden button; the channel admin is never refused.
- [ ] `U-09` Group chat view — 2 · *Amir*
      **US-2.2** "As a member of a group, I want to be able to send and receive messages in the group, so that I can have continuous communication." The third instance of the same chat surface — renders through the `F-00` primitives.
- [ ] `U-11` Notifications centre wired to the API, with an unread count — 2 · *Ali*
      **US-11.1** in the UI. `NotificationsCenter.jsx` exists as a static mockup with an empty array. All three event kinds appear; the unread badge matches the API; opening one marks it read and navigates to its subject. Reads `N-02`.

**Behind the gate — `Nice` only:**

- [ ] `RT-01` Redis channel layer replacing the in-memory one; Redis in compose — 2 · *Arman* · **bonus**
      The consumer uses `InMemoryChannelLayer`, so fan-out only works inside one process.
- [ ] `RT-02` Real-time gateway for DMs, groups and topics; authenticated sockets; push on message-created — 5 · *Arman* · **bonus**
      **US-B1.1.** The existing `ChatConsumer` is group-only and takes `user_id`/`username` from the **client JSON payload** rather than `self.scope['user']` — so the sender is client-asserted and anyone can impersonate anyone. Fixing that is the acceptance criterion, not a nicety.
- [ ] `SC-01` Celery, Beat and RabbitMQ in compose; worker starts clean — 2 · *Amirhossein* · **bonus**
      Time-box it. If the worker is not running within a few hours, say so at stand-up and drop the whole scheduling bonus rather than letting it eat mandatory work.
- [ ] `SC-02` `scheduled_at` on the message model; schedule, list and cancel endpoints — 3 · *Amirhossein* · **bonus**
      **US-B2.1.** The filtering matters as much as the scheduling — a scheduled message that shows up early in the recipient's list is a failed story.
- [ ] `F-07` WebSocket client with reconnect; live rendering in all three contexts — 3 · *Amir* · **bonus**
      **US-B1.1.** One reusable client with reconnect and de-duplication, reading `RT-02`.
- [ ] `U-12` Scheduled-message composer: pick date and time, list pending, cancel — 3 · *Ali* · **bonus**
      **US-B2.1.** A time in the past is refused in the UI **and** by the API. Reads `SC-02`.

**The permission matrix** — `INT-2` runs sixteen checks **against the API directly, bypassing the UI**. For each of the eight permissions: one call that should succeed, one that should be refused. This is the single most likely thing for a grader to probe, because brief §5.8 asks for access levels changeable without editing code and this is the only evidence that it is true.

| Permission | Allowed case | Denied case |
|---|---|---|
| `can_send_media` | [ ] | [ ] |
| `can_delete_message` | [ ] | [ ] |
| `can_create_topic` | [ ] | [ ] |
| `can_edit_channel` | [ ] | [ ] |
| `can_remove_member` | [ ] | [ ] |
| `can_add_member` | [ ] | [ ] |
| `can_change_role` | [ ] | [ ] |
| `can_delete_channel` | [ ] | [ ] |

`Planned 20 Must + 18 Nice · Done __ · Carried __ · Remaining __`

**Reality log:**
>

---

## Day 8 — Wed, Aug 12 · Sprint 2, day 4 of 4 · **PROJECT END**

**13:00** stand-up · **18:00 CODE FREEZE** · **20:00–20:45 Final Review** · **20:45–21:30 Final Retro** · **22:00** numbers posted · **23:00 reports** · **delivery**

**Cards scheduled today — 6 Must pts + 3 Nice pts**

- [ ] `M-05` Group edit and delete, add/remove members honouring `allow_invites` — 2 · *Majid*
      **US-5.2** group admin adds and removes members; **US-6.3** delete the group; **US-6.4** edit its information. **SH.1**/**SH.2** for direct adding and the right to refuse it. `user_stories_en.tex` is explicit that the only difference between a group admin and a member is adding, removing and deleting others' messages — so do **not** invent a role system for groups; that is what channels are for. `GroupAddRemoveMemberView` exists but never checks `allow_invites`, which is the actual gap.
- [ ] `U-13` Responsive and empty-state pass across the screens, plus a frontend defect sweep — 2 · *Ali*
      No screen breaks below 400px; every list has an empty state; every screen in the demo script is walked once against its acceptance criteria. **File bugs as issues rather than fixing them silently**, so `INT-3` can triage them.
- [ ] `INT-3` Final verification and release — 2 · *Arman*
- [ ] `SC-03` Beat task dispatching due messages while the author is offline — 3 · *Amirhossein* · **bonus**
      **US-B2.2** is the whole point of the feature. Demonstrate it at the Review exactly as written: schedule a message, **log out entirely and close the browser**, and confirm it is delivered and the recipient notified.

### `INT-3` checklist

- [ ] Every bug filed by `U-13` triaged: fixed, or cut and recorded in the report
- [ ] Clean clone → `docker compose up` → seed → **every** story in `user_stories_en.tex` walked
- [ ] Product matches `architecture.tex`: nine modules present, permissions evaluated in `roles`, PostgreSQL is the store
- [ ] Product matches `ERD.tex`: entity list versus shipped models
- [ ] Release commit tagged
- [ ] Delivery bundle signed off

### Final Review demo — the whole product, from `main`

Register · log in · profile · direct messages with edit, delete and search · create a group, add members, chat, attach media · create a channel, add topics, define a role, assign it, demonstrate an allowed and a refused action · restrict media in a channel · notifications · **and if the gate passed:** live delivery with no refresh, and a scheduled message arriving **while the author is fully logged out**.

### Delivery — *Arvin*

- [ ] `repository.txt` containing the repository URL
- [ ] Phase 2 report as PDF
- [ ] Both zipped; filename **confirmed with the TA** (expected `SD_PROJ_GP<NUM>_PHASE2.zip`, but the brief only states that pattern for Phase 1)
- [ ] Delivery session arranged — **all six members present**, each able to demo and answer on their own area

`Planned 6 Must + 3 Nice · Done __ · Carried __ · Remaining __`

**Sprint 2 close-out**

- Committed: `__` · Done: `__` · **Velocity V₂ = `__`** · Reliability = `__`
- Permission matrix: `__ / 16` passed
- Bonus features delivered: `__`
- Stories not delivered, recorded honestly for the report: `__`

**Reality log:**
>

---

## Rolling velocity

Filled in at each sprint close. Team numbers only — velocity is a planning input, never a score (`execution-plan.md` Part 5).

| Sprint | Dates | Committed | Done | Carried | Velocity | Reliability |
|---|---|---|---|---|---|---|
| 1 | Aug 5–8 | 56 | | | | |
| 2 | Aug 9–12 | | | | | |

## Retrospective actions

| After sprint | Action agreed | Owner | Checked at next retro |
|---|---|---|---|
| 1 | | | [ ] |
| 2 | | | — |
