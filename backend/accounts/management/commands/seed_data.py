from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand

from accounts.models import Profile
from groups_app.models import Group
from media_app.models import MediaFile
from messaging.models import Message

User = get_user_model()


class Command(BaseCommand):
    help = 'تزریق داده‌های اولیه (کاربران، گروه‌ها، مدیا و پیام‌ها) برای تست سیستم'

    def handle(self, *args, **kwargs):
        self.stdout.write("در حال ساخت داده‌های اولیه...")

        # 1. ساخت کاربران
        users_data = [
            {'username': 'majid', 'email': 'majid@example.com', 'bio': 'توسعه‌دهنده بک‌اند و رسانه'},
            {'username': 'amirm', 'email': 'amir@example.com', 'bio': 'توسعه‌دهنده فرانت‌اند'},
            {'username': 'arvin', 'email': 'arvin@example.com', 'bio': 'مالک محصول'},
        ]

        created_users = []
        for u_data in users_data:
            user, created = User.objects.get_or_create(username=u_data['username'], email=u_data['email'])
            if created:
                user.set_password('testpass123')
                user.save()
            created_users.append(user)

            Profile.objects.get_or_create(user=user, defaults={'bio': u_data['bio']})

        majid, amirm, arvin = created_users

        # 2. ساخت گروه
        group, _ = Group.objects.get_or_create(name='گروه تست برنامه‌نویسان', defaults={'admin': majid})
        group.members.add(majid, amirm, arvin)

        # 3. ساخت مدیا تستی
        dummy_image = SimpleUploadedFile(
            name='test_image.jpg',
            content=b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04\x01\x0a\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x4c\x01\x00\x3b',
            content_type='image/jpeg'
        )
        media, _ = MediaFile.objects.get_or_create(
            user=majid,
            file_type='image',
            defaults={'file': dummy_image, 'file_size': dummy_image.size}
        )

        # 4. ساخت پیام‌ها
        Message.objects.get_or_create(
            sender=majid, recipient=amirm, text="سلام امیر، تسک‌های فرانت‌اند چطور پیش میره؟"
        )
        Message.objects.get_or_create(sender=amirm, recipient=majid, text="سلام مجید! داکرهای بک‌اند رو دادی بالا؟")
        Message.objects.get_or_create(
            sender=majid, group=group, text="بچه‌ها این عکس معماری سیستم برای فاز دومه:", media=media
        )

        self.stdout.write(self.style.SUCCESS('داده‌های اولیه با موفقیت در دیتابیس ذخیره شدند!'))
