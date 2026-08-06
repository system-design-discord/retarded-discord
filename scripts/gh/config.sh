#!/usr/bin/env bash
# Shared configuration for the GitHub bootstrap scripts.
# Edit this file first — everything else reads from it.

ORG="system-design-discord"
REPO="retarded-discord"
NWO="$ORG/$REPO"

PROJECT_TITLE="Discord Clone — Scrum Board"

# Sprint boundaries (Parts 8-9 of execution-plan.md). Used for milestone due dates.
# Two 4-day sprints: Aug 5-8 and Aug 9-12, 2026.
SPRINT_1_DUE="2026-08-08"
SPRINT_2_DUE="2026-08-12"

# First day of Sprint 1. The Sprint iteration field on the board starts here.
SPRINT_START="2026-08-05"

# Map the names used in execution-plan.md and backlog.tsv to GitHub logins.
# An empty value is allowed and means "seed the card with no assignee" — use it
# for a member who is not yet a collaborator on the repository.
declare -A HANDLE=(
  [Arman]="OstadTahmasb"
  [Amirhossein]="amirhoseinshayan"
  [Amir]=""
  [Ali]="ali-mansourian"
  [Arvin]="arvintaheri"
  [Majid]="iMajid27"
)
