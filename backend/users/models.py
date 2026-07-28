from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    bio = models.TextField(blank=True, null=True, verbose_name="درباره من")
    
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name="عکس نمایه")
    
    allow_invites = models.BooleanField(default=True, verbose_name="اجازه اضافه شدن به گروه‌ها")



    def __str__(self):
        return f"پروفایل {self.user.username}"
    
class Group(models.Model):

    name = models.CharField(max_length=100, verbose_name="نام گروه")
    description = models.TextField(blank=True, null=True, verbose_name="توضیحات گروه")
    avatar = models.ImageField(upload_to='group_avatars/', blank=True, null=True, verbose_name="تصویر گروه")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_groups', verbose_name="مدیر گروه")
    
    members = models.ManyToManyField(User, related_name='chat_groups', verbose_name="اعضای گروه")

    def __str__(self):
        return self.name
    
    

class MediaFile(models.Model):
#Media 
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_files', verbose_name="آپلودکننده")
    file = models.FileField(upload_to='uploads/%Y/%m/%d/', verbose_name="فایل")
    file_type = models.CharField(max_length=50, blank=True, null=True, verbose_name="نوع فایل")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان آپلود")

    def __str__(self):
        return f"{self.user.username} - {self.file.name}"