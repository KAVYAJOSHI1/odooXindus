from django.test import TestCase
from .models import Product, ProductCategory, Warehouse, Location, StockLevel, StockLedger
from .services import receive_stock, deliver_stock, transfer_stock, adjust_stock


class InventoryServiceTests(TestCase):
    def setUp(self):
        category = ProductCategory.objects.create(name="Test Category")
        self.product = Product.objects.create(
            name="Test Prod", sku="SKU-TEST-1", category=category, unit_of_measure="pcs"
        )
        self.warehouse1 = Warehouse.objects.create(name="WH1")
        self.warehouse2 = Warehouse.objects.create(name="WH2")
        self.location1 = Location.objects.create(warehouse=self.warehouse1, name="Default Location")
        self.location2 = Location.objects.create(warehouse=self.warehouse2, name="Default Location")

    def test_receive_stock(self):
        receive_stock({
            "ref": "REC1",
            "warehouse_id": self.warehouse1.id,
            "items": [{"product_id": self.product.id, "quantity": 50}],
        })
        stock = StockLevel.objects.get(product=self.product, location=self.location1)
        self.assertEqual(stock.quantity, 50)
        self.assertEqual(StockLedger.objects.count(), 1)
        self.assertEqual(StockLedger.objects.first().operation_type, "RECEIPT")

    def test_deliver_stock_success(self):
        receive_stock({
            "ref": "REC2",
            "warehouse_id": self.warehouse1.id,
            "items": [{"product_id": self.product.id, "quantity": 50}],
        })
        deliver_stock({
            "ref": "DEL1",
            "warehouse_id": self.warehouse1.id,
            "items": [{"product_id": self.product.id, "quantity": 20}],
        })
        stock = StockLevel.objects.get(product=self.product, location=self.location1)
        self.assertEqual(stock.quantity, 30)

    def test_deliver_stock_insufficient(self):
        receive_stock({
            "ref": "REC3",
            "warehouse_id": self.warehouse1.id,
            "items": [{"product_id": self.product.id, "quantity": 10}],
        })
        with self.assertRaisesMessage(Exception, "Not enough stock"):
            deliver_stock({
                "ref": "DEL2",
                "warehouse_id": self.warehouse1.id,
                "items": [{"product_id": self.product.id, "quantity": 20}],
            })

    def test_transfer_stock(self):
        receive_stock({
            "ref": "REC4",
            "warehouse_id": self.warehouse1.id,
            "items": [{"product_id": self.product.id, "quantity": 50}],
        })
        transfer_stock({
            "ref": "TRF1",
            "from_location_id": self.location1.id,
            "to_location_id": self.location2.id,
            "items": [{"product_id": self.product.id, "quantity": 20}],
        })

        stock1 = StockLevel.objects.get(product=self.product, location=self.location1)
        stock2 = StockLevel.objects.get(product=self.product, location=self.location2)

        self.assertEqual(stock1.quantity, 30)
        self.assertEqual(stock2.quantity, 20)

        movements = StockLedger.objects.filter(operation_type__in=["TRANSFER_OUT", "TRANSFER_IN"])
        self.assertEqual(movements.count(), 2)

    def test_adjust_stock(self):
        receive_stock({
            "ref": "REC5",
            "warehouse_id": self.warehouse1.id,
            "items": [{"product_id": self.product.id, "quantity": 50}],
        })
        adjust_stock({
            "ref": "ADJ1",
            "location_id": self.location1.id,
            "items": [{"product_id": self.product.id, "counted_quantity": 30}],
        }, user=None)

        stock = StockLevel.objects.get(product=self.product, location=self.location1)
        self.assertEqual(stock.quantity, 30)

        adj_mov = StockLedger.objects.filter(operation_type="ADJUSTMENT").last()
        self.assertIsNotNone(adj_mov)
        self.assertEqual(adj_mov.quantity, -20)
