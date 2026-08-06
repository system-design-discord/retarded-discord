# GitHub setup — runbook

Automates Part S of `execution-plan.md`: repository settings, labels, milestones,
the Projects v2 board, and every backlog card as an issue.

Run once, by **one person** (cards `G-01` and `G-02`). Everything is idempotent,
so re-running after editing `backlog.tsv` updates instead of duplicating.

> **There is no branch protection in this setup, by design.** `main` is open,
> anybody can merge their own pull request, and no status check is required.
> The pull request and the teammate review are still in the Definition of Done
> (`execution-plan.md` Part 4) — they are a team agreement, not a gate the
> platform enforces.

## 0. Prerequisites

```bash
gh --version                       # 2.40+ ; this was written against 2.97
gh auth login                      # if not already
gh auth refresh -s project         # REQUIRED — Projects v2 has its own scope
```

Without the `project` scope every `gh project` call fails with
`your authentication token is missing required scopes [read:project]`.

You need **admin on the repository** and permission to create projects in the
`system-design-discord` org.

Two things to settle in the browser before anything runs:

- **All six members must be collaborators** with write access, at
  `github.com/orgs/system-design-discord/people` → **Invite member**, then
  repo → Settings → Collaborators. GitHub silently ignores an `--assignee` who
  lacks push access, so seeding before everyone has accepted leaves cards
  unassigned. `config.sh` currently has an **empty handle for Amir** — his cards
  seed unassigned on purpose; fill it in and re-run once you have his login.
- **Org → Settings → Member privileges → Base permissions** must allow project
  creation. If "Members can create projects" is off, an org owner runs step 2.

Check the six GitHub logins before running anything:

```bash
grep -A8 'declare -A HANDLE' config.sh
```

## 1. Repository, labels, milestones

```bash
cd scripts/gh
DRY_RUN=1 ./01-repo.sh             # look at what it will do first
./01-repo.sh
```

This makes the repo **public** (brief Rule 9 — the TAs must be able to see it),
turns on squash-only merges and auto-delete of merged branches, deletes the
stale `feature/my-first-task` branch, creates 27 labels and the two sprint
milestones. It also *checks* that `main` carries no protection rule and tells
you where to remove one if it finds it.

## 2. The board

```bash
./02-project.sh
```

Creates the project **"Discord Clone — Scrum Board"** under the org, makes it
public, links it to the repo, and adds the `Story Points`, `Priority` and `Epic`
fields.

It then prints the steps the GitHub API **cannot** do — the checklist below.
Budget about ten minutes.

## 2b. The UI checklist

These are real API limits, not gaps in the scripts. Work through them in order at
`https://github.com/orgs/system-design-discord/projects/<n>`.

**① Status options** — `...` (top right) → **Settings** → **Status**

The board ships with `Todo` / `In Progress` / `Done`. Make it read, top to bottom:

```
Backlog · Ready · To Do · In Progress · In Review · Done
```

Rename `Todo` → `To Do`, add `Backlog`, `Ready`, `In Review`, then drag into that
order. Order matters — it is the left-to-right column order on the board.

> Done by hand because `updateProjectV2Field` can rewrite single-select options
> but is known to drop existing values off items that already use them.

**② The `Sprint` iteration field** — Settings → **+ New field**

Name `Sprint`, type **Iteration**, duration **4 days**, starting **2026-08-05**.
That auto-generates `Sprint 1` (Aug 5–8) and `Sprint 2` (Aug 9–12). Delete any
third iteration it offers.

> `gh project field-create` accepts only `TEXT`, `NUMBER`, `DATE`, `SINGLE_SELECT`.
> Iteration fields cannot be created from the API at all.

**Do this one before step 3**, or cards seed with no sprint and you re-run.

**③ Workflows** — `...` → **Workflows**. Enable four:

| Workflow | Configure |
|---|---|
| Item added to project | set **Status = Backlog** |
| Item closed | set **Status = Done** |
| Pull request merged | set **Status = Done** |
| Auto-add to project | repo `retarded-discord`, filter `is:issue` |

The last one means an issue filed mid-sprint from a template lands on the board
without anyone remembering to add it.

> No API surface whatsoever for these.

**④ Views** — the `+` next to the view tabs

| View | Layout | Configuration |
|---|---|---|
| **Board** | Board | Group by **Status**. Leave it first — it is the default a grader sees. |
| **Sprint Backlog** | Board | Filter `sprint:@current`, group by **Status** |
| **My Work** | Table | Filter `assignee:@me` |
| **Blockers** | Table | Filter `label:blocker`, sort by Sprint |

Then **Insights** (left sidebar) → **New chart** → layout **Burn up**, X-axis
**time**, filter `sprint:@current`. This is the burndown required by
`methodology.md` §6.9. Save it as `Burn-up`.

**⑤ After seeding — correct every Status.** Part S.4: the board must reflect
reality from the first minute. The seeder deliberately leaves Status alone, so
everything lands in `Backlog`; move each card to where it actually is.

## 3. Seed the backlog

```bash
DRY_RUN=1 ./03-seed.sh             # preview every card
./03-seed.sh --sprint 1            # or seed one sprint at a time
./03-seed.sh
```

For each row of `backlog.tsv` this creates an issue titled `ID — Title` with a
generated body (a blocker banner where applicable, the user stories, the notes,
the acceptance criteria, the files, the branch, and the DoD checklist), applies
the `type:` / `prio:` / `pts:` / `epic:` / `blocker` labels, sets the milestone
and assignee, adds it to the board, and sets Story Points, Priority, Epic and
Sprint.

It does **not** set Status — the "item added → Backlog" workflow does that, and
Part S.4 asks you to then correct Status by hand to whatever is actually true.

A card whose owner has an empty handle in `config.sh` is created **unassigned**
and says so in its body.

## Editing the backlog afterwards

`backlog.tsv` is the source. Change a row, re-run:

```bash
./03-seed.sh --only P-04,M-08
```

Matching is by the `ID — ` title prefix, so **don't rename an issue's ID prefix**
in the GitHub UI — that orphans it and the next run creates a duplicate.

New cards discovered mid-sprint can be filed straight from the issue templates
(`.github/ISSUE_TEMPLATE/`); add them to `backlog.tsv` afterwards so the file
stays the record of the whole backlog.

## Files

| File | What it is |
|---|---|
| `config.sh` | Org, repo, project title, sprint dates, name → GitHub login map. **Edit this first.** |
| `lib.sh` | Shared helpers; GraphQL field/option/iteration lookup. Not run directly. |
| `01-repo.sh` | Repo settings, labels, milestones. No branch protection. |
| `02-project.sh` | Project creation, repo link, fields; prints the UI-only steps. |
| `03-seed.sh` | `backlog.tsv` → issues → board items → field values. |
| `backlog.tsv` | Every card from Parts 8–9 of `execution-plan.md`. Tab-separated. |

Every script honours `DRY_RUN=1`.
