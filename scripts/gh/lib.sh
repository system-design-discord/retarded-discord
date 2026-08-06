#!/usr/bin/env bash
# Common helpers. Sourced by the numbered scripts; not meant to be run directly.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$HERE/config.sh"

DRY_RUN="${DRY_RUN:-0}"

say()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m  ok\033[0m %s\n' "$*"; }
skip() { printf '\033[1;33m  --\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# Run a command, or just print it when DRY_RUN=1.
run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '\033[2m  would run:\033[0m %s\n' "$*"
    return 0
  fi
  "$@"
}

require_tools() {
  command -v gh >/dev/null 2>&1 || die "gh is not installed. See scripts/gh/README.md."
  command -v jq >/dev/null 2>&1 || die "jq is not installed."
  gh auth status >/dev/null 2>&1 || die "gh is not authenticated. Run: gh auth login"
  # Projects v2 lives behind its own scope; without it every project call 404s.
  if ! gh auth status 2>&1 | grep -q "'project'"; then
    die "your token lacks the 'project' scope. Run: gh auth refresh -s project,read:project"
  fi
}

# Resolve the project number from its title. Projects v2 is addressed by number,
# but the number is assigned at creation, so we look it up rather than hardcode it.
project_number() {
  gh project list --owner "$ORG" --format json \
    | jq -r --arg t "$PROJECT_TITLE" '.projects[] | select(.title == $t) | .number' \
    | head -n1
}

# Fetch the project's node id plus every field (with single-select option ids and
# iteration ids) in one GraphQL call.
#
# We query GraphQL directly rather than parsing `gh project field-list`, because
# field-list does not expose iteration configuration and its JSON shape has
# changed between gh releases.
project_fields_json() {
  local number="$1"
  gh api graphql -f query='
    query($org: String!, $number: Int!) {
      organization(login: $org) {
        projectV2(number: $number) {
          id
          title
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field { id name dataType }
              ... on ProjectV2SingleSelectField {
                id name dataType options { id name }
              }
              ... on ProjectV2IterationField {
                id name dataType
                configuration {
                  iterations { id title startDate duration }
                  completedIterations { id title startDate duration }
                }
              }
            }
          }
        }
      }
    }' -f org="$ORG" -F number="$number" --jq '.data.organization.projectV2'
}

# field_id <fields-json> <field name>
field_id() {
  jq -r --arg n "$2" '.fields.nodes[] | select(.name == $n) | .id' <<<"$1"
}

# option_id <fields-json> <field name> <option name>
option_id() {
  jq -r --arg f "$2" --arg o "$3" \
    '.fields.nodes[] | select(.name == $f) | .options[]? | select(.name == $o) | .id' <<<"$1"
}

# iteration_id <fields-json> <field name> <iteration title>
# Looks in both current and completed iterations so re-seeding mid-project works.
iteration_id() {
  jq -r --arg f "$2" --arg i "$3" '
    .fields.nodes[] | select(.name == $f) | .configuration
    | (.iterations + .completedIterations)[]
    | select(.title == $i) | .id' <<<"$1"
}
