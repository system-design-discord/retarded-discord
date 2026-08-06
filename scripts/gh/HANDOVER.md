# GitHub setup — what is done, and what is left for you

Snapshot taken **Aug 6, 2026**. `README.md` is the general runbook; this file is
the state of *this* setup and the specific actions still outstanding.

---

## Already done (no action needed)

| | |
|---|---|
| **Milestones** | `Sprint 1` (due Aug 8) and `Sprint 2` (due Aug 12) created. |
| **Labels** | 27 created — `epic:*` ×11, `type:*` ×5, `prio:*` ×3, `pts:*` ×6, plus `blocker` and `blocked`. |
| **Merge settings** | Squash-only merges; merge commits and rebase merges disabled; head branches auto-delete on merge; issues and projects enabled. |
| **Stale branch** | `feature/my-first-task` deleted from the remote. |
| **Issues** | All **71 cards** in `backlog.tsv` created as issues titled `ID — Title`, each carrying a blocker banner where applicable, the user stories it serves, the notes, the acceptance criteria, the files to touch, the branch name, and the Definition of Done checklist. 27 to `Sprint 1`, 44 to `Sprint 2`. |
| **Assignments** | Arman 18 · Arvin 12 · Majid 12 · Ali 11 · Amirhossein 10. **Amir's 8 cards are unassigned** — see step 2. |
| **Blockers** | 13 cards labelled `blocker`, each naming what it blocks: `F-01` `P-06` `P-01` `P-03` `P-04` `R-01` `R-04` `G-02` `P-02` `C-01` `M-01` `F-00` `N-01`. |
| **Tooling committed** | Branch `chore/g-01-repo-setup` pushed with `.github/`, `scripts/gh/`, `execution-plan.md` and `sprint-calendar.md`; **PR #72** open against `main`, closing the `G-01` issue. It is waiting on a teammate's review — do not self-merge it. |
| **Branch protection** | **None, deliberately.** `main` takes direct pushes and anyone can merge. See `execution-plan.md` Part 0, deviation 3. |

---

## Left for you — in this order

### 1. Make the repository public — **blocking, brief Rule 9**

The TAs must be able to see it. It is currently **private**.

> `github.com/system-design-discord/retarded-discord` → **Settings** → scroll to
> **Danger Zone** → **Change visibility** → **Make public** → confirm.

Or from a shell:

```bash
gh repo edit system-design-discord/retarded-discord \
  --visibility public --accept-visibility-change-consequences
```

### 2. Add the two missing people

Only `iMajid27`, `amirhoseinshayan`, `arvintaheri` and `OstadTahmasb` are
collaborators. `ali-mansourian` accepted assignment anyway (he is a contributor),
so his 11 cards are assigned — but add him properly so he can push:

> `github.com/system-design-discord/retarded-discord` → **Settings** →
> **Collaborators and teams** → **Add people** → `ali-mansourian`, **Write**.

**Amir has no known GitHub login at all**, so his eight cards — `F-00`, `F-02`,
`F-03`, `F-04`, `F-05`, `F-07`, `F-08`, `U-09` — were seeded unassigned. Get his
username, put it in `config.sh`:

```bash
$EDITOR scripts/gh/config.sh        # [Amir]="his-login"
```

add him as a collaborator the same way, and re-run the seeder so his eight cards
pick up an assignee:

```bash
cd scripts/gh && ./03-seed.sh
```

> **Why it matters:** brief Rule 6 grades participation, and the board is the
> evidence. Eight unassigned cards read as one person doing nothing.
>
> ```bash
> gh issue list --repo system-design-discord/retarded-discord \
>   --search 'no:assignee' --limit 100
> ```

### 3. Create the project board — **blocking, brief Rule 10**

`gh project create` was refused: `OstadTahmasb does not have permission to create
projects on this owner`. You are a repo collaborator but **not an org member**,
and org project creation needs one of those. Two ways forward:

**(a) Fix the permission, then let the script do it** — preferred, since it also
creates the fields:

> `github.com/orgs/system-design-discord/people` → **Invite member** →
> `OstadTahmasb` → accept the invite.
> Then `github.com/organizations/system-design-discord/settings/member_privileges`
> → **Members can create projects** → set to **Read and write** (or **Write**).

```bash
cd scripts/gh && ./02-project.sh
```

**(b) Create it by hand:**

> `github.com/orgs/system-design-discord/projects` → **New project** → **Table** →
> name it exactly **`Discord Clone — Scrum Board`** (the em-dash matters —
> `02-project.sh` and `03-seed.sh` look it up by title).
> Then `...` → **Settings** → **Visibility: Public**, and **Manage access** →
> link the `retarded-discord` repository.

**(c) Fallback — create it under your own account.** If org permissions cannot
be sorted quickly, a personal Projects v2 board linked to the repository works
identically for grading: it appears on the repo's **Projects** tab and can be
made public. `gh project create --owner @me --title "Discord Clone — Scrum Board"`,
then set `ORG` handling aside and link it by hand. The cost is that the board is
owned by one person rather than the team, and Projects v2 boards cannot be
re-parented later without re-creating them — so try (a) first.

