#!/bin/sh
# Everything that has to be true before daphne answers a request.
#
# This file must keep LF line endings. `.gitattributes` enforces that on
# checkout and the Dockerfile strips CR at build time, because a `\r` here is
# reported by Docker as "exec /entrypoint.sh: no such file or directory" — a
# message that says nothing about line endings and sends people looking at the
# wrong file. See ../.gitattributes.
set -e

# --- 1. Wait for PostgreSQL -------------------------------------------------
# compose already gates this container on the db healthcheck, so normally the
# loop below succeeds first time. It exists for the two cases the healthcheck
# does not cover: a bare `docker run` with no compose dependency, and the brief
# window on a first-ever start where postgres' bootstrap server answers
# pg_isready over the unix socket before the real server is listening on TCP.
# On a slow machine — which in practice means Docker Desktop on Windows — that
# window is wide enough to lose a race that never loses on Linux.
#
# `DJANGO_SETTINGS_MODULE` is set the way manage.py sets it, because this runs
# `python` directly: without it django.setup() raises ImproperlyConfigured, and
# a connectivity check that fails for its own reasons waits forever for a
# database that is already up.
db_ready() {
    python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.db import connections
connections['default'].cursor()
" "$@"
}

attempt=1
max_attempts=${DJANGO_DB_WAIT_ATTEMPTS:-30}

until db_ready >/dev/null 2>&1; do
    if [ "$attempt" -ge "$max_attempts" ]; then
        echo "entrypoint: database still unreachable after ${max_attempts} attempts" >&2
        # Once more without swallowing stderr, so the log says why.
        db_ready
        exit 1
    fi
    echo "entrypoint: waiting for the database (${attempt}/${max_attempts})..."
    attempt=$((attempt + 1))
    sleep 2
done

# --- 2. Schema and static files ---------------------------------------------
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# --- 3. Demo data -----------------------------------------------------------
# The three accounts the README tells a grader to sign in with. Seeding is
# idempotent, so running it on every start is free, and it is what makes
# `docker compose up` alone enough — the seed used to be a second command that
# could not run at all while this script was failing, which is why "docker is
# broken" and "there is no such user" were the same bug reported twice.
# Set DJANGO_SEED_DATA=false in .env to keep the database empty.
if [ "${DJANGO_SEED_DATA:-true}" = "true" ]; then
    python manage.py seed_data
fi

exec "$@"
