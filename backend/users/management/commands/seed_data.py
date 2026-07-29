from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import Profile, Group

User = get_user_model()

class Command(BaseCommand):
    help = 'تزریق داده‌های اولیه برای تست سیستم'

    def handle(self, *args, **kwargs):
        self.stdout.write("در حال ساخت داده‌های اولیه...")

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

        admin_user = created_users[0]
        group, created = Group.objects.get_or_create(name='گروه تست برنامه‌نویسان', defaults={'admin': admin_user})
        if created:
            for u in created_users:
                group.members.add(u)

        self.stdout.write(self.style.SUCCESS('داده‌های اولیه با موفقیت در دیتابیس ذخیره شدند!'))