Whichever route, then add the three fields (`02-project.sh` does these for you):

| Field | Type | Options |
|---|---|---|
| `Story Points` | Number | — |
| `Priority` | Single select | `Must`, `Nice`, `Won't` |
| `Epic` | Single select | `Accounts`, `Messaging`, `Groups`, `Channels`, `Roles`, `Media`, `Notifications`, `Real-time`, `Scheduling`, `Platform`, `Process` |

### 4. Fix the Status ladder — UI only

The board ships with `Todo` / `In Progress` / `Done`.

> `...` → **Settings** → **Status** → rename `Todo` to **`To Do`**, add
> **`Backlog`**, **`Ready`**, **`In Review`**, then drag into this order:
>
> `Backlog · Ready · To Do · In Progress · In Review · Done`

Order matters — it is the left-to-right column order on the board.

*Not scripted because `updateProjectV2Field` can rewrite single-select options but
is known to drop existing values off items already using them.*

### 5. Create the `Sprint` iteration field — UI only, **do this before step 7**

> **Settings** → **+ New field** → name **`Sprint`**, type **Iteration**,
> duration **4 days**, start date **2026-08-05**.

That auto-generates `Sprint 1` (Aug 5–8) and `Sprint 2` (Aug 9–12). Delete any
third iteration it offers.

*Iteration fields cannot be created from the API at all — `gh project
field-create` accepts only `TEXT`, `NUMBER`, `DATE` and `SINGLE_SELECT`.*

### 6. Enable the four workflows — UI only

> `...` → **Workflows**

| Workflow | Configure | |
|---|---|---|
| Item added to project | set **Status = Backlog** | enable |
| Item closed | set **Status = Done** | enable |
| Pull request merged | set **Status = Done** | enable |
| Auto-add to project | repo `retarded-discord`, filter `is:issue` | enable |

The last one means an issue filed mid-sprint from a template lands on the board
without anyone remembering to add it. *No API surface whatsoever for these.*

### 7. Attach every card to the board

Once steps 3–5 exist:

```bash
cd scripts/gh && ./03-seed.sh
```

It matches existing issues by the `ID — ` title prefix, so nothing is
duplicated; it adds each one to the board and sets Story Points, Priority, Epic
and Sprint.

> **Never rename an issue's `ID — ` prefix in the UI.** That orphans the card and
> the next run files a duplicate.

### 8. Create the four views — UI only

> The `+` next to the view tabs.

| View | Layout | Configuration |
|---|---|---|
| **Board** | Board | Group by **Status**. Leave it first — it is the default a grader sees. |
| **Sprint Backlog** | Board | Filter `sprint:@current`, group by **Status** |
| **My Work** | Table | Filter `assignee:@me` |
| **Blockers** | Table | Filter `label:blocker`, sort by Sprint |

Then **Insights** (left sidebar) → **New chart** → layout **Burn up**, X-axis
**time**, filter `sprint:@current`, save as **`Burn-up`**. This is the burndown
`methodology.md` §6.9 requires and it is graded evidence.

### 9. Set every card's Status honestly

The seeder deliberately leaves Status alone, so everything lands in `Backlog`.
Before Planning, move each card to where it actually is. `execution-plan.md`
Part S.4: **the board must reflect reality from the first minute** — a board that
starts as a wish-list and gets corrected later is worse than one that starts
honest.

### 10. Commit and push the tooling

Done — branch `chore/g-01-repo-setup` is pushed and **PR #72** is open. It needs
one teammate's approval before it lands. Do not self-merge it: nothing on GitHub
stops you, and that is exactly the rule `execution-plan.md` Part 6 asks us to
keep anyway.

Any local editor or tooling scratch files you do not want in a public repository
belong in `.git/info/exclude`, not `.gitignore` — the exclude file is local-only
and never pushed.

### 11. Confirm with the TA — *Arvin, card `B-02`*

- The exact delivery zip filename. `SD_PROJ_GP<NUM>_PHASE2.zip` is the Phase 1
  pattern; the brief does not state it for Phase 2.
- Our group number.

### 12. Check no ruleset exists

> **Settings** → **Rules** → **Rulesets** should be empty.

`gh` cannot reliably see org-level rulesets, and one would silently reimpose the
required-review gate this plan deliberately removed.

---

## Verifying it worked

```bash
NWO=system-design-discord/retarded-discord

gh repo view  $NWO --json visibility --jq .visibility      # PUBLIC
gh api repos/$NWO/milestones --jq '.[].title'              # Sprint 1, Sprint 2
gh issue list --repo $NWO --limit 200 --json number | jq length
gh issue list --repo $NWO --search 'no:assignee' --limit 100 \
  --json number,title --jq '.[].title'                     # should be Amir's only
gh api repos/$NWO/branches/main/protection                 # 404 — this is correct
```

And, logged out in a private window, the board should be reachable both from
`github.com/orgs/system-design-discord/projects/<n>` and from the repository's
**Projects** tab.
