FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first so the layer caches across source changes.
# INSTALL_DEV adds pytest and ruff; docker-compose.yml turns it on so that
# `docker compose exec backend pytest` works. A bare `docker build` stays lean.
ARG INSTALL_DEV=false
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && if [ "$INSTALL_DEV" = "true" ]; then pip install --no-cache-dir -r requirements-dev.txt; fi

COPY . .

# The entrypoint is copied and repaired **as root**, before the unprivileged
# user takes over, and both halves of that matter.
#
# `sed` strips carriage returns: a clone made on Windows before .gitattributes
# existed carries CRLF, and a `\r` on the shebang makes Docker answer
# "exec /entrypoint.sh: no such file or directory". `chmod` restores the
# executable bit, which the Windows filesystem does not have to give back.
# Together they mean the image builds correctly from a working tree in any
# state, on any host — .gitattributes fixes the cause, this fixes the clones
# that already exist.
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh \
    && chmod 0755 /entrypoint.sh

# Media is a shared volume owned by this user; see docker-compose.yml.
#
# The uid is a build argument because ./backend is bind-mounted: on Linux the
# container writes to the host's files as this uid, so a developer whose
# account is not 1000 gets permission errors from anything that writes into the
# source tree (pytest's cache, most visibly). Set APP_UID/APP_GID in .env to
# `id -u`/`id -g` if that is you. Docker Desktop on Windows and macOS
# translates ownership at the mount, so the default is right there.
ARG APP_UID=1000
ARG APP_GID=1000
RUN groupadd --gid "$APP_GID" app || true \
    && useradd --create-home --no-log-init --uid "$APP_UID" --gid "$APP_GID" app \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R "$APP_UID:$APP_GID" /app
USER app

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]

# daphne, not gunicorn: /ws needs ASGI.
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
