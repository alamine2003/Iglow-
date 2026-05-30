import os
import shutil

from django.conf import settings
from django.core.management.base import BaseCommand

from api.models import Product, ProductCategory

CATEGORIES = [
    {'name': 'Nettoyants',         'slug': 'nettoyants',         'sort_order': 1},
    {'name': 'Soins Visage',       'slug': 'soins-visage',       'sort_order': 2},
    {'name': 'Sérums',             'slug': 'serums',             'sort_order': 3},
    {'name': 'Masques',            'slug': 'masques',            'sort_order': 4},
    {'name': 'Exfoliants',         'slug': 'exfoliants',         'sort_order': 5},
    {'name': 'Protection Solaire', 'slug': 'protection-solaire', 'sort_order': 6},
]

PRODUCTS = [
    # ── Nettoyants ────────────────────────────────────────────────────────────
    {
        'name':        'Gentle Cleanser',
        'description': 'Nettoyant doux visage 150 ml. Purifie, apaise et respecte la peau.',
        'price':       8500,
        'stock':       50,
        'category':    'nettoyants',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.39.jpeg',
        'img_dest':    'gentle-cleanser.jpg',
    },
    {
        'name':        'Savon Hydratant',
        'description': 'Savon hydratant 100 g. Nettoie, nourrit et protège la peau.',
        'price':       4500,
        'stock':       80,
        'category':    'nettoyants',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.40 (1).jpeg',
        'img_dest':    'savon-hydratant.jpg',
    },
    {
        'name':        'Pure Soap',
        'description': 'Savon doux éclat 100 g. Nettoie, unifie et illumine.',
        'price':       4000,
        'stock':       80,
        'category':    'nettoyants',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.41 (3).jpeg',
        'img_dest':    'pure-soap.jpg',
    },
    {
        'name':        'Savon Hydratant Vert',
        'description': 'Savon hydratant détoxifiant 100 g. Nettoie, nourrit et protège.',
        'price':       4500,
        'stock':       60,
        'category':    'nettoyants',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.42 (6).jpeg',
        'img_dest':    'savon-hydratant-vert.jpg',
    },
    # ── Soins Visage ──────────────────────────────────────────────────────────
    {
        'name':        'Face Cream',
        'description': 'Crème visage éclat 50 ml. Hydrate, nourrit et protège.',
        'price':       15000,
        'stock':       40,
        'category':    'soins-visage',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.40.jpeg',
        'img_dest':    'face-cream.jpg',
    },
    {
        'name':        'Barrier Cream',
        'description': 'Crème hydratante visage réparatrice anti-pores 50 ml. Répare, renforce et rééquilibre.',
        'price':       14000,
        'stock':       35,
        'category':    'soins-visage',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.41 (5).jpeg',
        'img_dest':    'barrier-cream.jpg',
    },
    {
        'name':        'Lotion de Visage',
        'description': 'Lotion visage 200 ml. Hydrate, rafraîchit et illumine.',
        'price':       10500,
        'stock':       45,
        'category':    'soins-visage',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.42 (5).jpeg',
        'img_dest':    'lotion-visage.jpg',
    },
    # ── Sérums ────────────────────────────────────────────────────────────────
    {
        'name':        'Bright Drops',
        'description': 'Sérum anti-taches éclat intense 30 ml. Réduit les taches et illumine le teint.',
        'price':       18500,
        'stock':       30,
        'category':    'serums',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.42 (1).jpeg',
        'img_dest':    'bright-drops.jpg',
    },
    {
        'name':        'Sérum Peau Sèche',
        'description': 'Sérum hydratant pour peau sèche 30 ml. Nourrit, apaise et répare.',
        'price':       16000,
        'stock':       30,
        'category':    'serums',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.42 (2).jpeg',
        'img_dest':    'serum-peau-seche.jpg',
    },
    {
        'name':        'Sérum Peau Grasse',
        'description': 'Sérum équilibrant pour peau grasse 30 ml. Régule, purifie et matifie.',
        'price':       16000,
        'stock':       30,
        'category':    'serums',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.42 (4).jpeg',
        'img_dest':    'serum-peau-grasse.jpg',
    },
    # ── Masques ───────────────────────────────────────────────────────────────
    {
        'name':        'Overnight Mask',
        'description': 'Masque visage anti-pores nuit 50 ml. Purifie, resserre et régénère.',
        'price':       13500,
        'stock':       40,
        'category':    'masques',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.40 (3).jpeg',
        'img_dest':    'overnight-mask.jpg',
    },
    {
        'name':        'Clay Detox',
        'description': "Masque argile anti-pores 25 ml. Purifie, détoxifie et resserre les pores.",
        'price':       6500,
        'stock':       60,
        'category':    'masques',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.41.jpeg',
        'img_dest':    'clay-detox.jpg',
    },
    {
        'name':        'Glow Mask',
        'description': 'Masque visage hydratant 25 ml. Hydrate, apaise et illumine.',
        'price':       7000,
        'stock':       55,
        'category':    'masques',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.41 (4).jpeg',
        'img_dest':    'glow-mask.jpg',
    },
    # ── Exfoliants ────────────────────────────────────────────────────────────
    {
        'name':        'Gommage Hydratant',
        'description': 'Gommage hydratant visage 75 ml. Exfolie en douceur tout en hydratant.',
        'price':       9000,
        'stock':       45,
        'category':    'exfoliants',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.42 (3).jpeg',
        'img_dest':    'gommage-hydratant.jpg',
    },
    # ── Protection Solaire ────────────────────────────────────────────────────
    {
        'name':        'Sun Veil SPF 50',
        'description': 'Crème solaire haute protection SPF 50 — 50 ml. Protection UVA/UVB.',
        'price':       12000,
        'stock':       50,
        'category':    'protection-solaire',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.40 (2).jpeg',
        'img_dest':    'sun-veil-spf50.jpg',
    },
    {
        'name':        'UV Protect SPF 50',
        'description': 'Crème solaire haute protection SPF 50 en tube — 50 ml. Protection UVA/UVB.',
        'price':       11000,
        'stock':       50,
        'category':    'protection-solaire',
        'img_src':     'WhatsApp Image 2026-05-29 at 22.56.41 (2).jpeg',
        'img_dest':    'uv-protect-spf50.jpg',
    },
]


