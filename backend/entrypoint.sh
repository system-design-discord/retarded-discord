#!/bin/sh
# Bring the schema up to date before serving. compose already waits for the
# database to report healthy, so this does not need its own retry loop.
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
