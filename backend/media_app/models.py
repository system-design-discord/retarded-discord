import os

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models

from common import messages

# The serializer caps the extension; this caps the bytes. Both are user-facing.
MAX_UPLOAD_MB = 10


def validate_file_size(value):
    filesize = value.size
    if filesize > MAX_UPLOAD_MB * 1024 * 1024:
        raise ValidationError(messages.FILE_TOO_LARGE.format(limit_mb=MAX_UPLOAD_MB))


class MediaFile(models.Model):
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