class Command(BaseCommand):
    help = 'Initialise le catalogue iGlow : 6 catégories et 16 produits avec images.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--images-dir',
            default='/app/product-images',
            help='Répertoire source des images produits (défaut : /app/product-images)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Supprime et recrée les produits existants',
        )

    def handle(self, *args, **options):
        images_dir = options['images_dir']
        force = options['force']

        media_products = os.path.join(settings.MEDIA_ROOT, 'products')
        os.makedirs(media_products, exist_ok=True)

        # ── Catégories ────────────────────────────────────────────────────────
        cats = {}
        for c in CATEGORIES:
            obj, created = ProductCategory.objects.get_or_create(
                slug=c['slug'],
                defaults={'name': c['name'], 'sort_order': c['sort_order']},
            )
            cats[c['slug']] = obj
            if created:
                self.stdout.write(f'  + Catégorie : {obj.name}')

        # ── Produits ──────────────────────────────────────────────────────────
        created_count = 0
        skipped_count = 0

        for p in PRODUCTS:
            exists = Product.objects.filter(name=p['name']).exists()
            if exists:
                if not force:
                    skipped_count += 1
                    continue
                Product.objects.filter(name=p['name']).delete()

            # Copie de l'image si disponible
            image_field = ''
            src_path = os.path.join(images_dir, p['img_src'])
            dst_path = os.path.join(media_products, p['img_dest'])
            if os.path.exists(src_path):
                shutil.copy2(src_path, dst_path)
                image_field = f"products/{p['img_dest']}"

            Product.objects.create(
                name=p['name'],
                description=p['description'],
                price=p['price'],
                stock=p['stock'],
                category=cats[p['category']],
                image=image_field,
            )
            created_count += 1
            self.stdout.write(f"  + Produit : {p['name']}{' (image OK)' if image_field else ''}")

        self.stdout.write(self.style.SUCCESS(
            f'\nCatalogue initialisé : {created_count} produit(s) créé(s), '
            f'{skipped_count} ignoré(s) (déjà existants — utilisez --force pour les réinitialiser).'
        ))