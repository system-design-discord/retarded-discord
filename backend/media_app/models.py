import os

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models

from common import messages

# A-5 — what may be uploaded and what it is called, in one table.
#
# These were two lists in two files that disagreed: the serializer allowed seven
# extensions while `save()` classified twelve, so the branches for `.gif`,
# `.avi`, `.mov`, `.wav` and `.ogg` were unreachable — the upload was refused
# before the classifier ever ran. `doc.tex` §4.7 and US-7.1 both say "images,
# videos, audio, or files" without qualification, and a `.wav` voice note or a
# `.mov` off an iPhone is exactly that. Widening the allowlist to the classifier
# is what makes the two agree; keeping them in one place is what stops them
# drifting apart again.
#
# `MediaFileSerializer.validate_file` allows exactly these keys, and
# `MessageBubble` in the SPA branches on the value — note the fourth is
# `document`, not `file`.
EXTENSION_TYPES = {
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
    '.gif': 'image',
    '.mp4': 'video',
    '.avi': 'video',
    '.mov': 'video',
    '.mp3': 'audio',
    '.wav': 'audio',
    '.ogg': 'audio',
    '.pdf': 'document',
    '.zip': 'document',
}

DEFAULT_FILE_TYPE = 'document'

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
            self.file_type = EXTENSION_TYPES.get(ext, DEFAULT_FILE_TYPE)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - {self.file.name}"
