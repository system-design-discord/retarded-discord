from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0004_message_search_index'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='is_delivered',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='message',
            name='scheduled_at',
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                null=True,
            ),
        ),
    ]
