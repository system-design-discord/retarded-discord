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
from channels_app.models import Channel, ChannelMember, Topic
from groups_app.models import Group, GroupMember
from media_app.models import MediaFile
from messaging.models import Message
from roles.models import Role

User = get_user_model()

DEMO_PASSWORD = 'testpass123'

USERS = [
    {'username': 'majid', 'email': 'majid@example.com', 'bio': 'Backend and media developer'},
    {'username': 'amirm', 'email': 'amir@example.com', 'bio': 'Frontend developer'},
    {'username': 'arvin', 'email': 'arvin@example.com', 'bio': 'Product owner'},
]

GROUP_NAME = 'Developers Test Group'

CHANNEL_NAME = 'Systems Analysis and Design'
CHANNEL_DESCRIPTION = 'A sample channel showing topics, roles and permissions'

# Two topics, because one cannot demonstrate that a channel is a *collection*
# of topics (US-4.5) and F-05's tab list has nothing to switch between.
TOPIC_NAMES = ('General', 'Architecture')

# One role holding some of the eight permissions and not others. That asymmetry
# is the point: INT-2 needs an allowed case and a denied case for the same
# member, and a role that grants everything demonstrates neither.
ROLE_NAME = 'Moderator'

# The sample conversation. Constants rather than literals at the call site for
# the same reason the names above are: `_seed_*` keys on the text, so the text
# is a lookup key and LEGACY_FIXTURES below has to name it.
TOPIC_MESSAGES = (
    "This topic is for the channel's general discussion.",
    "Great — I will ask the frontend questions here, then.",
)
DIRECT_MESSAGES = (
    "Hi Amir, how are the frontend tasks coming along?",
    "Hi Majid! Did you get the backend containers up?",
)
GROUP_MESSAGE = "Everyone — here is the system architecture diagram for phase 2:"

ROLE_PERMISSIONS = {
    'can_create_topic': True,
    'can_delete_message': True,
    'can_send_media': False,
}

# A one-pixel GIF. The name ends in .jpg so MediaFile.save() files it as an
# image; the bytes are a GIF because that is the shortest valid image there is.
DUMMY_IMAGE = (
    b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04\x01\x0a'
    b'\x00\x01\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x4c\x01\x00\x3b'
)


# The demo world was seeded in Persian until #127 made the interface English.
#
# Every `_seed_*` method below matches its fixture *by name*, and
# `backend/entrypoint.sh` runs this command on every container start. So a bare
# rename would not update the rows already out there — it would seed a second,
# English group, channel, role and conversation *beside* the Persian ones, on
# every teammate's volume, on every restart. Renaming first is what keeps "safe
# to run against a database in any state" true across the rename itself.
#
# These are historical database values, not interface strings. The map is inert
# once a database has been through it.
LEGACY_FIXTURES = (
    (Group, 'name', 'گروه تست برنامه‌نویسان', GROUP_NAME),
    (Channel, 'name', 'کانال تحلیل و طراحی سیستم‌ها', CHANNEL_NAME),
    (Channel, 'description', 'کانال نمونه برای نمایش تاپیک‌ها، نقش‌ها و دسترسی‌ها', CHANNEL_DESCRIPTION),
    (Topic, 'name', 'عمومی', TOPIC_NAMES[0]),
    (Topic, 'name', 'معماری', TOPIC_NAMES[1]),
    (Role, 'name', 'ناظر', ROLE_NAME),
    (Profile, 'bio', 'توسعه‌دهنده بک‌اند و رسانه', USERS[0]['bio']),
    (Profile, 'bio', 'توسعه‌دهنده فرانت‌اند', USERS[1]['bio']),
    (Profile, 'bio', 'مالک محصول', USERS[2]['bio']),
    (Message, 'text', 'این تاپیک برای بحث‌های عمومی کانال است.', TOPIC_MESSAGES[0]),
    (Message, 'text', 'عالیه! پس سوالای فرانت‌اند رو اینجا می‌پرسم.', TOPIC_MESSAGES[1]),
    (Message, 'text', 'سلام امیر، تسک‌های فرانت‌اند چطور پیش میره؟', DIRECT_MESSAGES[0]),
    (Message, 'text', 'سلام مجید! داکرهای بک‌اند رو دادی بالا؟', DIRECT_MESSAGES[1]),
    (Message, 'text', 'بچه‌ها این عکس معماری سیستم برای فاز دومه:', GROUP_MESSAGE),
)


