"""
Management command to seed the database with demo data for ShelfControl.
Usage: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from inventory.models import (
    ProductCategory, Product, Warehouse, Location, StockLevel,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds the ShelfControl database with demo warehouses, products, locations, and stock levels."

    def handle(self, *args, **options):
        self.stdout.write("Seeding database …")

        # ── Admin user ──
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@shelfcontrol.com', 'admin123')
            self.stdout.write(self.style.SUCCESS("  ✓ Admin user created (admin / admin123)"))

        # ── Categories ──
        cats = {}
        for name in ['Raw Materials', 'Fasteners', 'Packaging', 'Electronics', 'Tools', 'Safety Gear']:
            cats[name], _ = ProductCategory.objects.get_or_create(name=name)
        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(cats)} categories"))

        # ── Warehouses ──
        wh_main, _ = Warehouse.objects.get_or_create(name='Main WH', defaults={'address': 'Industrial Area, Block A, Vadodara'})
        wh_b, _    = Warehouse.objects.get_or_create(name='Warehouse B', defaults={'address': 'Sector 12, GIDC, Vadodara'})
        wh_c, _    = Warehouse.objects.get_or_create(name='Warehouse C', defaults={'address': 'Plot 45, Halol GIDC'})
        self.stdout.write(self.style.SUCCESS("  ✓ 3 warehouses"))

        # ── Locations ──
        loc_map = {}
        loc_defs = [
            (wh_main, 'Stock Zone A'), (wh_main, 'Stock Zone B'),
            (wh_main, 'Production Floor'), (wh_main, 'Dispatch Bay'),
            (wh_b,    'Zone 1'), (wh_b, 'Zone 2'),
            (wh_c,    'Main Floor'),
        ]
        for wh, name in loc_defs:
            loc, _ = Location.objects.get_or_create(warehouse=wh, name=name)
            loc_map[name] = loc
        # Also ensure a "Default Location" exists for each warehouse (used by services.py)
        for wh in [wh_main, wh_b, wh_c]:
            Location.objects.get_or_create(warehouse=wh, name='Default Location')
        self.stdout.write(self.style.SUCCESS(f"  ✓ {Location.objects.count()} locations"))

        # ── Products ──
        product_defs = [
            ('Steel Rods',       'SKU-00124', 'Raw Materials', 'pcs'),
            ('Copper Wire',      'SKU-00087', 'Raw Materials', 'pcs'),
            ('Rubber Gaskets',   'SKU-00056', 'Raw Materials', 'pcs'),
            ('Plastic Casing',   'SKU-00201', 'Packaging',     'pcs'),
            ('Bolt Set M12',     'SKU-00033', 'Fasteners',     'set'),
            ('Aluminium Sheet',  'SKU-00198', 'Raw Materials', 'pcs'),
            ('PVC Pipe 2in',     'SKU-00045', 'Raw Materials', 'meter'),
            ('Safety Gloves',    'SKU-00301', 'Safety Gear',   'pair'),
            ('LED Panel 40W',    'SKU-00410', 'Electronics',   'pcs'),
            ('Hex Wrench Set',   'SKU-00512', 'Tools',         'set'),
        ]
        prods = {}
        for name, sku, cat_name, unit in product_defs:
            p, _ = Product.objects.get_or_create(sku=sku, defaults={
                'name': name,
                'category': cats[cat_name],
                'unit_of_measure': unit,
            })
            prods[name] = p
        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(prods)} products"))

        # ── Stock Levels ──
        stock_defs = [
            ('Steel Rods',      'Stock Zone A', 0),
            ('Copper Wire',     'Zone 1',       8),
            ('Rubber Gaskets',  'Main Floor',   5),
            ('Plastic Casing',  'Stock Zone B', 12),
            ('Bolt Set M12',    'Production Floor', 0),
            ('Aluminium Sheet', 'Stock Zone A', 120),
            ('PVC Pipe 2in',    'Stock Zone A', 80),
            ('Safety Gloves',   'Zone 2',       40),
            ('LED Panel 40W',   'Stock Zone B', 25),
            ('Hex Wrench Set',  'Production Floor', 15),
        ]
        for prod_name, loc_name, qty in stock_defs:
            StockLevel.objects.update_or_create(
                product=prods[prod_name],
                location=loc_map[loc_name],
                defaults={'quantity': qty}
            )
        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(stock_defs)} stock levels"))

        self.stdout.write(self.style.SUCCESS("\n🎉 Database seeded successfully!"))
