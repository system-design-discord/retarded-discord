#!/usr/bin/env bash
#
# Part S.4 of execution-plan.md: turn backlog.tsv into GitHub issues, put them on
# the board, and set every board field. Idempotent — a card that already has an
# issue is updated in place, never duplicated, so this is safe to re-run every
# time backlog.tsv changes.
#
#   ./03-seed.sh                 # every card in backlog.tsv
#   ./03-seed.sh --sprint 1      # only Sprint 1
#   ./03-seed.sh --only P-01,P-04
#   DRY_RUN=1 ./03-seed.sh       # print, change nothing
#
# It does NOT set Status. The "item added to project -> Backlog" workflow does
# that, and Part S.4 asks the team to correct Status by hand to whatever is
# actually true at the moment of seeding.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
require_tools

BACKLOG="$HERE/backlog.tsv"
[[ -f "$BACKLOG" ]] || die "backlog.tsv not found next to this script"

FILTER_SPRINT=""
FILTER_IDS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --sprint) FILTER_SPRINT="$2"; shift 2 ;;
    --only)   FILTER_IDS=",$2," ; shift 2 ;;
    *) die "unknown argument: $1" ;;
  esac
done

# ------------------------------------------------------------- preflight checks
for name in "${!HANDLE[@]}"; do
  [[ "${HANDLE[$name]}" != "CHANGEME" ]] \
    || die "config.sh: GitHub login for $name is still CHANGEME"
  [[ -n "${HANDLE[$name]}" ]] \
    || skip "no GitHub login for $name — their cards are seeded unassigned"
done

# The board is optional here. Issues, labels, milestones and assignees are the
# substance; the board is a view over them. If the project does not exist yet,
# seed the issues anyway and re-run this script once it does — matching is by
# the "ID — " title prefix, so the second run attaches without duplicating.
number="$(project_number || true)"
HAVE_PROJECT=0
fields=""; PROJECT_ID=""; F_POINTS=""; F_PRIORITY=""; F_EPIC=""; F_SPRINT=""

if [[ -z "$number" ]]; then
  skip "project \"$PROJECT_TITLE\" not found — seeding issues only"
  echo "     Create the board (./02-project.sh, or by hand), then re-run this script"
  echo "     to add every card to it and set Story Points, Priority, Epic and Sprint."
else
  HAVE_PROJECT=1
  say "Reading board fields from project #$number"
  fields="$(project_fields_json "$number")"
  PROJECT_ID="$(jq -r .id <<<"$fields")"
  F_POINTS="$(field_id "$fields" "Story Points")"
  F_PRIORITY="$(field_id "$fields" "Priority")"
  F_EPIC="$(field_id "$fields" "Epic")"
  F_SPRINT="$(field_id "$fields" "Sprint")"

  [[ -n "$F_POINTS"   ]] || die "field 'Story Points' missing — run ./02-project.sh"
  [[ -n "$F_PRIORITY" ]] || die "field 'Priority' missing — run ./02-project.sh"
  [[ -n "$F_EPIC"     ]] || die "field 'Epic' missing — run ./02-project.sh"
  if [[ -z "$F_SPRINT" ]]; then
    skip "no 'Sprint' iteration field — cards will be seeded without a sprint"
    echo "     Create it in the UI (the API cannot), then re-run this script."
  fi
  ok "project id resolved, fields located"
fi

# ------------------------------------------------ what already exists on GitHub
say "Indexing existing issues and board items"

# card id -> issue number, parsed from the "ID — title" convention.
declare -A ISSUE_OF=()
while IFS=$'\t' read -r num title; do
  [[ -n "$num" ]] || continue
  ISSUE_OF["${title%% *}"]="$num"
done < <(gh issue list --repo "$NWO" --state all --limit 500 \
           --json number,title --jq '.[] | [.number, .title] | @tsv')

# issue number -> project item node id
declare -A ITEM_OF=()
if (( HAVE_PROJECT )); then
  while IFS=$'\t' read -r inum iid; do
    [[ -n "$inum" && "$inum" != "null" ]] || continue
    ITEM_OF["$inum"]="$iid"
  done < <(gh project item-list "$number" --owner "$ORG" --limit 500 --format json \
             --jq '.items[] | [(.content.number // "null"), .id] | @tsv')
