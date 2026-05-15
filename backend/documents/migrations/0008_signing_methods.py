from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0007_document_client_phone_otpsession'),
    ]

    operations = [
        migrations.AddField(
            model_name='template',
            name='signing_methods',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='document',
            name='signing_methods',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
