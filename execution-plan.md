# Phase 2 Execution Plan — Discord-like Messaging Platform

> **Course:** Analysis and Design of Systems (CE 40418)
> **Written for:** the whole team, assuming **no prior experience with Scrum**.
> **Window:** **8 days**, Wed **2026-08-05** → Wed **2026-08-12**.
> **Team (6):** Arman · Amirhossein · Amir · Ali · Arvin · Majid.
> **Companion document:** [`sprint-calendar.md`](sprint-calendar.md) — the day-by-day schedule we tick off and edit every night.

---

## Part 0 — How to use this document

This is the single source of truth for **how we build the product**. It turns the Phase 1 artifacts — the [user stories](user_stories_en.tex), the [architecture](architecture.tex), the [ERD](ERD.tex) and the [methodology](methodology.md) — into concrete cards, meetings, and quality gates.

**Read in this order, once, before Sprint 1 Planning:**

1. **Part 1** — Scrum from zero. If you have never done this before, this part is not optional.
2. **Part 3** — the meeting rhythm and exact times. Put them in your phone.
3. **Part 4** — Definition of Ready and Definition of Done. These decide when work counts.
4. **Part 6** — how we branch, review, and merge.
5. Then skim the rest and come back to it when you need it.

**Re-read at the start of every sprint:** Part 3 (agendas), Part 4 (DoD), and the Part for that sprint (8 or 9).

### Three recorded deviations

Rule 12 of the brief explicitly permits revising a stated design when issues arise, provided the revision is deliberate and recorded. These three paragraphs are that record.

**1. Sprint length.** `methodology.md` §6.2 recommends **1-week Sprints**. We are running **4-day Sprints**. The reason is arithmetic: the window from Aug 5 to the Aug 12 deadline is 8 days, which divides evenly into two 4-day iterations; a 1-week Sprint would leave a ragged one-day remainder. The brief caps an iteration at **14 days** and requires the length to stay **fixed** (Rule 3, and §End-of-Iteration Report); 4 days satisfies both, and two iterations means two stakeholder reports rather than one.

**2. Sprint 1 Planning is held on day 2.** The Sprint 1 boundary opens on Aug 5, but this plan was re-cut on Aug 6 after the schedule was compressed, so Planning runs on the evening of Aug 6. Aug 5 is recorded in the calendar as an elapsed day carrying the starting increment, with no cards scheduled against it. The sprint still ends on Aug 8 — the date does not move.

**3. `main` is not protected.** Earlier revisions of this document required a branch protection rule with a mandatory approving review. We have removed it. On an 8-day project with six people who are new to this, a blocking gate on `main` costs more in stalled merges than it buys in caught defects — and the brief's §Guidance warns specifically against unnecessary process machinery. The pull request and the teammate review are **still in the Definition of Done**; they are a team agreement we keep because we agreed to it, not because GitHub refuses the merge button. Part 6 says how.

Everything else in `methodology.md` stands unchanged: Scrum, user stories, the public board, Planning Poker with story points, Must/Nice/Won't-Have partitioning, and the end-of-iteration report.

---

## Part 1 — Scrum from zero

You do not need to be an expert. You need these ideas, and they take ten minutes.

### What Scrum actually is

Scrum is a way of building a product in short, fixed cycles. In each cycle you take a small batch of the most valuable work, finish it to a genuinely working state, show it, reflect on how it went, and repeat. That is the entire idea. Everything below is machinery that makes it happen reliably.

### The Sprint

A **Sprint** is one fixed-length cycle. Ours is **4 days**, and we have two of them: **Aug 5–8** and **Aug 9–12**. Three things make a Sprint a Sprint:

- **Fixed length.** It ends on its end date whether or not the work is finished. You never extend a Sprint. If work is unfinished, the work moves — the date does not.
- **A single goal.** Every Sprint has one sentence describing what will be true at the end. If we have to cut things, the goal tells us what to protect.
- **Immutable scope.** Once the Sprint starts, nothing new is added to it. This is the rule people break first and regret most. New ideas, discovered work, and stakeholder requests all go to the Product Backlog for a *future* Sprint. With 4-day Sprints, nobody waits long.

### The three roles

| Role | Who | What it means |
|---|---|---|
| **Product Owner (PO)** | **Arvin** | Owns *what* we build and in what order. Keeps the Product Backlog ordered by value, writes and clarifies acceptance criteria, and is our single point of contact with the TA stakeholder. Decides at the Review whether a story is accepted. |
| **Scrum Master (SM)** | **Amirhossein** | Owns the *process*. Schedules and facilitates every meeting, keeps the board accurate, chases blockers, and protects the Sprint from mid-Sprint scope changes. A facilitator, **not a manager** — the SM has no authority over anyone. |
| **Development Team** | **All six of us** | Designs, builds, reviews, tests. |

**The Development Team is flat.** There is no hierarchy inside it, nobody assigns work to anybody, and nobody approves anybody. Work is **pulled**: at Planning, each person takes the cards they will do. The PO and SM are hats worn by people who also build — they are not desk jobs.

### The three artifacts

- **Product Backlog** — the single ordered master list of everything the product might need. Every user story lives here. It is never "finished"; it evolves.
- **Sprint Backlog** — the slice of the Product Backlog we committed to for *this* Sprint, broken into tasks.
- **Increment** — the working product at the end of a Sprint. "Potentially shippable" means a stranger could clone it and run it. Not a branch, not a demo script — the real thing on `main`.

### The events

| Event | Purpose |
|---|---|
| **Sprint Planning** | Pick the Sprint Goal and pull the work. Opens the Sprint. |
| **Daily Stand-up** | A short sync: what I finished, what I'm doing next, what is blocking me. |
| **Backlog Refinement** | Mid-Sprint: prepare and estimate the *next* Sprint's stories so they are ready in time. |
| **Sprint Review** | Demo the Increment. The PO accepts or rejects each story. Feedback becomes backlog items. |
| **Retrospective** | Team-only. What to continue, stop, and start. Pick one or two concrete improvements. |

### Commitment versus forecast

At Planning we commit to a Sprint Goal and *forecast* a set of stories. The goal is a promise; the story list is our best estimate. Missing a forecast is information, not failure — it recalibrates the next Sprint. Missing the goal repeatedly means we are planning badly, and the Retrospective exists to fix that.

### Swarming

If you finish your card, **do not start new work first**. Review someone's pull request, or help whoever is blocked. Six half-finished features at the end of a Sprint is worth nothing; four finished ones is worth everything. `methodology.md` §7.7 calls this the "all for one" rule.

### Vocabulary

| Term | Meaning |
|---|---|
| **Story point** | A relative measure of effort. Not hours. Our reference: **3 points ≈ one focused day of one person's work**. |
| **Velocity** | Story points finished (to DoD) in a Sprint. A planning input, never a score. |
| **Spike** | A short, time-boxed investigation to learn something unknown. Produces knowledge, not shippable code. |
| **DoR / DoD** | Definition of Ready / Definition of Done — the gates at the start and end of a story's life (Part 4). |
| **WIP limit** | The maximum number of cards a person may have In Progress at once. Ours is **2**. |
| **Carry-over** | A card not finished by the Sprint end. It returns to the backlog and scores zero this Sprint. |
| **Burndown / burn-up** | A chart of remaining (or completed) work across the Sprint. Ours is generated by the board. |

---

## Part 2 — Roles, duties, and areas

### Standing duties

Each of us holds one standing duty for the whole phase, in addition to building. These are chores that keep the project running; they rotate only if someone asks.

| Member | Standing duty |
|---|---|
| **Arvin** | Backlog ordering and stakeholder contact (Product Owner) |
| **Amirhossein** | Board, burndown, and ceremonies (Scrum Master) |
| **Arman** | Integration, merges, and release verification |
| **Amir** | Frontend build and design consistency |
| **Ali** | UI integration pass |
| **Majid** | Media pipeline and test data |

### Areas

Areas tell you where to look first and who to ask. They are not fences — anyone may work anywhere, and we swarm across areas when something is blocked.

| Area | Owner |
|---|---|
| Backend core, infrastructure, integration | Arman |
| Channels, roles, real-time and background services | Amirhossein |
| Frontend chat core | Amir |
| Frontend auth, profile, groups, notifications | Ali |
| Messaging APIs, search, notifications, stakeholder writeups | Arvin |
| Identity, groups, media and storage | Majid |

Two things about how the cards are distributed, so nobody has to guess at the reasoning:

- **Arman carries the blockers.** Every card that other people's cards wait on — the containers, the database move, the module split, the role model and the permission service — is his, and he is loaded roughly twice as heavily as anyone else in Sprint 1 as a result. A blocker split across two owners is a blocker that waits for a conversation, and we do not have the days for that.
- **Ali's and Majid's cards match what they have already built.** They are the only two who have committed code so far, and their Sprint 1 and Sprint 2 cards map onto the screens and endpoints already on `main` — brought up to the Definition of Done rather than written from nothing. Their sizing reflects that.

### Capacity

Capacity is a **team** number, agreed at each Planning: how many story points the team as a whole believes it can finish in the Sprint. We do not track capacity, velocity, or completion per person — `methodology.md` §6.6 is explicit that velocity is a planning tool and never a performance measure, and splitting it by person turns it into exactly that.

