#!/usr/bin/env bash
#
# Part S.3 of execution-plan.md: create the Projects v2 board, link it to the
# repository, and add every field the API is able to add. Idempotent.
#
# Two things the GitHub API genuinely cannot do, and this script will not
# pretend otherwise — it detects them and prints the exact UI steps instead:
#
#   1. Iteration fields cannot be created via the API. `gh project field-create`
#      accepts only TEXT, NUMBER, DATE and SINGLE_SELECT.
#   2. The built-in Status field's options cannot be safely rewritten via the
#      API, and the built-in workflows (auto-add, merged -> Done) have no API
#      surface at all.
#
#   ./02-project.sh
#   DRY_RUN=1 ./02-project.sh

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_tools

WANTED_STATUS=(Backlog Ready "To Do" "In Progress" "In Review" Done)

# ------------------------------------------------------------ create or find it
say "Project \"$PROJECT_TITLE\" under @$ORG"

number="$(project_number || true)"
if [[ -n "$number" ]]; then
  skip "already exists as project #$number"
else
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '\033[2m  would run:\033[0m gh project create --owner %s --title "%s"\n' "$ORG" "$PROJECT_TITLE"
    exit 0
  fi
  number="$(gh project create --owner "$ORG" --title "$PROJECT_TITLE" --format json --jq .number)"
  ok "created project #$number"
fi

# ------------------------------------------------------------------- visibility
# Org projects are created PRIVATE and `gh project create` has no visibility
# flag, so a freshly created board is invisible to anyone outside the org —
# including the TAs. Brief Rule 9 requires them to see it.
say "Making project #$number public"
run gh project edit "$number" --owner "$ORG" --visibility PUBLIC >/dev/null
run gh project edit "$number" --owner "$ORG" \
  --description "Scrum board for the Phase 2 build. Two 4-day sprints, Aug 5-12 2026." >/dev/null
ok "public"

# ------------------------------------------------------------------------- link
# Linking is what lets `gh issue create --project` and the repo's Projects tab
# find the board, and it is what makes the board visible from the repository
# page — which is how a grader will arrive at it.
say "Linking project #$number to $NWO"
if run gh project link "$number" --owner "$ORG" --repo "$NWO" >/dev/null 2>&1; then
  ok "linked"
else
  skip "already linked (or link failed — check the Projects tab on the repo)"
fi

# ----------------------------------------------------------------------- fields
say "Fields"

fields="$(project_fields_json "$number")"
have_field() { [[ -n "$(field_id "$fields" "$1")" ]]; }

create_field() {
  local name="$1" type="$2" options="${3:-}"
  if have_field "$name"; then
    skip "$name exists"
    return
  fi
  if [[ -n "$options" ]]; then
    run gh project field-create "$number" --owner "$ORG" \
      --name "$name" --data-type "$type" --single-select-options "$options" >/dev/null
  else
    run gh project field-create "$number" --owner "$ORG" \
      --name "$name" --data-type "$type" >/dev/null
  fi
  ok "$name ($type)"
}

create_field "Story Points" NUMBER
create_field "Priority" SINGLE_SELECT "Must,Nice,Won't"
create_field "Epic" SINGLE_SELECT "Accounts,Messaging,Groups,Channels,Roles,Media,Notifications,Real-time,Scheduling,Platform,Process"

# Refresh after creating.
[[ "$DRY_RUN" == "1" ]] || fields="$(project_fields_json "$number")"

# --------------------------------------------------- what the API cannot set up
manual=()

# Status: the board ships with Todo / In Progress / Done.
missing_status=()
for opt in "${WANTED_STATUS[@]}"; do
  [[ -n "$(option_id "$fields" "Status" "$opt")" ]] || missing_status+=("$opt")
done
if (( ${#missing_status[@]} )); then
  manual+=("Status field — add the missing options: ${missing_status[*]}
     Project -> ... -> Settings -> Status -> add options so the ladder reads
     Backlog, Ready, To Do, In Progress, In Review, Done (in that order).
     Do this in the UI: updateProjectV2Field can drop existing values off items.")
fi

# Sprint: iteration fields are UI-only.
if have_field "Sprint"; then
  for it in "Sprint 1" "Sprint 2"; do
    [[ -n "$(iteration_id "$fields" "Sprint" "$it")" ]] \
      || manual+=("Sprint iteration \"$it\" is missing — add iterations until both exist.")
  done
else
  manual+=("Sprint field — create it by hand (the API cannot create iteration fields):
     Project -> ... -> Settings -> + New field -> name \"Sprint\", type Iteration,
     duration 4 days, starting $SPRINT_START. That auto-generates Sprint 1 and Sprint 2.")
fi

manual+=("Built-in workflows — Project -> ... -> Workflows (no API exists for these):
     * Item added to project        -> set Status = Backlog   [enable]
     * Issue closed                 -> set Status = Done      [enable]
     * Pull request merged          -> set Status = Done      [enable]
     * Auto-add to project          -> repo $NWO, filter: is:issue [enable]")

manual+=("Views — Project -> + (new view):
     * \"Board\"          Board layout, grouped by Status        (default view)
     * \"Sprint Backlog\" Board layout, filter: sprint:@current, grouped by Status
     * \"My Work\"        Table layout, filter: assignee:@me
     * Insights -> new chart -> Burn up, over the current iteration")

say "Manual steps left (the API cannot do these)"
project_url="https://github.com/orgs/$ORG/projects/$number"
echo "   $project_url"
echo
for m in "${manual[@]}"; do
  printf '  \033[1;33m*\033[0m %s\n\n' "$m"
done

say "Once Sprint/Status exist, run: ./03-seed.sh"
