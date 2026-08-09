from django.contrib.auth.models import User
from django.db import models


class Profile(models.Model):

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    bio = models.TextField(blank=True, null=True, verbose_name="درباره من")

    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name="عکس نمایه")

    allow_invites = models.BooleanField(default=True, verbose_name="اجازه اضافه شدن به گروه‌ها")

    def __str__(self):
        return f"پروفایل {self.user.username}"
