import os
from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

def validate_file_size(value):
    filesize = value.size
    if filesize > 10 * 1024 * 1024:
        raise ValidationError("حجم فایل نمی‌تواند بیشتر از 10 مگابایت باشد.")

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
    file = models.FileField(upload_to='uploads/%Y/%m/%d/', validators=[validate_file_size], verbose_name="فایل")
    file_type = models.CharField(max_length=50, blank=True, null=True, verbose_name="نوع فایل")
    file_size = models.PositiveIntegerField(blank=True, null=True, verbose_name="حجم فایل")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان آپلود")

    def save(self, *args, **kwargs):
        if self.file:
            self.file_size = self.file.size
            ext = os.path.splitext(self.file.name)[1].lower()
            if ext in ['.jpg', '.jpeg', '.png', '.gif']:
                self.file_type = 'image'
            elif ext in ['.mp4', '.avi', '.mov']:
                self.file_type = 'video'
            elif ext in ['.mp3', '.wav', '.ogg']:
                self.file_type = 'audio'
            else:
                self.file_type = 'document'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.file.name}"
    



User = get_user_model()

class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='received_messages')
    group = models.ForeignKey('Group', on_delete=models.CASCADE, null=True, blank=True, related_name='messages')
    
    text = models.TextField(blank=True, null=True)
    media = models.ForeignKey('MediaFile', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"From {self.sender.username} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"