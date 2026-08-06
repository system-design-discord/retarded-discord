#!/usr/bin/env bash
#
# Part S.1 of execution-plan.md: repository settings, labels, milestones.
# Idempotent — safe to re-run.
#
# There is deliberately NO branch protection here. `main` is unprotected, any
# member can merge their own pull request, and no status check is required.
# The pull request and the teammate review are still in the Definition of Done
# (Part 4) — they are a team agreement, not a gate the platform enforces.
#
#   ./01-repo.sh              # do it
#   DRY_RUN=1 ./01-repo.sh    # print what would happen, change nothing

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_tools

# ---------------------------------------------------------------- repo settings
say "Repository settings on $NWO"

# Rule 9 of the brief: the TAs must be able to see it.
visibility="$(gh repo view "$NWO" --json visibility --jq .visibility)"
if [[ "$visibility" == "PUBLIC" ]]; then
  skip "already public"
else
  run gh repo edit "$NWO" --visibility public --accept-visibility-change-consequences
  ok "made public"
fi

# Squash-only merges + auto-delete of head branches (Part 6).
run gh repo edit "$NWO" \
  --enable-squash-merge \
  --enable-merge-commit=false \
  --enable-rebase-merge=false \
  --delete-branch-on-merge \
  --enable-issues \
  --enable-projects
ok "merge strategy and branch cleanup configured"

# Stale branch from before the plan (Part S.1 step 3).
if gh api "repos/$NWO/git/ref/heads/feature/my-first-task" >/dev/null 2>&1; then
  run gh api -X DELETE "repos/$NWO/git/refs/heads/feature/my-first-task"
  ok "deleted stale branch feature/my-first-task"
else
  skip "feature/my-first-task already gone"
fi

# ----------------------------------------------------- confirm main is un-gated
say "Branch rules on main"
if gh api "repos/$NWO/branches/main/protection" >/dev/null 2>&1; then
  skip "a protection rule exists on main — this plan does not use one"
  echo "     Remove it at https://github.com/$NWO/settings/branches"
  echo "     (also check Settings -> Rules -> Rulesets, which this cannot see)"
else
  ok "main is unprotected — anyone can merge, no required review, no required check"
fi

# ------------------------------------------------------------------------ labels
say "Labels"

# name|colour|description
labels=(
  "epic:accounts|1D76DB|Accounts & identity"
  "epic:messaging|1D76DB|Messaging"
  "epic:groups|1D76DB|Groups"
  "epic:channels|1D76DB|Channels & topics"
  "epic:roles|1D76DB|Roles & access control"
  "epic:media|1D76DB|Media"
  "epic:notifications|1D76DB|Notifications"
  "epic:realtime|1D76DB|Real-time gateway"
  "epic:scheduling|1D76DB|Scheduling & background jobs"
  "epic:platform|5319E7|Infrastructure, build, CI, app shell"
  "epic:process|5319E7|Board, backlog, verification, reports"
  "type:story|0E8A16|A user-facing capability"
  "type:task|0E8A16|Technical work behind a story"
  "type:spike|0E8A16|Time-boxed investigation"
  "type:bug|D93F0B|Does not match its acceptance criteria"
  "type:chore|0E8A16|Tooling, CI, config"
  "prio:must|B60205|Mandatory product"
  "prio:nice|FBCA04|Bonus — only after Must is green"
  "prio:wont|C5DEF5|Parked, not this release"
  "pts:1|EDEDED|1 story point"
  "pts:2|EDEDED|2 story points"
  "pts:3|EDEDED|3 story points"
  "pts:5|EDEDED|5 story points"
  "pts:8|EDEDED|8 story points"
  "pts:13|EDEDED|13 story points"
  "blocker|B60205|Other cards cannot start until this lands"
  "blocked|000000|Waiting on something else"
)

for spec in "${labels[@]}"; do
  IFS='|' read -r name colour desc <<<"$spec"
  # --force turns create into upsert, which is what makes this re-runnable.
  run gh label create "$name" --repo "$NWO" --color "$colour" --description "$desc" --force >/dev/null
done
ok "${#labels[@]} labels created or updated"

# -------------------------------------------------------------------- milestones
say "Milestones"

existing_milestones="$(gh api "repos/$NWO/milestones?state=all&per_page=100" --jq '.[].title')"

create_milestone() {
  local title="$1" due="$2"
  if grep -qxF "$title" <<<"$existing_milestones"; then
    skip "$title exists"
    return
  fi
  run gh api -X POST "repos/$NWO/milestones" \
    -f title="$title" \
    -f state="open" \
    -f due_on="${due}T18:00:00Z" \
    -f description="Sprint ending $due. See execution-plan.md." >/dev/null
  ok "$title"
}

create_milestone "Sprint 1" "$SPRINT_1_DUE"
create_milestone "Sprint 2" "$SPRINT_2_DUE"

say "Done. Next: ./02-project.sh"
