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

# Media is a shared volume owned by this user; see docker-compose.yml.
RUN useradd --create-home --uid 1000 app \
    && mkdir -p /app/media /app/staticfiles \
    && chown -R app:app /app
USER app

EXPOSE 8000

COPY --chown=app:app entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

# daphne, not gunicorn: /ws needs ASGI.
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