What matters per person is simpler: **every card has exactly one owner**, and the board shows it. That is what makes participation visible (brief, Rule 6).

---

## Part 3 — The rhythm: meetings, times, agendas

The Scrum Master schedules and runs all of these. Times are fixed for the whole phase. **Put them in your phone now.**

| Event | Days | Time | Length | Mode |
|---|---|---|---|---|
| **Daily stand-up** | every day | **13:00** | ~5 min | Async, group chat |
| **Board & burndown sync** | every day | **22:00** | ~10 min | Async; SM updates the calendar |
| **Sprint Planning** | Aug 6, Aug 9 | **20:00–21:30** | 90 min | **Synchronous** |
| **Backlog Refinement** | Aug 7, Aug 11 | **21:00–21:45** | 45 min | PO + 2 rotating devs |
| **Code freeze** | Aug 8, Aug 12 | **18:00** | — | — |
| **Sprint Review** | Aug 8, Aug 12 | **20:00–20:45** | 45 min | **Synchronous** |
| **Retrospective** | Aug 8, Aug 12 | **20:45–21:30** | 45 min | **Synchronous**, team only |
| **Iteration reports** | Aug 8, Aug 12 | **by 23:00** | — | Each member → TA |

The Aug 11 Refinement slot doubles as the **bonus go/no-go gate** (Part 9).

### Daily stand-up (13:00, async)

Post exactly three lines in the group chat, then update your board cards. That is the whole ceremony.

```
Finished:  US-2.1 message API — merged
Next:      US-2.5 message list endpoint
Blocked:   need the Postgres container from P-03 before I can test search
```

Two rules. **Do not solve problems in the thread** — surface the blocker, then take the discussion to a side conversation immediately after. And **post even if you did nothing**; a silent day is information the team needs, not something to hide.

### Board & burndown sync (22:00, async)

Everyone moves their cards to their true column. The SM then updates today's block in [`sprint-calendar.md`](sprint-calendar.md): planned points, done, carried, remaining, plus anything notable in the reality log. Ten minutes, every night, no exceptions — the board is graded evidence and a board that lags two days is worse than no board.

### Sprint Planning (20:00–21:30, synchronous)

The most important meeting we have. Everyone attends.

| Minutes | What happens |
|---|---|
| **0–10** | PO states the **Sprint Goal** in one sentence and explains why it is the most valuable thing to build next. |
| **10–20** | SM reads out the previous Sprint's velocity and any carried-over cards. Carried-over cards go back on the table first. |
| **20–65** | **Story walkthrough.** For each candidate story: PO reads it and its acceptance criteria, the team asks questions until it is unambiguous, then everyone estimates simultaneously with **Planning Poker** (Part 5). Discuss outliers, re-vote, agree. |
| **65–80** | **Task breakdown.** Split each story into tasks, and **people pull the cards they will own.** Nobody is assigned anything. If a card goes unclaimed, the team discusses why — usually it is too big, too vague, or genuinely blocked. |
| **80–90** | **Capacity check and commitment.** Sum the points. If the total is above what the team believes it can finish, drop the lowest-priority stories until it isn't. Say the Sprint Goal out loud one more time and commit. |

**Output:** the Sprint Backlog on the board, every card owned and estimated, the Sprint Goal written at the top of the sprint's section in the calendar.

### Backlog Refinement (21:00–21:45)

PO plus two developers, rotating so everyone does it at least once. Take the stories likely to come up next Sprint and bring them to **Ready** (Part 4): sharpen the wording, add acceptance criteria, split anything too big, and give them a rough estimate. The point is that Planning never stalls on "what does this story even mean."

### Code freeze (18:00 on the last day of the Sprint)

Nothing merges after 18:00 on Aug 8 or Aug 12. The last two hours before the Review are for verifying, not for landing risky changes. Anything not merged by 18:00 carries to the next Sprint.

### Sprint Review (20:00–20:45, synchronous)

**Demo the working product from `main`** — not from a laptop branch, not from a screenshot. Walk each finished story against its acceptance criteria and the PO says accepted or not accepted. Not-accepted stories go back to the backlog and score zero. Feedback becomes new backlog cards; it never becomes work in the Sprint we are about to start unless the PO prioritizes it there.

### Retrospective (20:45–21:30, team only)

No stakeholder, no PO hat, no blame. Three columns:

- **Continue** — what worked and should keep happening.
- **Stop** — what wasted time or caused pain.
- **Start** — what we should try next.

Pick **one or two** concrete, assignable improvements. Not "communicate better" — "post stand-ups before 13:00, SM pings anyone missing at 13:15." Write them into the calendar; check them at the next Retro.

### Contacting the stakeholder

**Arvin is the only channel to the TA.** If you have a question for the stakeholder, send it to Arvin, who batches questions and asks them together. This keeps the TA from being pinged six times about the same thing and gives us one consistent answer to work from. Any requirement that comes out of such a conversation gets recorded as a new or amended card, tagged so we can trace it later.

---

## Part 4 — Definition of Ready and Definition of Done

These are copied from `methodology.md` §6.4–6.5 and are non-negotiable. They exist because "done" is otherwise a matter of opinion, and opinions are how projects end up with a demo that works on one laptop.

### Definition of Ready

A story may enter a Sprint only when **all five** are true.

- [ ] **Written as a user story** — *"As a [role], I want [goal], so that [benefit]."*
      *Passes:* "As a channel admin, I want to delete any message in my channel, so that I can remove spam."
      *Fails:* "Message deletion." That is a topic, not a story.
- [ ] **Has acceptance criteria** — a short list of checks that decide whether it works.
      *Passes:* "Only the author sees Edit · edited messages show an 'edited' label · editing someone else's message returns 403."
      *Fails:* "Editing works properly."
- [ ] **Small enough to finish inside one Sprint.** If it cannot be, split it. "Build channels" is not a story; "create a channel and become its admin" is.
- [ ] **Estimated** in story points by the whole team.
- [ ] **No unresolved blocking question** for the stakeholder. If we are waiting on the TA, the story is not Ready — it stays in the backlog.

### Definition of Done

A card is Done only when **all six** are true. If one is missing, the card is not Done, regardless of how finished the code feels.

- [ ] **Code complete and merged to `main`** through a pull request.
- [ ] **Manually tested against its acceptance criteria** — every criterion, actually exercised, not assumed.
- [ ] **Reviewed and approved by at least one other teammate.**
      Nothing on GitHub enforces this — `main` is unprotected and you *can* merge your own pull request unreviewed. That is exactly why it is written here. A card merged without a review is not Done, and the Product Owner is entitled to reject it at the Review on that basis alone.
- [ ] **Non-functional requirements respected:** passwords hashed, input validated at the API boundary, and **permissions enforced server-side** — hiding a button in the UI is not a permission check.
- [ ] **Briefly documented** — a README line or an API note. One or two sentences is enough.
- [ ] **Visible on the board in the Done column**, linked to its pull request.

Security and validation live inside the DoD rather than in separate stories, exactly as `architecture.tex` §9 and `methodology.md` §6.5 specify. That is why there is no "add security" card anywhere in this plan.

### Sprint-level Definition of Done

At the end of each Sprint, one further gate: **a fresh clone of the repository, brought up with a single `docker compose up`, must demonstrate the Sprint Goal to somebody who has never seen the code.** This is exactly what the graders will do. If it does not reproduce, the Sprint's Increment is not done — whatever the individual cards say.

---

## Part S — Setup: GitHub, board, and backlog

Everything in this Part is executed as **cards inside the Sprint 1 Backlog** (Part 8), not as a separate off-cadence phase. Scrum has no "Sprint Zero"; setup is just work, so it is estimated, owned, and burned down like all other work.

