"""The demo data the README signs a grader in with.

Run on every container start by `backend/entrypoint.sh`, so it has to be safe
to run against a database in any state: empty, already seeded, or carrying
accounts somebody registered through the UI under one of these usernames. Every
write below is therefore a lookup-then-set on a stable key, never a bare
`create`, and the whole thing is one transaction so a failure halfway leaves
nothing behind.
"""

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Profile
from groups_app.models import Group, GroupMember
from media_app.models import MediaFile
from messaging.models import Message

User = get_user_model()

DEMO_PASSWORD = 'testpass123'

USERS = [
    {'username': 'majid', 'email': 'majid@example.com', 'bio': 'توسعه‌دهنده بک‌اند و رسانه'},
    {'username': 'amirm', 'email': 'amir@example.com', 'bio': 'توسعه‌دهنده فرانت‌اند'},
    {'username': 'arvin', 'email': 'arvin@example.com', 'bio': 'مالک محصول'},
]

GROUP_NAME = 'گروه تست برنامه‌نویسان'

# A one-pixel GIF. The name ends in .jpg so MediaFile.save() files it as an
# image; the bytes are a GIF because that is the shortest valid image there is.
DUMMY_IMAGE = (
    b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04\x01\x0a'
    b'\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x4c\x01\x00\x3b'
)


class Command(BaseCommand):
    help = (
        'تزریق داده‌های اولیه (کاربران، گروه‌ها، مدیا و پیام‌ها) برای تست سیستم. '
        'اجرای مجدد آن بی‌خطر است و رمز عبور کاربران نمونه را بازنشانی می‌کند.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-passwords',
            action='store_true',
            help=(
                'رمز عبور کاربران موجود را دست‌نخورده باقی می‌گذارد. '
                'بدون این گزینه، رمز هر سه کاربر نمونه به testpass123 بازنشانی می‌شود.'
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("در حال ساخت داده‌های اولیه...")

        users = self._seed_users(keep_passwords=options['keep_passwords'])
        majid, amirm, arvin = users['majid'], users['amirm'], users['arvin']

        group = self._seed_group(admin=majid, members=[amirm, arvin])
        media = self._seed_media(owner=majid)
        self._seed_messages(majid=majid, amirm=amirm, group=group, media=media)

        self.stdout.write(self.style.SUCCESS('داده‌های اولیه با موفقیت در دیتابیس ذخیره شدند!'))
        self.stdout.write(
            f"ورود با نام کاربری {', '.join(u['username'] for u in USERS)} "
            f"و رمز عبور {DEMO_PASSWORD}"
        )

    def _seed_users(self, keep_passwords):
        """The three accounts, keyed on username alone.

        Keying on `(username, email)` — which this used to do — raises
        IntegrityError rather than matching when a user of that name exists
        with a different address, and "seed crashed" and "there is no such
        user" look identical from the login screen.

        The password is re-set on every run unless asked not to. These are
        fixed, published, throwaway credentials whose whole job is to work; a
        half-created account that cannot be signed into is the failure this
        command exists to prevent.
        """
        users = {}

        for spec in USERS:
            user, created = User.objects.get_or_create(
                username=spec['username'],
                defaults={'email': spec['email']},
            )

            if created or not keep_passwords:
                user.set_password(DEMO_PASSWORD)
                user.save(update_fields=['password'])

            # Profile is created lazily by the profile views, so a user seeded
            # here would otherwise have none until they opened the screen.
            Profile.objects.get_or_create(user=user, defaults={'bio': spec['bio']})

            users[spec['username']] = user
            self.stdout.write(f"  کاربر {user.username}: {'ساخته شد' if created else 'از قبل موجود بود'}")

        return users

    def _seed_group(self, admin, members):
        """One group, administered by `admin`, containing everybody.

        `create_with_admin` is groups_app's own constructor — it writes the
        GroupMember row that makes the group valid (ERD.tex makes
        Group : GroupMember a 1..N relationship). Adding the others goes
        through GroupMember directly rather than `group.members.add`, so the
        `is_admin=False` on those rows is stated here rather than inherited
        from a field default.
        """
        group = Group.objects.filter(name=GROUP_NAME).first()
        if group is None:
            group = Group.objects.create_with_admin(admin=admin, name=GROUP_NAME)

        for member in members:
            GroupMember.objects.get_or_create(
                group=group, user=member, defaults={'is_admin': False}
            )

        return group

    def _seed_media(self, owner):
        """One uploaded image, so the media path is exercised by the demo.

        Matched on the file's basename rather than on `file_type`: the old
        lookup meant a single image per user for all time, and the first
        upload made through the UI would have satisfied it.
        """
        existing = MediaFile.objects.filter(user=owner, file__endswith='seed_architecture.jpg').first()
        if existing is not None:
            return existing

        return MediaFile.objects.create(
            user=owner,
            file=SimpleUploadedFile(
                name='seed_architecture.jpg', content=DUMMY_IMAGE, content_type='image/jpeg'
            ),
        )

    def _seed_messages(self, majid, amirm, group, media):
        """Two direct messages and one group message carrying the image.

        Keyed on sender, target and text, so a re-run matches the row it wrote
        last time instead of stacking a second copy of the conversation.
        """
        Message.objects.get_or_create(
            sender=majid, recipient=amirm, text="سلام امیر، تسک‌های فرانت‌اند چطور پیش میره؟"
        )
        Message.objects.get_or_create(
            sender=amirm, recipient=majid, text="سلام مجید! داکرهای بک‌اند رو دادی بالا؟"
        )
        Message.objects.get_or_create(
            sender=majid,
            group=group,
            text="بچه‌ها این عکس معماری سیستم برای فاز دومه:",
            defaults={'media': media},
        )
