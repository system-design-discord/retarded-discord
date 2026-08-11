"""M-04 — replace the bare ManyToManyField with the GroupMember entity ERD.tex
specifies, without losing a single existing membership.

The order of the operations below is the whole point and is not the order
`makemigrations` produced:

1. create `groups_app_groupmember`;
2. **copy every existing membership into it** while the old table and
   `Group.admin` are both still there to read;
3. only then drop the auto-created M2M table and the `admin` column.

`makemigrations` also emitted an `AlterField` from the auto-created M2M to the
`through` one. That raises *"Cannot alter field … they are not compatible
types"* at the database level, because Django can only alter an M2M in place when
both sides are auto-created. `RemoveField` + `AddField` is the supported route,
and the `AddField` is a state-only no-op — a `through` M2M has no column and no
table of its own.

**Forward only.** Reversing would have to re-add `Group.admin` as a non-null
ForeignKey with no default, which Django cannot do unaided. The data function
below still carries a real reverse so that the row copy itself is not the part
that blocks it.
"""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def copy_memberships_into_group_member(apps, schema_editor):
    """Every row of the old auto-created M2M becomes a GroupMember.

    `is_admin` is set from the `Group.admin` column that is about to be dropped,
    so the admin of every existing group survives as the admin. A group whose
    admin was somehow not among its own members still gets an admin row — the
    alternative is a group nobody can moderate.
    """
    Group = apps.get_model('groups_app', 'Group')
    GroupMember = apps.get_model('groups_app', 'GroupMember')

    for group in Group.objects.all():
        member_ids = list(group.members.values_list('pk', flat=True))
        if group.admin_id and group.admin_id not in member_ids:
            member_ids.append(group.admin_id)

        GroupMember.objects.bulk_create(
            GroupMember(group=group, user_id=user_id, is_admin=(user_id == group.admin_id))
            for user_id in member_ids
        )


def copy_memberships_back(apps, schema_editor):
    """The inverse: put the rows back on the M2M and restore Group.admin."""
    Group = apps.get_model('groups_app', 'Group')
    GroupMember = apps.get_model('groups_app', 'GroupMember')

    for group in Group.objects.all():
        memberships = GroupMember.objects.filter(group=group)
        group.members.set([m.user_id for m in memberships])

        admin = memberships.filter(is_admin=True).first()
        if admin:
            group.admin_id = admin.user_id
            group.save(update_fields=['admin'])

    GroupMember.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('groups_app', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1 — the new table, alongside the old one.
        migrations.CreateModel(
            name='GroupMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_admin', models.BooleanField(default=False, verbose_name='مدیر گروه')),
                ('joined_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ عضویت')),
                ('group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='memberships', to='groups_app.group', verbose_name='گروه')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='group_memberships', to=settings.AUTH_USER_MODEL, verbose_name='کاربر')),
            ],
            options={
                'verbose_name': 'عضو گروه',
                'verbose_name_plural': 'اعضای گروه',
                'ordering': ['joined_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='groupmember',
            constraint=models.UniqueConstraint(fields=('group', 'user'), name='unique_group_membership'),
        ),

        # 2 — carry the data across while both sources still exist.
        migrations.RunPython(copy_memberships_into_group_member, copy_memberships_back),

        # 3 — retire the old shape.
        migrations.RemoveField(
            model_name='group',
            name='members',
        ),
        migrations.AddField(
            model_name='group',
            name='members',
            field=models.ManyToManyField(related_name='chat_groups', through='groups_app.GroupMember', to=settings.AUTH_USER_MODEL, verbose_name='اعضای گروه'),
        ),
        migrations.RemoveField(
            model_name='group',
            name='admin',
        ),
    ]
