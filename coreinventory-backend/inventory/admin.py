from django.contrib import admin
from .models import (
    ProductCategory, Product, Warehouse, Location,
    StockLevel, StockLedger, Receipt, ReceiptItem,
    Delivery, DeliveryItem, InternalTransfer, TransferItem,
    Adjustment, AdjustmentItem
)

admin.site.register(ProductCategory)
admin.site.register(Product)
admin.site.register(Warehouse)
admin.site.register(Location)
admin.site.register(StockLevel)
admin.site.register(StockLedger)
admin.site.register(Receipt)
admin.site.register(Delivery)
admin.site.register(InternalTransfer)
admin.site.register(Adjustment)