**Almost all of it is scripted.** The runbook and the four scripts live in the product repository at [`scripts/gh/`](https://github.com/system-design-discord/retarded-discord/tree/main/scripts/gh); `scripts/gh/README.md` is the operator's copy of this Part. Amirhossein runs them once (cards `G-01` and `G-02`). They are idempotent, so re-running after a backlog edit updates rather than duplicates, and every one of them honours `DRY_RUN=1`.

```
scripts/gh/config.sh      org, repo, project title, sprint dates, name → login map  ← edit first
scripts/gh/01-repo.sh     repo settings, labels, milestones
scripts/gh/02-project.sh  project creation, repo link, fields
scripts/gh/03-seed.sh     backlog.tsv → issues → board items → field values
scripts/gh/backlog.tsv    every card in Parts 8 and 9, one row each
```

### S.0 Prerequisites

```bash
gh auth login
gh auth refresh -s project     # Projects v2 has its own OAuth scope
```

Without the `project` scope every board command fails with `missing required scopes [read:project]`. The operator also needs **admin on the repository** and permission to create projects in the `system-design-discord` org.

### S.1 The repository — `./01-repo.sh`

1. The repository is `retarded-discord`. Make it **public** — brief Rule 9 requires the TAs to be able to see it. It is currently private.
2. Squash-only merges, and **auto-delete of head branches on merge**.
3. Delete the stale remote branch `feature/my-first-task`.
4. Add `.env.example` and confirm `.env`, `db.sqlite3`, `node_modules/`, `__pycache__/`, and `media/` are in `.gitignore`.

**There is no branch protection rule, and none is created.** `main` takes direct pushes, anybody can merge their own pull request, and no status check is required. `01-repo.sh` *checks* whether a protection rule exists and tells you where to remove it if one does. See deviation 3 in Part 0 for why, and Part 4 for what still holds regardless.

### S.2 The Product Backlog lives in GitHub Issues

**Platform:** GitHub Issues, ordered on a GitHub Projects v2 board. One issue = one card. Nothing lives in a private spreadsheet or a chat thread — if it is not an issue, it does not exist.

Create four templates under `.github/ISSUE_TEMPLATE/`.

`user_story.yml` — the format every story must follow:

```yaml
name: User Story
description: A user-facing capability
labels: ["type:story"]
body:
  - type: input
    id: story-id
    attributes: { label: Story ID, placeholder: "US-4.1" }
    validations: { required: true }
  - type: textarea
    id: story
    attributes:
      label: Story
      value: "As a ..., I want ..., so that ..."
    validations: { required: true }
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance criteria
      value: "- [ ] \n- [ ] \n- [ ] "
    validations: { required: true }
  - type: textarea
    id: files
    attributes: { label: Files to create or edit }
  - type: input
    id: branch
    attributes: { label: Branch, placeholder: "feat/us-4-1-create-channel" }
  - type: checkboxes
    id: dor
    attributes:
      label: Definition of Ready
      options:
        - label: Written as a user story
        - label: Has acceptance criteria
        - label: Small enough for one Sprint
        - label: Estimated
        - label: No unresolved stakeholder question
```

`task.yml`, `spike.yml` and `bug.yml` follow the same shape with the story block replaced by, respectively, a description of the technical task, a time-box plus the question being answered, and steps-to-reproduce plus expected-versus-actual.

### S.3 The board — `./02-project.sh`

Create a **GitHub Projects v2** board named **"Discord Clone — Scrum Board"** and **link it to the repository**. The link is what makes the board reachable from the repo's Projects tab — which is how a grader will arrive at it — and what lets `gh issue create --project` resolve it by name.

The board is owned by the **organisation**, not by the repository. Projects v2 belongs to a user or an org and is then linked to one or more repos; there is no such thing as a repo-owned v2 project. Ours therefore lives at `github.com/orgs/system-design-discord/projects/<n>`.

**Fields:**

| Field | Type | Values | Automatable? |
|---|---|---|---|
| Status | Single select | `Backlog` → `Ready` → `To Do` → `In Progress` → `In Review` → `Done` | **No** — see below |
| Sprint | **Iteration** | Duration **4 days**, starting **2026-08-05**. This auto-generates Sprint 1 (Aug 5–8) and Sprint 2 (Aug 9–12). | **No** — see below |
| Story Points | Number | 1, 2, 3, 5, 8, 13 | Yes |
| Priority | Single select | `Must` · `Nice` · `Won't` | Yes |
| Epic | Single select | Accounts · Messaging · Groups · Channels · Roles · Media · Notifications · Real-time · Scheduling — the nine modules from `architecture.tex` §5 — plus **Platform** and **Process** for the infrastructure and board/verification/report cards, which belong to no product module | Yes |
| Assignee | People | Exactly one per card | Yes (set on the issue) |

**What the GitHub API cannot do.** These are genuine API limits, and `02-project.sh` detects each one and prints the exact UI steps rather than pretending:

| Step | Why it is manual |
|---|---|
| The `Sprint` iteration field | `gh project field-create` accepts only `TEXT`, `NUMBER`, `DATE` and `SINGLE_SELECT`. Iteration fields cannot be created from the API at all. |
| The `Status` option ladder | The board ships with Todo / In Progress / Done. `updateProjectV2Field` can rewrite single-select options, but it is known to drop existing values off items that already use them, so we do not touch it. |
| Built-in workflows | Auto-add, "issue closed → Done", "pull request merged → Done" have no API surface whatsoever. |
| Views and Insights charts | No API. |

Budget about five minutes in the UI for all four. **Create the Sprint iteration field before running `03-seed.sh`**, or the cards get seeded with no sprint and the seeder has to be re-run.

**Views:**

- **Board** — grouped by Status. The default view; this is what a grader sees.
- **Sprint Backlog** — filtered to `sprint:@current`, grouped by Status.
- **My Work** — filtered to `assignee:@me`, so everyone can find their own cards.
- **Blockers** — table layout, filtered to `label:blocker`, sorted by Sprint. The cards other cards are waiting on, in one place.
- **Insights → Burn-up** — a chart across the current iteration, satisfying the burndown requirement in `methodology.md` §6.9.

**Built-in workflows** (Project → Workflows): item added → Status `Backlog`; pull request merged → Status `Done`; issue closed → Status `Done`; plus **auto-add** on `repo:retarded-discord is:issue`, so an issue filed mid-sprint from a template lands on the board without anybody remembering to put it there.

**Labels** (created by `01-repo.sh`): `epic:accounts` `epic:messaging` `epic:groups` `epic:channels` `epic:roles` `epic:media` `epic:notifications` `epic:realtime` `epic:scheduling` `epic:platform` `epic:process` · `type:story` `type:task` `type:spike` `type:bug` `type:chore` · `prio:must` `prio:nice` `prio:wont` · `pts:1` `pts:2` `pts:3` `pts:5` `pts:8` `pts:13` · `blocker` `blocked`.

**Milestones** (created by `01-repo.sh`): `Sprint 1` (due Aug 8) and `Sprint 2` (due Aug 12). Every issue is attached to one. This duplicates the iteration field on purpose — milestones are visible without opening the Project, which makes the sprint history obvious to a grader.

### S.4 Seeding the board — `./03-seed.sh`

Create an issue for **every card in Parts 8 and 9**, using the card's ID as the issue title prefix. Set the Sprint iteration, points, priority, epic, and assignee on each.

This is driven by [`scripts/gh/backlog.tsv`](https://github.com/system-design-discord/retarded-discord/blob/main/scripts/gh/backlog.tsv), which holds all **71 cards** — one tab-separated row each, with the columns `id · type · sprint · owner · points · priority · epic · title · stories · files · branch · acceptance · notes · blocks`. The seeder turns each row into an issue titled `ID — Title`, with a generated body carrying a blocker banner where applicable, the user stories, the notes, the acceptance criteria, the file list, the branch name and the Definition of Done checklist; applies the `type:` / `prio:` / `pts:` / `epic:` / `blocker` labels; sets the milestone and assignee; adds it to the board; and sets Story Points, Priority, Epic and Sprint.

A card whose owner has no GitHub login configured is created **unassigned** and says so in its body, rather than failing the whole run.

Cards are matched to existing issues by the `ID — ` title prefix, which is what makes re-running safe. The corollary: **never edit an issue's ID prefix in the GitHub UI** — that orphans the card and the next run files a duplicate.

`backlog.tsv` is the source of record for the backlog's *shape*; GitHub is the source of record for its *state*. Edit a card in the file and re-run `./03-seed.sh --only P-04,M-08`; move a card across the board in GitHub.

Set Status to whatever is actually true at the moment you seed it — the seeder deliberately leaves Status alone, so the "item added → Backlog" workflow sets it and you correct it by hand. The board must reflect reality from the first minute — a board that starts as a wish-list and gets corrected later is worse than one that starts honest.

### S.5 Backlog partitioning

Every card carries a Priority, following `methodology.md` §7.5:

- **Must** — the mandatory product: accounts, messaging, groups, channels, roles, media, notifications, search. These are the 3 mandatory points.
- **Nice** — real-time delivery and scheduled messages. These are the bonus point, and they are built **only after the Must set is green**.
- **Won't** — anything else that comes up. Parked, visible, not built this release.

---

## Part 5 — Estimation and velocity

### Story points and Planning Poker

We size in **relative story points**, not hours, using 1, 2, 3, 5, 8, 13.

Our **reference story is 3 points**: roughly one focused day of one person's work. Everything is judged against it. Is this bigger or smaller than that, and by roughly how much? That is the entire skill.

**How Planning Poker runs:** the PO reads the story, the team asks questions, then **everyone states their number at the same moment** — simultaneously, so nobody anchors on the loudest voice. If everyone is within one step, take the higher and move on. If there is a wide spread, the highest and lowest each explain their reasoning for thirty seconds, then re-vote. Two rounds is almost always enough; a third means the story is not understood and should go back to Refinement.

If a story cannot be estimated at all, it is not a story yet — either split it or write a **spike** to learn what you're missing.

### Team capacity

With six people over four days and 3 points ≈ one focused person-day, the raw arithmetic is **6 × 4 × 3 = 72 points**. Nobody works at 100% focus — there are meetings, other courses, and context switching — so we apply a **focus factor**.

- **Sprint 1:** 72 × 0.78 ≈ **56 points**. The factor is lower than a textbook 0.85 for two reasons that cancel only partly: the sprint effectively starts on day 2 (Planning is Aug 6), but a large share of the cards are finishing code that already exists rather than writing it from nothing.
- **Sprint 2:** forecast at Planning from Sprint 1's actual velocity. The one-off setup cards do not recur, but **71 mandatory points are scheduled** against it — more than the team will finish. Part 9 states the cut order in advance, which is the only honest way to run a sprint that is over-subscribed.

**We are behind, and the arithmetic says so.** Pretending otherwise at Planning would make velocity meaningless in exactly the sprint where we most need it to be real.

### Velocity

> **V = the sum of story points of every story that met the Definition of Done by the Sprint Review.**

Two rules that make the number mean something:

- **Partial work scores zero.** A card that is 90% finished contributes 0 points and carries whole to the next Sprint. You never split points across sprints — the moment you do, velocity becomes fiction.
- **Rejected at Review scores zero.** If the PO does not accept it, it did not happen.

**Commitment reliability** = points done ÷ points committed, tracked per Sprint in the calendar. Around 0.8–1.0 means we plan well. Well under that means we are over-committing, and the fix is to commit less, not to work later.

Velocity and reliability are **team numbers**. We do not compute either per person, for the reason given in Part 2.

### Worked example

Sprint 1 commits 56 points across 27 cards. At the Review, 24 cards pass the DoD and 3 do not — one was rejected because permissions were only enforced in the UI, and two were still in review at the freeze. Those three are worth 2 + 3 + 3 = 8 points.

> **V₁ = 56 − 8 = 48.** Reliability = 48 ÷ 56 = **0.86**.

Sprint 2 therefore forecasts about 48 points, and the three carried cards go back on the table **first** at Planning, before anything new is considered. Since Part 9 schedules 71 mandatory points, that forecast is what triggers the cut order rather than a surprise on the last afternoon.

---

## Part 6 — Git: branches, reviews, merges

### Trunk-based, one branch

We work directly off `main` with short-lived branches. **There is no `develop` branch, and `main` is not protected.** A second long-lived branch buys nothing on an 8-day project and costs a merge every time, and a blocking gate on `main` costs more in stalled merges than it catches — exactly the unnecessary complexity the brief's §Guidance warns against.

What this means in practice: you *can* merge your own pull request, unreviewed, at any time. Do not. The review is in the Definition of Done (Part 4) and the Product Owner can reject an unreviewed card at the Review. The rule holds because we agreed to it, which is the only kind of rule that survives a deadline anyway.

### Branch names

Format: `<type>/<card-id>-<short-slug>`, all lowercase, dashes only.

| Type | Use for | Example |
|---|---|---|
| `feat/` | A new capability | `feat/us-4-1-create-channel` |
| `fix/` | A bug | `fix/u-05-api-double-prefix` |
| `refactor/` | Restructuring without behaviour change | `refactor/p-04-split-modules` |
| `chore/` | Tooling, CI, config | `chore/p-05-ci` |
| `spike/` | Time-boxed investigation | `spike/sc-01-celery` |
| `docs/` | Documentation | `docs/d-01-phase2-report` |

The card ID in the branch name is what ties the board, the branch, the commits, and the pull request together. Do not skip it.

### Commits

**Conventional Commits**, which is already the convention in our history:

```
feat(messaging): add edit-message endpoint (#42)
fix(api): remove duplicate api/ prefix from auth routes (#17)
refactor(backend): split users app into domain modules (#12)
```

Format: `type(scope): imperative summary (#issue)`. Scope is the module. Keep the summary under about 70 characters.

### Pull requests

- **Title:** `[US-4.1] Create channel` — the story ID in brackets, then the story in plain words.
- **Body:** must contain `Closes #<issue>` so the board moves automatically, plus the DoD checklist from the PR template, plus one line on how you tested it.
- **Open the PR the day you start**, as a draft if it isn't ready. A branch that lives more than 24 hours without a PR is invisible to everyone else, and invisible work is where merge conflicts are born.
- **Squash merge**, then delete the branch.

Create `.github/pull_request_template.md`:

```markdown
Closes #

## What this does

## Acceptance criteria
- [ ]
- [ ]

## Definition of Done
- [ ] Manually tested against every acceptance criterion
- [ ] Reviewed by a teammate
- [ ] Permissions enforced server-side (not only hidden in the UI)
- [ ] Input validated at the API boundary
- [ ] Briefly documented (README or API note)

## How I tested it
```

### Review

**Review is symmetric.** Everyone reviews and everyone is reviewed. Nothing on GitHub blocks a merge, so the rotation below is what actually makes reviews happen — it removes the excuse that it was nobody's obvious job to look at it.

| Author | First reviewer to ask | Fallback |
|---|---|---|
| Arman | Amirhossein | Arvin |
| Amirhossein | Arman | Amir |
| Amir | Ali | Arman |
| Ali | Amir | Majid |
| Arvin | Arman | Amirhossein |
| Majid | Arvin | Ali |

Respond to a review request **within four hours of the next touchpoint** (13:00 or 22:00). A review is not a rubber stamp: run the branch, exercise the acceptance criteria, and check the server-side permission line of the DoD specifically — it is the one most often quietly skipped.

### Merging

**Keeping `main` healthy is Arman's standing duty**, in the same way the board is the Scrum Master's and the backlog is the Product Owner's. In practice that means: he clears the merge queue at the 13:00 and 22:00 touchpoints, keeps `main` releasable, resolves conflicts that cross two modules, and runs the sprint verification card (`INT-1`, `INT-2`, `INT-3`).

**Merge timing — the hard rules:**

- Open the PR the day the work starts.
- No branch older than 24 hours without a PR.
- **WIP limit: 2 cards In Progress per person.** Finish or hand off before pulling a third.
- Rebase onto `main` before asking for review.
- **Do not merge your own pull request before somebody has looked at it.** Nothing stops you; the Definition of Done does.
- Everything intended for the Sprint is merged by the **18:00 code freeze** on day 4.
- **`main` is never left red overnight.** A broken `main` blocks all six of us; fixing it takes precedence over any feature work.

---

## Part 7 — The repository: where things go

### Current layout versus target

```
NOW                              TARGET
────────────────────────────     ──────────────────────────────────────────────
<root>/src/                      frontend/src/
<root>/package.json              frontend/package.json
backend/core/                    backend/config/        settings, urls, asgi
backend/users/   (everything)    backend/accounts/      User, Profile, privacy flag
                                 backend/messaging/     Message, PrivateChat
                                 backend/groups_app/    Group, GroupMember
                                 backend/channels_app/  Channel, Topic, ChannelMember
                                 backend/roles/         Role, permission evaluation
                                 backend/media_app/     MediaFile
                                 backend/notifications/ Notification
                                 backend/realtime/      consumers.py, routing.py
                                 backend/scheduling/    tasks.py, beat schedule
                                 backend/common/        events.py, shared serializers
(none)                           docker-compose.yml
(none)                           .env.example
(none)                           nginx/nginx.conf
(none)                           backend/Dockerfile · frontend/Dockerfile
(none)                           .github/workflows/ci.yml
```

**Why the split matters.** `architecture.tex` §5 states that the backend is decomposed into nine modules, and brief Rule 12 says alignment between the final product and the stated design is graded. One app containing every domain is a visible contradiction of our own architecture document. The split is card `P-04` in Sprint 1, and because every other backend card lands on top of it, it is the highest-leverage card in the whole plan.

**Two naming traps.** The Django app **must not** be called `channels` — that collides with the Django Channels package we already depend on. It must not be called `groups` either — that collides conceptually with `django.contrib.auth.Group`. Use `channels_app` and `groups_app`.

**Splitting without losing data.** The existing migrations must keep working. For each model that moves, set an explicit `db_table` matching its current table name, and use `migrations.SeparateDatabaseAndState` so Django updates its own state without touching the database. Then run `python manage.py migrate --plan` and confirm nothing destructive appears before running it for real. Verify afterwards by re-running the seed command against a fresh database.

### Module → ERD entity map

| Module | ERD entities | Architecture ref |
|---|---|---|
| `accounts` | `User`, `Profile` | §5 Accounts & Identity |
| `messaging` | `Message`, `PrivateChat` | §5 Messaging |
| `groups_app` | `Group`, `GroupMember` | §5 Groups |
| `channels_app` | `Channel`, `Topic`, `ChannelMember` | §5 Channels & Topics |
| `roles` | `Role`, `ChannelMember.role_id` | §5 Roles & Access Control |
| `media_app` | `Media` | §5 Media |
| `notifications` | `Notification` | §5 Notifications |
| `realtime` | (no entities — gateway) | §5 Real-time gateway |
| `scheduling` | `Message.scheduled_at` | §5 Scheduling & background |

### The one architectural rule that matters most

From `architecture.tex` §5.1: **no module decides permissions for itself.** Messaging, Channels, Groups, and Media all ask the `roles` module — "does user *u* hold `can_delete_message` in channel *c*?" That is what makes "access levels changeable without editing code" (brief §5.8) actually true: permissions are rows in a table, evaluated at runtime.

If you find yourself writing `if user.id == channel.owner_id` outside the `roles` module, stop and call into `roles` instead.

---

## Part 8 — Sprint 1 (Aug 5–8)

> **Sprint Goal:** *from a clean clone, one `docker compose up` brings the whole stack up on PostgreSQL; a user can register, log in, manage a profile and exchange direct messages in the running app; and the `Channel` and `Role` models exist behind the API.*

**Committed:** 56 points. **Planning:** Aug 6, 20:00 (day 2). **Review and reports:** Aug 8.

**The critical path is `F-01` → `P-01`/`P-03` → `P-04` → `R-01` → `R-04`, and all five are Arman's.** Every one of them gates somebody else's card, which is why they are concentrated on one person: a blocker split across two owners is a blocker that waits for a conversation. Cards marked **◆** are blockers and name what they block. If a blocker will not land on its scheduled day, that goes in the 13:00 stand-up, not the 22:00 sync.

Cards owned by Ali and Majid in this sprint correspond to code that already exists on `main` from Jul 27–29. They are **not** free points: none of it passes the Definition of Done yet — the module split has not happened, `Message` has no migration, the frontend cannot reach the backend, and nothing has been through a pull request or a review. The estimates reflect *finish it and bring it to DoD*, which is why they are smaller than a from-scratch equivalent.

### Foundations and the critical path — *Arman*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **F-01** ◆ | Move the SPA into frontend/, update Vite config and Docker paths | — | 1 | `refactor/f-01-frontend-dir` |
| **P-06** ◆ | Runtime unblock: add axios, fix the broken api imports, remove the /api/api/ double prefix, enable CORS | — | 2 | `fix/p-06-runtime-unblock` |
| **P-01** ◆ | Backend and frontend Dockerfiles; docker-compose.yml bringing up db + backend + frontend + nginx; .env.example | — | 5 | `feat/p-01-docker-compose` |
| **P-03** ◆ | SQLite to PostgreSQL; settings read from env; requirements.txt; generate the missing Message migration | — | 3 | `feat/p-03-postgres` |
| **P-04** ◆ | Split backend/users/ into the nine modules of architecture.tex section 5 | — | 5 | `refactor/p-04-split-modules` |
| **R-01** ◆ | Role model with the eight permission booleans, plus migration | US-8.1 | 3 | `feat/us-8-1-role-model` |
| **R-04** ◆ | Permission evaluation service has_permission(user, channel, permission), with the channel owner implicitly holding all eight | US-8.3 | 3 | `feat/us-8-3-permission-service` |
| **INT-1** | Sprint 1 verification: clean-clone run of the Sprint Goal | — | 1 | — |

- **`F-01` blocks `P-01`.** The SPA sits at the repository root today, which makes it impossible to give the backend and the frontend separate Dockerfiles. Move it wholesale, then fix the Vite root and the paths in package.json. Do this first - P-01 writes its Dockerfiles against the new layout.
- **`P-06` blocks `A-05`, `F-02`, `F-03`, `U-04`, `U-06`, `U-07`, `U-08`.** Four separate defects stop the app running at all today. (1) axios is imported by services/api.js but is missing from package.json. (2) AuthContext.jsx, Register.jsx and Chat.jsx import '../api' / '../../api', which does not resolve - the file is at src/services/api.js. (3) core/urls.py mounts users.urls under api/ while users/urls.py already declares api/auth/login/, so login actually lives at /api/api/auth/login/ and the client misses it. (4) django-cors-headers is neither installed nor configured. Nothing on the frontend can be wired until all four are fixed.
- **`P-01` blocks `INT-1`, `INT-2`, `INT-3`.** None of this exists yet. This is the card a grader exercises first - the Sprint-level Definition of Done in execution-plan.md Part 4 is a fresh clone brought up with a single command. Depends on F-01 for the frontend path and pairs with P-03 for the database service.
- **`P-03` blocks `M-01`, `A-09`, `M-08`.** settings.py still points at django.db.backends.sqlite3, SECRET_KEY is the hardcoded django-insecure default and DEBUG is True. There is no requirements.txt at all - the implicit deps are django, djangorestframework, djangorestframework-simplejwt, channels, daphne, pillow, plus psycopg[binary] and django-cors-headers. Critically, Message has NO migration: makemigrations was never run after the model was added, so a fresh migrate never creates its table. Postgres is also what US-9.1 needs - full-text search and a GIN index do not exist on SQLite.
- **`P-04` blocks `A-02`, `A-03`, `A-04`, `A-06`, `A-07`, `A-08`, `C-01`, `M-01`, `N-01`, `R-01`.** Profile, Group, MediaFile and Message all live in one users app today, and every endpoint is in users/views.py. architecture.tex section 5 states nine modules and brief Rule 12 grades that alignment, so one app containing every domain is a visible contradiction of our own design document. Two naming traps: the app must not be called channels (collides with the Django Channels package) nor groups (collides with django.contrib.auth.Group) - use channels_app and groups_app. Move without losing data: set an explicit db_table on each model matching its current table name and use migrations.SeparateDatabaseAndState, then inspect migrate --plan before running it.
- **`R-01` blocks `R-02`, `R-03`, `R-04`, `R-05`, `C-02`, `C-03`, `C-04`, `F-06`, `A-10`.** US-8.1: 'As a channel super-admin, I want to be able to define different roles with different names for users, so that I can structure the management of the channel.' The eight permissions, fixed by user_stories_en.tex section Assumptions, are can_send_media, can_delete_message, can_create_topic, can_edit_channel, can_remove_member, can_add_member, can_change_role, can_delete_channel. Nothing role-shaped exists in the codebase - the only access check anywhere today is group.admin == request.user.
- **`R-04` blocks `C-02`, `C-03`, `C-04`, `R-05`, `A-10`, `F-06`.** This is the single most important line in architecture.tex: section 5.1 says no module decides permissions for itself. Messaging, Channels, Groups and Media all call in here. It is what makes brief section 5.8 - access levels manageable without editing code - literally true. If you ever find yourself writing 'if user.id == channel.owner_id' outside this module, stop and call in here instead.
- **`INT-1` acceptance:** Clone into an empty directory; cp .env.example .env and docker compose up; run the seed command; register, log in, edit the profile, view another profile, send direct messages both ways, refresh, log out; walk every merged story against its own acceptance criteria.

### Process, proxy and channel models — *Amirhossein*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **G-02** ◆ | Projects v2 board: fields, 4-day Sprint iteration starting Aug 5, views, workflows, milestones | — | 2 | — |
| **G-01** | Repository public; issue and pull request templates committed | — | 1 | `chore/g-01-repo-setup` |
| **P-02** ◆ | nginx reverse proxy: serve the SPA, proxy /api to the backend, pass /ws upgrade headers | — | 2 | `feat/p-02-nginx` |
| **C-01** ◆ | Channel and ChannelMember models and migration | US-4.1 | 2 | `feat/us-4-1-channel-model` |

- **`G-02` blocks every card on the board - until this exists there is nowhere to track work.** Brief Rule 10 makes the board mandatory and it is the evidence a grader actually looks at. Most of it is scripted in scripts/gh/ - run 01-repo.sh then 02-project.sh then 03-seed.sh. Four things have no API and must be done in the browser: the Status option ladder, the Sprint iteration field, the built-in workflows and the views. scripts/gh/README.md is the step-by-step.
- **`P-02` blocks `A-08`, `F-07`, `RT-02`.** architecture.tex puts nginx in front of both halves - one origin, so no CORS in production and one URL for a grader. Get the /ws upgrade headers right now even though real-time is a bonus, because retro-fitting them later is where this usually goes wrong.
- **`C-01` blocks `C-02`, `C-03`, `C-04`, `R-03`, `F-04`, `F-05`, `A-10`.** US-4.1: 'As a user, I want to be able to create a new channel and become its admin, so that I have a space for discussion, message sharing and file sharing with multiple users.' Nothing channel-shaped exists in the codebase at all. Land the models on day 1 or 2 - four other people's cards are waiting on them. The app directory must be channels_app, not channels, or it collides with the Django Channels package.
- **`G-01` acceptance:** The repository is publicly visible while logged out (brief Rule 9); filing a new issue offers the four templates and no blank option; the PR template carries the Definition of Done checklist.

### Identity and the messaging base — *Majid*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **A-02** | Profile model, migration, serializer, and own-profile view/edit endpoint | US-10.1 | 2 | `feat/us-10-1-profile-api` |
| **A-03** | Privacy-settings endpoint toggling allow_invites | US-5.4, SH.2 | 1 | `feat/us-5-4-privacy-api` |
| **A-04** | Registration endpoint and JWT login/refresh endpoints | US-1.1, US-1.2 | 2 | `feat/us-1-1-register-login` |
| **M-01** ◆ | Message model and migration: sender, recipient, group, text, media FK, timestamps, ordering | US-2.1 | 2 | `feat/us-2-1-message-model` |
| **M-02** | Message list/create/detail API, scoped so a user only sees conversations they belong to | US-2.1, US-2.5 | 2 | `feat/us-2-1-message-api` |

- **`M-01` blocks `M-02`, `M-06`, `M-07`, `M-08`, `F-02`, `F-03`, `SC-02`.** US-2.1: 'As a logged-in user, I want to be able to send and receive messages with other users, so that I can have continuous and personal communication.' The model is written and the dual-target rule is already enforced in MessageSerializer.validate - but there is NO migration for it, so a fresh clone never gets the table. Generating that migration is the actual work here (P-03 covers the makemigrations run; this card owns the model shape being right first). Add the channel/topic target now rather than later - C-03 and US-2.3 need it.
- **`A-02` acceptance:** A user can read and update their own profile and nobody else's; the endpoint refuses an unauthenticated caller; the avatar upload path is under MEDIA_ROOT.
- **`A-03` acceptance:** The flag defaults to allowing invites; toggling it persists; the flag is readable by the group and channel add-member paths.
- **`A-04` acceptance:** Registering with an existing username returns 400 with a readable message; passwords are stored hashed - a plain-text password fails the DoD; login returns access and refresh tokens; an expired access token is refreshable.
- **`M-02` acceptance:** Requesting a conversation you are not part of returns 403, not an empty list; messages come back in chronological order; the endpoint is paginated.

### Chat surface — *Amir*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **F-00** ◆ | Shared message primitives - avatar, timestamp, message bubble, composer - used by the DM, group and channel views alike | — | 3 | `feat/f-00-chat-primitives` |
| **F-02** | Chat view: message list with author and timestamp, plus the composer | US-2.1 | 3 | `feat/us-2-1-chat-view` |

- **`F-00` blocks `F-02`, `F-05`, `U-09`.** Three different chat surfaces are coming - DM (F-03), channel topic (F-05) and group (U-09) - and they are the same UI with a different fetch. Build the primitives once on day 1 so the other three are wiring, not re-implementation. Note that the existing wired components use Tailwind class names while Tailwind is not a dependency and no directives exist in index.css, so those classes currently render unstyled: either add Tailwind or use the semantic classes already in src/index.css.
- **`F-02` acceptance:** Messages render newest-last with author and time; the composer sends and clears; an empty conversation shows an empty state, not a spinner forever.

### App shell — *Ali*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **U-01** | React application shell and routing, with authenticated and guest route groups | — | 2 | `feat/u-01-app-shell` |
| **U-02** | Dashboard screen: navigation between DMs, groups and channels | — | 1 | `feat/u-02-dashboard` |
| **U-03** | Direct-messages screen: conversation list layout | — | 2 | `feat/u-03-dm-screen` |

- **`U-01` acceptance:** Every screen that exists has a route; an unauthenticated visit to a private route redirects to /login and back after login; a bad URL shows a not-found screen rather than silently redirecting to /profile.
- **`U-02` acceptance:** Every navigation target resolves to a real route; the signed-in user's name is shown; it is reachable as the landing screen after login.
- **`U-03` acceptance:** The conversation list renders from a prop or a hook rather than a hardcoded array; selecting a conversation opens the chat surface; an empty state is handled.

### Backlog, stakeholder and account endpoints — *Arvin*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **B-01** | Order and partition the seeded Product Backlog: confirm Must / Nice / Won't on every card | — | 1 | — |
| **B-02** | Batch the team's open questions and put them to the TA stakeholder | — | 1 | — |
| **G-03** | Run Planning Poker calibration on three sample stories; walk the team through DoR and DoD | — | 1 | — |
| **M-03** | Public profile endpoint - view another user's profile | US-10.2 | 1 | `feat/us-10-2-public-profile` |
| **G-04** | Logout that actually invalidates: blacklist the refresh token server-side | US-1.3 | 2 | `feat/us-1-3-logout` |

- **`B-01` acceptance:** Every issue on the board has a Priority; the Nice cards are exactly the two bonus features; every user story in user_stories_en.tex maps to at least one card, and any that does not is recorded as a gap.
- **`B-02` acceptance:** Every open question from the team is asked in one message; the answers are written back onto the affected cards; anything that changes scope becomes a new card rather than an edit to a running sprint.
- **`G-03` acceptance:** All six have estimated at least once; everyone can state the six DoD items from memory; the 3-point reference story is agreed out loud.
- **`M-03` acceptance:** Another user's profile returns display fields only - never email, password hash or privacy flags; requesting a non-existent user returns 404.
- **`G-04` acceptance:** After logout the old refresh token returns 401; the access token is cleared client-side; logging in again issues a fresh pair.

### INT-1 — Sprint 1 verification — *Arman*

Run before the 18:00 freeze on Aug 8:

1. Clone the repository into an empty directory.
2. `cp .env.example .env` and `docker compose up`.
3. Run the seed command.
4. Walk the Sprint Goal end to end: register, log in, edit the profile, view another profile, send direct messages both ways, refresh, log out.
5. Walk every merged story against its acceptance criteria.

Anything that cannot be reproduced goes back to **In Progress** and carries to Sprint 2; it scores zero. Record the result in the calendar before the Review starts.

---

## Part 9 — Sprint 2 (Aug 9–12)

> **Sprint Goal:** *channels, topics, groups, media, search and notifications are complete and every privileged action is decided by the `roles` module; the bonus lands only if the core is green; and the product is stabilised, reported and delivered.*

**Forecast:** set at Planning from Sprint 1's velocity. **Scheduled:** 71 `Must` points plus 21 `Nice` points behind the gate. **Final Review, reports and delivery:** Aug 12.

**The overhang is deliberate and named.** 71 mandatory points across four days is above what six people plausibly finish. That is what being behind looks like, and the honest response is to fix the cut order in advance rather than discover it on the last afternoon:

1. Every `Nice` card, immediately and without discussion.
2. `U-13` — polish.
3. `M-09` — the search API alone demonstrates US-9.1.
4. `A-10` — US-7.3 is one story.
5. `U-11` — `N-02` demonstrates US-11.1 over the API.

**Never cut:** `INT-3`, `D-01`, or anything in the roles chain — those are what the marks are actually attached to.

Everything here builds on the Sprint 1 messaging engine. Access control is the spine: **groups, channels and media all call into `roles` rather than deciding for themselves** (`architecture.tex` §5.1).

### The bonus gate — Aug 11, 21:00

At the Refinement slot on Aug 11 the team answers one question: **is the mandatory product green?** Green means every `Must` card is Done, `INT-2` passes on a clean clone, and no known defect breaks a core flow.

- **Green** → continue the bonus cards.
- **Not green** → every remaining bonus card drops to `Won't` and everyone moves to stabilisation.

This is not negotiable and it is not a discussion about how close we are. The mandatory work is worth 3 marks; the bonus is worth 1.

### Roles, access control and release — *Arman*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **R-02** | Role CRUD API: create, rename and delete named roles within a channel; set which permissions each grants | US-4.2, US-8.1, US-8.2 | 3 | `feat/us-4-2-role-api` |
| **R-03** | Assign or change a member's role; a member can read the roles they hold | US-4.9, US-8.3 | 2 | `feat/us-4-9-assign-role` |
| **R-05** | Message deletion by a channel admin, a group admin, or a member holding can_delete_message | US-3.4, US-3.5, US-3.6, US-4.6, US-5.3 | 2 | `feat/us-3-4-admin-delete` |
| **M-04** | GroupMember join entity per the ERD, replacing the bare many-to-many | — | 1 | `refactor/m-04-groupmember` |
| **F-06** | Role management UI: create a role, toggle its eight permissions, assign it to a member | US-4.2, US-4.9 | 3 | `feat/us-4-2-roles-ui` |
| **INT-2** | Sprint 2 verification: everything in INT-1 plus the sixteen-check permission matrix against the API | — | 2 | — |
| **INT-3** | Final verification and release | — | 2 | — |

- **`R-02` acceptance:** Only a holder of can_change_role or the channel owner may create or edit a role; a super-admin cannot grant a permission they do not themselves hold (US-8.2); deleting a role does not orphan its members.
- **`R-03` acceptance:** Changing a role needs can_change_role; the change takes effect on the next request with no restart; a member can read their own roles and nobody else's.
- **`R-05` acceptance:** The author can always delete their own message; a member without the permission gets 403; the channel owner always succeeds; a group admin can delete in their group.
- **`M-04` acceptance:** GroupMember exists with the fields ERD.tex specifies; existing memberships survive the migration; the group API returns the same shape as before.
- **`F-06` acceptance:** Controls the current user lacks permission for are hidden AND the server still rejects the request if called directly; the eight toggles map one-to-one onto the model booleans; assigning a role updates the member list without a page reload.
- **`INT-2` acceptance:** Everything in INT-1; for each of the eight permissions exercise one allowed case and one denied case against the API directly, bypassing the UI - sixteen checks; record the result in sprint-calendar.md.
- **`INT-3` acceptance:** Every known bug triaged - fixed now, or cut and recorded; full clean-clone run: clone, docker compose up, seed, walk every story in user_stories_en.tex; the nine modules exist and permissions are evaluated in roles; the release commit is tagged; the delivery bundle is signed off.

### Channels, topics and scheduling — *Amirhossein*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **C-02** | Channel API: create (creator becomes admin), edit name/description/image, delete - each gated on the matching permission | US-4.1, US-4.7, US-4.10, US-6.1, US-6.2 | 3 | `feat/us-4-1-channel-api` |
| **C-03** | Topic model and API; creating a topic requires can_create_topic; channel messages are scoped to a topic | US-4.5, US-2.3 | 2 | `feat/us-4-5-topics` |
| **C-04** | Add and remove channel members directly, honouring the target user's allow_invites flag | US-4.3, US-4.4, SH.1, SH.2 | 2 | `feat/us-4-3-channel-members` |

- **`C-02` acceptance:** The creator ends up holding all eight permissions; editing needs can_edit_channel; deleting needs can_delete_channel; every gate is a call into roles.services, not an inline owner check.
- **`C-03` acceptance:** A member without can_create_topic gets 403; messages posted in a topic are only visible in that topic; deleting a topic does not silently delete its messages without saying so.
- **`C-04` acceptance:** Adding a user whose allow_invites is off returns 403 and the user is not added; the actor needs can_add_member; removing needs can_remove_member.

### Messaging, search, notifications and the report — *Arvin*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **M-06** | Edit own message, with an is_edited flag; only the author may edit | US-3.1, US-3.2 | 2 | `feat/us-3-1-edit-message` |
| **M-07** | Delete own message in any of the three contexts | US-3.3 | 1 | `feat/us-3-3-delete-own-message` |
| **M-08** | Search message text across DMs, groups and channels using PostgreSQL full-text search with a GIN index, scoped to the caller | US-9.1 | 3 | `feat/us-9-1-search` |
| **M-09** | Wire the search screen to the search API | US-9.1 | 1 | `feat/us-9-1-search-ui` |
| **N-01** ◆ | Notification model and migration | US-11.1 | 1 | `feat/us-11-1-notification-model` |
| **N-02** | Generate notifications on new message, group/channel add, and role change; list and mark-read API | US-11.1 | 3 | `feat/us-11-1-notification-api` |
| **D-01** | Phase 2 report: requirement fulfilment, architecture alignment, deviations, ERD alignment, process summary | — | 5 | `docs/d-01-phase2-report` |

- **`N-01` blocks `N-02`, `U-11`.** US-11.1 names exactly three trigger events: a new message, being added to a group or channel, and having your role in a channel changed. Model the kind as an enum covering those three rather than a free-text string.
- **`M-06` acceptance:** Editing someone else's message returns 403; an edited message is visibly labelled; the original timestamp is preserved.
- **`M-07` acceptance:** The author can delete in a DM, a group and a channel topic; deleting someone else's returns 403 unless R-05 grants it; the message disappears from history for everyone.
- **`M-08` acceptance:** Results never include messages from conversations the caller is not in - verify by searching a term that only exists in a stranger's chat and confirming zero results; a search across a few thousand messages returns promptly; results say which conversation each hit is in.
- **`M-09` acceptance:** Typing a term and submitting returns real results; clicking a result opens that conversation at that message; no results shows an empty state.
- **`N-02` acceptance:** The notification is created by an event emitted from the owning module, not by the messaging view calling notifications directly; a user only ever sees their own; mark-read is idempotent.
- **`D-01` acceptance:** One table row per user story - the ID, the story, where it is implemented (module and endpoint) and how it was verified; a mapping onto architecture.tex; every deviation stated plainly with its reason; a mapping onto ERD.tex; a process summary covering both sprints, their velocities and what the retrospectives changed.

### Groups, media and test data — *Majid*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **A-05** | React auth context, Login and Register screens, API client with token interceptor | US-1.1, US-1.2 | 2 | `feat/us-1-2-auth-ui` |
| **A-06** | Group model, serializer, and create/list/detail API; creator becomes admin | US-5.1 | 2 | `feat/us-5-1-group-api` |
| **A-07** | MediaFile model and upload endpoint with size and MIME-type validation; attach media to a message | US-2.4, US-7.1 | 2 | `feat/us-2-4-media-upload` |
| **A-08** | Media detail and serving endpoint, access-scoped to the conversation the media belongs to | US-7.1, US-7.2 | 2 | `feat/us-7-1-media-serve` |
| **A-09** | Seed command producing users, conversations, groups, channels and sample media for testing | — | 1 | `chore/a-09-seed-data` |
| **A-10** | Per-channel media restriction: uploading in a channel requires can_send_media, evaluated by the roles module | US-7.3, US-4.8, US-7.2 | 2 | `feat/us-7-3-media-restriction` |
| **M-05** | Group edit and delete, add and remove members honouring allow_invites, group-admin rights | US-5.2, US-6.3, US-6.4, SH.1, SH.2 | 2 | `feat/us-5-2-group-management` |

- **`A-05` acceptance:** Register then log in then reload keeps the session; an expired access token is refreshed transparently and the request retried; the logged-in user object carries an id.
- **`A-06` acceptance:** The creator is the admin; listing returns only the caller's groups; a non-member cannot read a group's detail.
- **`A-07` acceptance:** An oversized file is rejected with a clear error; a disallowed type is rejected; the stored record captures type and size; the type recorded matches the file, not just the request header.
- **`A-08` acceptance:** Requesting media from a conversation you are not a member of returns 403 - not the file; a direct URL guess does not bypass the check; media renders inline in the chat view.
- **`A-09` acceptance:** One command on an empty database produces enough data to demo every story; it is idempotent or clearly refuses to run twice; the credentials it creates are printed.
- **`A-10` acceptance:** With the restriction on, a member lacking can_send_media is refused by the API, not merely by a hidden button; the channel admin is never refused; DMs and groups are unaffected.
- **`M-05` acceptance:** Adding a user whose allow_invites is off returns 403 and the user is not added; only the group admin may add, remove or delete; editing group name, image and description works.

### Channel and group surfaces — *Amir*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **F-03** | Wire DirectMessages.jsx to the message API - real conversations, no mock data | US-2.1, US-2.5 | 3 | `feat/us-2-5-dm-integration` |
| **F-04** | Channels dashboard wired to the channel API: list, create, open | US-4.1 | 2 | `feat/us-4-1-channels-ui` |
| **F-05** | Topic tabs and the channel message view, reusing the chat component | US-2.3, US-4.5 | 3 | `feat/us-2-3-channel-chat` |
| **U-09** | Group chat view | US-2.2 | 2 | `feat/us-2-2-group-chat` |

- **`F-03` acceptance:** Two accounts in two browsers can exchange messages; a page refresh shows the full history; sending with an expired token refreshes and retries rather than silently failing.
- **`F-04` acceptance:** Creating a channel makes you its admin and it appears in the list; the list shows only channels you belong to; opening one navigates to its topics.
- **`F-05` acceptance:** Switching topics switches the message list; the create-topic control is hidden without can_create_topic and the API refuses it anyway; the same message bubble component as the DM view is used.
- **`U-09` acceptance:** Every group member can post and see each other's messages; the member list is visible; it renders through the same primitives as the DM and channel views.

### Settings, groups and notifications UI — *Ali*

| ID | Card | Story | Pts | Branch |
|---|---|---|---|---|
| **U-04** | Account and privacy settings screens wired to the profile and privacy endpoints | US-10.1, US-5.4 | 2 | `feat/u-04-settings` |
| **U-06** | View-profile screen for another user | US-10.2 | 1 | `feat/us-10-2-profile-ui` |
| **U-07** | Groups dashboard wired to the group API | US-5.1 | 2 | `feat/us-5-1-groups-ui` |
| **U-08** | Create-group modal wired to the create endpoint | US-5.1 | 1 | `feat/us-5-1-create-group-ui` |
| **U-11** | Notifications centre wired to the API, with an unread count | US-11.1 | 2 | `feat/us-11-1-notifications-ui` |
| **U-13** | Responsive and empty-state pass across the screens, plus a frontend defect sweep | — | 2 | `fix/u-13-ui-polish` |

- **`U-04` acceptance:** Editing the profile persists and survives a reload; toggling allow_invites persists; a validation error from the API is shown, not swallowed.
- **`U-06` acceptance:** Opening another user shows their display fields only; your own profile shows the edit affordance and theirs does not; a missing user shows a not-found state.
- **`U-07` acceptance:** The list shows only groups you belong to; opening one navigates to its chat; an empty state is handled.
- **`U-08` acceptance:** Creating a group makes you its admin and it appears in the list without a reload; a duplicate or invalid name shows the API's error; cancel discards.
- **`U-11` acceptance:** The three event kinds from US-11.1 all appear; the unread badge matches the API; opening a notification marks it read and navigates to its subject.
- **`U-13` acceptance:** No screen breaks below 400px wide; every list has an empty state; every screen in the demo script is walked once against its acceptance criteria and any failure is filed as a bug issue.

### Bonus — `Nice`, behind the Aug 11 gate

| ID | Card | Story | Pts | Owner |
|---|---|---|---|---|
| **RT-01** | Replace the in-memory channel layer with Redis; add Redis to compose | — | 2 | Arman |
| **RT-02** | Real-time gateway covering DMs, groups and channel topics; authenticated WebSocket connections; push on message-created | US-B1.1 | 5 | Arman |
| **SC-01** | Celery, Celery Beat and RabbitMQ added to compose; worker container starts clean | — | 2 | Amirhossein |
| **SC-02** | scheduled_at on the message model; schedule, list and cancel endpoints | US-B2.1 | 3 | Amirhossein |
| **SC-03** | Beat task that dispatches due messages, delivering them even when the author is offline | US-B2.2 | 3 | Amirhossein |
| **F-07** | WebSocket client with reconnect; live message rendering in all three contexts | US-B1.1 | 3 | Amir |
| **U-12** | Scheduled-message composer: pick a date and time, see pending scheduled messages, cancel one | US-B2.1 | 3 | Ali |

### Cut to `Won't` for this release

| ID | Card | Why it was cut |
|---|---|---|
| `F-08` | Live notification delivery in the UI | Cut for this release. US-B1.2 is the lowest-value half of the lowest-value bonus, and polling the N-02 endpoint gives the user almost the same thing. Parked and visible rather than quietly dropped, per methodology.md section 7.5. |
| `RT-03` | Push notifications over the same socket | Cut for this release, together with its UI half F-08. If RT-02 lands early and the mandatory product is green, this is the first card to bring back. |
| `U-10` | Group member management and group info editing UI | Cut for this release. M-05 delivers US-5.2 and US-6.4 server-side and they can be demonstrated against the API; a dedicated settings screen is the presentation of a requirement that is already met. Reinstate it if Sprint 2 runs ahead. |

### INT-2 — Sprint 2 verification — *Arman*

Everything in `INT-1`, plus the **permission matrix**: for each of the eight permissions, exercise both an allowed case and a denied case **against the API directly**, bypassing the UI. Eight permissions × two cases = sixteen checks. Record the result in the calendar. This is the evidence that US-4.2 and US-8.1–8.3 genuinely hold, and it is the single most likely thing for a grader to probe.

The eight permissions, from `user_stories_en.tex` §Assumptions: `can_send_media`, `can_delete_message`, `can_create_topic`, `can_edit_channel`, `can_remove_member`, `can_add_member`, `can_change_role`, `can_delete_channel`.

### INT-3 — Final verification and release — *Arman*

Run on Aug 12 before the freeze:

1. Triage every bug filed by `U-13`: fix now, or cut and record it.
2. Full clean-clone run: clone, `docker compose up`, seed, and walk **every** story in `user_stories_en.tex`.
3. Confirm the product matches `architecture.tex` — the nine modules exist, permissions are evaluated in `roles`, PostgreSQL is the store — and `ERD.tex`, since brief Rule 12 grades exactly this alignment.
4. Tag the release commit.
5. Sign off the delivery bundle before it is submitted.

### Delivery — *Arvin*

- **`repository.txt`** containing the repository URL.
- **The Phase 2 report** as a PDF (Part 11).
- Both in one zip. Following the Phase 1 pattern in the brief, the name is expected to be **`SD_PROJ_GP<NUM>_PHASE2.zip`** — but the brief only states that pattern explicitly for Phase 1, so **confirm the exact filename and our group number with the TA before submitting**.
- The brief requires a **delivery session with all members present**. Everyone should be able to demo their own area and answer questions about it.

---

## Part 10 — The end-of-iteration report

Brief Rule 4 and §End-of-Iteration Report require, at the end of every iteration, **one or two paragraphs — never more** — sent to the project stakeholder, covering:

- tasks **you** completed,
- planning and how well it matched the actual work,
- the participation of yourself and your teammates,
- your satisfaction with progress, your own performance, and the team's.

Read literally, that is written in the first person. **So each of us sends our own report** — six short reports per iteration, not one on behalf of everybody. It costs five minutes and it is direct evidence for the participation requirement in Rule 6.

**At 22:00 on each Sprint's last day, Arvin posts the shared numbers** — the Sprint Goal, points committed, points done, what carried, and what the Review accepted — so all six reports are written from the same facts rather than six different guesses.

**Then each of us sends our own, by 23:00.** Template:

> *Sprint N (dates). This iteration I completed [your cards, by name]. As a team we finished [X] of the [Y] story points we committed to; [what carried and why]. The plan matched the work [closely / with these deviations: …]. Participation: [one clause per area — what got delivered, not who worked hardest]. I am [satisfied / concerned] with our progress because [reason], and with my own contribution because [reason]. Our retrospective action for the next iteration is [the one or two things agreed].*

Worked example:

> *Sprint 1 (Aug 5–8). This iteration I completed the public profile endpoint (US-10.2), the logout blacklist (US-1.3), the backlog ordering, and the stakeholder question batch. As a team we finished 48 of the 56 story points committed; two cards were still in review at the freeze and one was rejected because a permission was only enforced in the UI, and all three carried into Sprint 2. The plan matched the work closely apart from the module split, which we had under-estimated. Participation: the containerised environment and the move to PostgreSQL landed, identity and the messaging base landed, the chat surface landed end to end, the application shell and dashboard landed, the role model and permission service landed, and the board and process setup completed.*
>
> *I am satisfied with our progress — we have a running product from a clean clone on day four, which was the goal — and with my own contribution, though I should have flagged the search dependency on PostgreSQL earlier than I did. Our retrospective action for Sprint 2 is to open pull requests on the first day of a card rather than the last, and to run the permission checks against the API rather than through the UI.*

**Two reports, not three.** With two iterations there are two of these, due by 23:00 on **Aug 8** and **Aug 12**.

Note the shape of the participation sentence: **it reports what was delivered, area by area.** It does not rank people. Rule 4 asks about participation, which this answers; it does not ask us to grade each other, and doing so would poison the team for no gain.

---

## Part 11 — The Phase 2 report

The brief's Phase 2 deliverables are the **final product** and a **report on the fulfilment of requirements and the product's alignment with the designs**. Card `D-01`, led by Arvin, with the architecture sections written by Arman.

Structure:

1. **Requirement fulfilment** — a table with one row per user story: the ID, the story, where it is implemented (module and endpoint), and how it was verified. Every story in `user_stories_en.tex` appears, including the ones we cut, marked honestly.
2. **Alignment with the architecture** — how the built system maps to `architecture.tex`: the nine modules, the client–server structure with nginx in front, PostgreSQL as the system of record, permissions centralised in `roles`.
3. **Deviations, stated plainly** — anything that ended up different from Phase 1, with the reason. Rule 12 explicitly permits revising the design when issues arise; what it does not tolerate is a report claiming alignment that a grader can disprove in five minutes. Write down what actually happened.
4. **Alignment with the ERD** — the entity list versus the shipped models.
5. **Process summary** — two iterations, their goals, velocity, and what the Retrospectives changed. Include the fact that the schedule was re-cut on Aug 6 from three sprints to two, and why — brief Rule 12 asks for deviations to be recorded, and this is the largest one.

---

## Part 12 — Risks and mitigations

| Risk | Why it could hurt | Mitigation |
|---|---|---|
| **Work piles up in the In Review column** | A single integration path means merges can queue, and queued work is invisible and rots. | The queue is cleared at both daily touchpoints; the WIP limit of 2 keeps it short; whenever the integration duty is handed off, a standing deputy takes the queue for that period. |
| **The Sprint 1 refactor destabilises working code** | Moving models between apps can break migrations and lose data. | Do it early in the Sprint, one atomic pull request per concern, `migrate --plan` inspected before running, and the seed command re-run against a fresh database as proof. |
| **A cross-module dependency stalls a Sprint** | Channels need roles; groups need the group model; search needs PostgreSQL. | Cards are sequenced so foundations land on the Sprint's first days and dependents on the later ones. Anything blocked for longer than one touchpoint is raised at stand-up and swarmed. |
| **The bonus features eat the mandatory core** | The bonus is worth 1 point; the core is worth 3. | The hard gate on Aug 11. The bonus modules are additive and isolated behind events (`architecture.tex` §5.1), so dropping them costs nothing already built. |
| **The product drifts from the Phase 1 design** | Rule 12 grades alignment between product and stated architecture. | The gaps are closed deliberately in Sprint 1 (`P-03`, `P-04`, `M-04`), and `INT-3` checks the alignment explicitly before delivery. |
| **We are new to Scrum and the ceremonies feel heavy** | Beginner teams quietly stop doing the parts that feel like overhead — usually the Retro and the board. | Stand-ups are async and three lines. Only Planning, Review, and Retro are synchronous, and they are timed. The board is graded evidence, so keeping it current is not optional. |
| **Estimates are unstable — only one calibration Sprint** | Our first velocity number is a guess dressed as data, and there is no third sprint to correct it in. | Sprint 1's velocity is treated as provisional. Sprint 2 re-forecasts from it and, because it is scheduled over capacity, publishes its **cut order in advance** (Part 9) so falling short is a planned outcome rather than a crisis. |
| **Arman is the single critical path** | Six of Sprint 1's blockers are his, and he carries roughly twice anyone else's points. If he stalls, five people stall behind him. | All of his blockers are scheduled on Aug 6–7, not Aug 8. He posts blocker status at the 13:00 stand-up specifically, not only at 22:00. The de-scope levers, in order: hand `P-02` to whoever is free, and defer `P-04` to Sprint 2 — expensive, since it re-opens every backend card, but survivable. |
| **Four of the six of us have never committed to this repository** | Two people wrote all sixteen commits so far. A first commit on day two of an eight-day project is a bad place to discover a broken environment. | `P-06` makes the app actually run on day one, before anyone needs it. WIP limit of **1** for everybody's first card. Pair on the first card rather than reading documentation alone. |
| **Sprint 1 effectively starts on day 2** | Planning is Aug 6 for a sprint that opened Aug 5, so a quarter of the sprint is gone before any card is pulled. | The focus factor is set at 0.78 rather than 0.85 to account for it, and Aug 5 is recorded in the calendar with zero planned points rather than being quietly back-filled. |
| **A stakeholder request lands mid-Sprint** | The brief says the stakeholder's requirements will vary. | New requests become backlog cards, never additions to a running Sprint. With 4-day Sprints nothing waits long. Only the PO talks to the TA, so requests arrive through one door. |

---

*This document describes the plan; [`sprint-calendar.md`](sprint-calendar.md) describes the days. When reality and the plan disagree, reality wins — record it in the calendar's log, raise it at the Retrospective, and change the plan. A plan serves the work, not the other way around.*
