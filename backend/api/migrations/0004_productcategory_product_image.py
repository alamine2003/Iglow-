import re

from django.db import migrations, models
import django.db.models.deletion


def slugify_simple(value):
    value = value.lower().strip()
    value = re.sub(r'[^\w\s-]', '', value)
    return re.sub(r'[-\s]+', '-', value).strip('-')[:100] or 'autre'


def migrate_categories_forward(apps, schema_editor):
    Product = apps.get_model('api', 'Product')
    ProductCategory = apps.get_model('api', 'ProductCategory')

    defaults = [
        ('serums', 'Serums', 10),
        ('cremes', 'Cremes', 20),
        ('nettoyants', 'Nettoyants', 30),
        ('masques', 'Masques', 40),
        ('autre', 'Autre', 99),
    ]
    slug_to_cat = {}
    for slug, name, order in defaults:
        cat, _ = ProductCategory.objects.get_or_create(
            slug=slug,
            defaults={'name': name, 'sort_order': order},
        )
        slug_to_cat[slug] = cat

    fallback = slug_to_cat['autre']

    for product in Product.objects.all():
        raw = (product.category_legacy or '').strip()
        slug = slugify_simple(raw) if raw else 'autre'
        cat = slug_to_cat.get(slug)
        if not cat:
            cat, _ = ProductCategory.objects.get_or_create(
                slug=slug,
                defaults={'name': raw or 'Autre', 'sort_order': 50},
            )
            slug_to_cat[slug] = cat
        product.category = cat
        product.save(update_fields=['category'])


def migrate_categories_backward(apps, schema_editor):
    Product = apps.get_model('api', 'Product')
    for product in Product.objects.select_related('category').all():
        if product.category_id:
            product.category_legacy = product.category.slug
            product.save(update_fields=['category_legacy'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_ticket_message'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('slug', models.SlugField(max_length=100, unique=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name_plural': 'Product categories',
                'ordering': ['sort_order', 'name'],
            },
        ),
        migrations.RenameField(
            model_name='product',
            old_name='category',
            new_name='category_legacy',
        ),
        migrations.AddField(
            model_name='product',
            name='category',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='products',
                to='api.productcategory',
            ),
        ),
        migrations.AddField(
            model_name='product',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='products/'),
        ),
        migrations.AlterField(
            model_name='product',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.RunPython(migrate_categories_forward, migrate_categories_backward),
        migrations.AlterField(
            model_name='product',
            name='category',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='products',
                to='api.productcategory',
            ),
        ),
        migrations.RemoveField(
            model_name='product',
            name='category_legacy',
        ),
    ]
