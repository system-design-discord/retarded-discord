from django.conf import settings

from config.celery import app


def test_celery_uses_the_configured_rabbitmq_broker():
    assert app.conf.broker_url == settings.CELERY_BROKER_URL


def test_celery_does_not_require_a_result_backend():
    assert app.conf.task_ignore_result is True