fi

ok "${#ISSUE_OF[@]} issues, ${#ITEM_OF[@]} board items already present"

# ------------------------------------------------------------------- body maker
epic_label() {
  case "$1" in
    Accounts) echo "epic:accounts" ;;   Messaging) echo "epic:messaging" ;;
    Groups) echo "epic:groups" ;;       Channels) echo "epic:channels" ;;
    Roles) echo "epic:roles" ;;         Media) echo "epic:media" ;;
    Notifications) echo "epic:notifications" ;; Real-time) echo "epic:realtime" ;;
    Scheduling) echo "epic:scheduling" ;; Platform) echo "epic:platform" ;;
    Process) echo "epic:process" ;;     *) echo "" ;;
  esac
}

# bullets <semicolon-separated> <prefix>
bullets() {
  [[ "$1" == "-" || -z "$1" ]] && return 0
  local IFS=';' item
  set -f  # the cells contain globs (backend/*/, frontend/src/**)
  for item in $1; do
    [[ -n "$item" ]] && printf '%s%s\n' "$2" "$item"
  done
  set +f
}

make_body() {
  local id="$1" sprint="$2" owner="$3" points="$4" prio="$5" epic="$6"
  local stories="$7" files="$8" branch="$9" acceptance="${10}"
  local notes="${11}" blocks="${12}"

  local who="${HANDLE[$owner]}"
  if [[ -n "$who" ]]; then who="@$who ($owner)"; else who="$owner (not yet a collaborator — unassigned)"; fi

  printf '**Card** `%s` · **Sprint** %s · **Owner** %s · **Points** %s · **Priority** %s · **Epic** %s\n\n' \
    "$id" "$sprint" "$who" "$points" "$prio" "$epic"

  if [[ "$blocks" != "-" ]]; then
    printf '> **BLOCKER.** Nothing below can start until this is merged: %s\n\n' "${blocks//;/, }"
  fi

  if [[ "$stories" != "-" ]]; then
    printf '**User stories:** %s\n\n' "${stories//;/, }"
  fi

  if [[ "$notes" != "-" ]]; then
    printf '## Notes\n\n%s\n\n' "$notes"
  fi

  printf '## Acceptance criteria\n\n'
  if [[ "$acceptance" == "-" ]]; then
    printf '_Not yet written — this card is not Ready until it has them (DoR)._\n\n'
  else
    bullets "$acceptance" "- [ ] "; printf '\n'
  fi

  if [[ "$files" != "-" ]]; then
    printf '## Files to create or edit\n\n'
    local IFS=';' f
    set -f
    for f in $files; do [[ -n "$f" ]] && printf -- '- `%s`\n' "$f"; done
    set +f
    printf '\n'
  fi

  if [[ "$branch" != "-" ]]; then
    printf '## Branch\n\n`%s`\n\n' "$branch"
  fi

  cat <<'DOD'
## Definition of Done

- [ ] Code complete and merged to `main` through a pull request
- [ ] Manually tested against every acceptance criterion
- [ ] Reviewed and approved by at least one other teammate
- [ ] Passwords hashed, input validated at the API boundary, permissions enforced server-side
- [ ] Briefly documented (a README line or an API note)
- [ ] On the board in Done, linked to its pull request

<sub>Generated from <code>scripts/gh/backlog.tsv</code>. Edit the card there and re-run <code>scripts/gh/03-seed.sh</code>, or edit here and keep the file in sync.</sub>
DOD
}

# ------------------------------------------------------------------- field sets
set_field() {
  local item_id="$1" field_id="$2"; shift 2
  [[ -n "$field_id" ]] || return 0
  run gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" \
    --field-id "$field_id" "$@" >/dev/null
}

# --------------------------------------------------------------------- the loop
created=0; updated=0; skipped=0

