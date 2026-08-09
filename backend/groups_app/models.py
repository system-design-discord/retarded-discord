from django.contrib.auth.models import User
from django.db import models


class Group(models.Model):

    name = models.CharField(max_length=100, verbose_name="نام گروه")
    description = models.TextField(blank=True, null=True, verbose_name="توضیحات گروه")
    avatar = models.ImageField(upload_to='group_avatars/', blank=True, null=True, verbose_name="تصویر گروه")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_groups', verbose_name="مدیر گروه")

    members = models.ManyToManyField(User, related_name='chat_groups', verbose_name="اعضای گروه")

    def __str__(self):
        return self.name
