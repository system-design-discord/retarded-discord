from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Accounts & Identity — architecture.tex §5.

    Owns User and Profile: registration, login, logout, token issuance,
    profile view/edit, and the "who may add me" privacy flag.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'
