from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('channels_app', '0003_topic'),
    ]

    operations = [
        migrations.AddField(
            model_name='channel',
            name='media_restricted',
            field=models.BooleanField(default=False, verbose_name='محدودیت ارسال رسانه'),
        ),
    ]