class Command(BaseCommand):
    help = (
        'Seed demo data (users, groups, media and messages) for testing. '
        'Safe to re-run; it resets the demo users\' passwords.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-passwords',
            action='store_true',
            help=(
                'Leave existing users\' passwords untouched. Without it all three '
                'demo users are reset to testpass123.'
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data...")

        self._rename_legacy_fixtures()

        users = self._seed_users(keep_passwords=options['keep_passwords'])
        majid, amirm, arvin = users['majid'], users['amirm'], users['arvin']

        group = self._seed_group(admin=majid, members=[amirm, arvin])
        media = self._seed_media(owner=majid)
        self._seed_messages(majid=majid, amirm=amirm, group=group, media=media)

        channel = self._seed_channel(owner=majid, members=[amirm, arvin])
        topics = self._seed_topics(channel)
        self._seed_role(channel=channel, holder=amirm)
        self._seed_topic_messages(topic=topics[0], majid=majid, amirm=amirm)

        self.stdout.write(self.style.SUCCESS('Demo data seeded successfully.'))
        self.stdout.write(
            f"Sign in as {', '.join(u['username'] for u in USERS)} "
            f"with the password {DEMO_PASSWORD}"
        )
        self.stdout.write(
            f'Demo channel: "{channel.name}" — owner {channel.owner.username} '
            f'(all eight permissions), {amirm.username} holding "{ROLE_NAME}", '
            f'{arvin.username} with no role'
        )

    def _rename_legacy_fixtures(self):
        """Carry a Persian-seeded database over to the English fixtures (#127).

        Runs before anything looks a fixture up, because every lookup below is
        keyed on the very values this renames.
        """
        renamed = 0
        for model, field, was, now in LEGACY_FIXTURES:
            renamed += model.objects.filter(**{field: was}).update(**{field: now})

        if renamed:
            self.stdout.write(f"  carried {renamed} Persian-seeded row(s) over to the English fixtures")

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
            self.stdout.write(f"  user {user.username}: {'created' if created else 'already existed'}")

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

    def _seed_channel(self, owner, members):
        """One channel owned by `owner`, containing everybody.

        `create_with_owner` is channels_app's own constructor — it writes the
        owner's ChannelMember row in the same call, because ERD.tex makes
        Channel : ChannelMember a 1 : 1..N relationship and a channel with no
        members is not a valid channel. The mirror of `_seed_group` above.
        """
        channel = Channel.objects.filter(name=CHANNEL_NAME).first()
        if channel is None:
            channel = Channel.objects.create_with_owner(
                owner=owner, name=CHANNEL_NAME, description=CHANNEL_DESCRIPTION
            )

        for member in members:
            ChannelMember.objects.get_or_create(channel=channel, user=member)

        self.stdout.write(f"  channel {channel.name}: {len(members) + 1} members")
        return channel

    def _seed_topics(self, channel):
        """The channel's topics, keyed on (channel, name) — its uniqueness rule."""
        topics = []

        for name in TOPIC_NAMES:
            topic, _ = Topic.objects.get_or_create(channel=channel, name=name)
            topics.append(topic)

        return topics

    def _seed_role(self, channel, holder):
        """One partially-privileged role, held by `holder`.

        Seeded so that INT-2's sixteen-check matrix has something to run
        against without any manual setup: the owner implicitly holds all eight,
        `holder` holds the three in ROLE_PERMISSIONS and is refused the rest,
        and the remaining member holds nothing at all. Allowed case, denied
        case and no-role case, from one command.

        The permissions are re-applied on every run rather than only at
        creation, so editing ROLE_PERMISSIONS here changes what a re-seeded
        database actually grants.
        """
        role, _ = Role.objects.get_or_create(channel=channel, name=ROLE_NAME)

        for permission, granted in ROLE_PERMISSIONS.items():
            setattr(role, permission, granted)
        role.save(update_fields=list(ROLE_PERMISSIONS))

        ChannelMember.objects.filter(channel=channel, user=holder).update(role=role)
        self.stdout.write(f"  role {role.name}: granted to {holder.username}")

        return role

    def _seed_topic_messages(self, topic, majid, amirm):
        """Two messages in a topic, so the channel surface is not empty.

        Keyed the same way as the direct and group messages below — on sender,
        target and text — so a re-run matches rather than stacking a copy.
        """
        Message.objects.get_or_create(
            sender=majid, topic=topic, text=TOPIC_MESSAGES[0]
        )
        Message.objects.get_or_create(
            sender=amirm, topic=topic, text=TOPIC_MESSAGES[1]
        )

    def _seed_messages(self, majid, amirm, group, media):
        """Two direct messages and one group message carrying the image.

        Keyed on sender, target and text, so a re-run matches the row it wrote
        last time instead of stacking a second copy of the conversation.
        """
        Message.objects.get_or_create(
            sender=majid, recipient=amirm, text=DIRECT_MESSAGES[0]
        )
        Message.objects.get_or_create(
            sender=amirm, recipient=majid, text=DIRECT_MESSAGES[1]
        )
        Message.objects.get_or_create(
            sender=majid,
            group=group,
            text=GROUP_MESSAGE,
            defaults={'media': media},
        )
