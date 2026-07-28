from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    """
    جدول پروفایل کاربری که به صورت یک‌به‌یک به یوزر پیش‌فرض جنگو متصل می‌شود.
    """
    # ارتباط هر پروفایل با یک کاربر
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # داستان کاربری US-10.1: بیوگرافی و اطلاعات
    bio = models.TextField(blank=True, null=True, verbose_name="درباره من")
    
    # وظیفه اصلی شما (مدیریت رسانه): آپلود عکس پروفایل
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name="عکس نمایه")
    
    # داستان کاربری US-5.4 و SH.2: پرچم حریم خصوصی برای جلوگیری از دعوت ناخواسته
    allow_invites = models.BooleanField(default=True, verbose_name="اجازه اضافه شدن به گروه‌ها")

    def __str__(self):
        return f"پروفایل {self.user.username}"