while IFS=$'\t' read -r id type sprint owner points priority epic title stories files branch acceptance notes blocks <&3; do
  [[ -z "$id" || "$id" == \#* || "$id" == "id" ]] && continue
  [[ -n "$FILTER_SPRINT" && "$sprint" != "$FILTER_SPRINT" ]] && { skipped=$((skipped+1)); continue; }
  [[ -n "$FILTER_IDS" && "$FILTER_IDS" != *",$id,"* ]] && { skipped=$((skipped+1)); continue; }

  [[ -v "HANDLE[$owner]" ]] || die "$id: owner '$owner' is not in config.sh"
  handle="${HANDLE[$owner]}"
  notes="${notes:--}"; blocks="${blocks:--}"

  issue_title="$id — $title"
  body="$(make_body "$id" "$sprint" "$owner" "$points" "$priority" "$epic" \
                    "$stories" "$files" "$branch" "$acceptance" "$notes" "$blocks")"

  labels="type:$type,prio:$(tr '[:upper:]' '[:lower:]' <<<"${priority//\'/}"),pts:$points"
  el="$(epic_label "$epic")"; [[ -n "$el" ]] && labels="$labels,$el" || true
  [[ "$blocks" != "-" ]] && labels="$labels,blocker" || true

  issue_num="${ISSUE_OF[$id]:-}"

  if [[ -z "$issue_num" ]]; then
    say "$id  (new)"
    if [[ "$DRY_RUN" == "1" ]]; then
      printf '\033[2m  would create:\033[0m %s\n  labels: %s\n  milestone: Sprint %s  assignee: %s\n' \
        "$issue_title" "$labels" "$sprint" "${handle:-<none>}"
      created=$((created+1)); continue
    fi
    assign=(); [[ -n "$handle" ]] && assign=(--assignee "$handle") || true
    url="$(gh issue create --repo "$NWO" \
             --title "$issue_title" --body "$body" \
             --label "$labels" --milestone "Sprint $sprint" "${assign[@]}")"
    issue_num="${url##*/}"
    ok "issue #$issue_num"
    created=$((created+1))
  else
    say "$id  (issue #$issue_num, updating)"
    assign=(); [[ -n "$handle" ]] && assign=(--add-assignee "$handle") || true
    run gh issue edit "$issue_num" --repo "$NWO" \
      --title "$issue_title" --body "$body" \
      --add-label "$labels" --milestone "Sprint $sprint" "${assign[@]}" >/dev/null
    updated=$((updated+1))
  fi

  [[ "$DRY_RUN" == "1" ]] && continue

  # ---- board item
  (( HAVE_PROJECT )) || { ok "  issue ready (no board yet)"; continue; }
  item_id="${ITEM_OF[$issue_num]:-}"
  if [[ -z "$item_id" ]]; then
    item_id="$(gh project item-add "$number" --owner "$ORG" \
                 --url "https://github.com/$NWO/issues/$issue_num" \
                 --format json --jq .id)"
    ITEM_OF["$issue_num"]="$item_id"
  fi

  set_field "$item_id" "$F_POINTS" --number "$points"

  po="$(option_id "$fields" "Priority" "$priority")"
  [[ -n "$po" ]] && set_field "$item_id" "$F_PRIORITY" --single-select-option-id "$po" \
    || skip "  Priority option '$priority' not on the board"

  eo="$(option_id "$fields" "Epic" "$epic")"
  [[ -n "$eo" ]] && set_field "$item_id" "$F_EPIC" --single-select-option-id "$eo" \
    || skip "  Epic option '$epic' not on the board"

  if [[ -n "$F_SPRINT" ]]; then
    it="$(iteration_id "$fields" "Sprint" "Sprint $sprint")"
    [[ -n "$it" ]] && set_field "$item_id" "$F_SPRINT" --iteration-id "$it" \
      || skip "  iteration 'Sprint $sprint' not found"
  fi

  ok "  board fields set"
done 3< "$BACKLOG"

say "Created $created, updated $updated, skipped $skipped"
if (( HAVE_PROJECT )); then
  echo "   https://github.com/orgs/$ORG/projects/$number"
else
  echo "   https://github.com/$NWO/issues"
  skip "no board yet — re-run this script after creating it to attach every card"
fi
