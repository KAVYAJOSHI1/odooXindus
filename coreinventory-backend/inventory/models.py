from django.db import models
from django.contrib.auth.models import User

# --- ENUMS ---
class OperationType(models.TextChoices):
    RECEIPT = 'RECEIPT', 'Receipt'
    DELIVERY = 'DELIVERY', 'Delivery'
    TRANSFER_IN = 'TRANSFER_IN', 'Transfer In'
    TRANSFER_OUT = 'TRANSFER_OUT', 'Transfer Out'
    ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'

class DocumentStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    READY = 'READY', 'Ready'
    DONE = 'DONE', 'Done'
    CANCELLED = 'CANCELLED', 'Cancelled'

# --- CORE DATA ---
class ProductCategory(models.Model):
    name = models.CharField(max_length=200, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, unique=True)
    category = models.ForeignKey(ProductCategory, on_delete=models.SET_NULL, null=True, blank=True)
    unit_of_measure = models.CharField(max_length=50) # Added from spec
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.sku})"

class Warehouse(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Location(models.Model):
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.warehouse.name} - {self.name}"

# --- STOCK & LEDGER ---
class StockLevel(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'location')

    def __str__(self):
        return f"{self.product.name} @ {self.location.name}: {self.quantity}"

class StockLedger(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    operation_type = models.CharField(max_length=20, choices=OperationType.choices)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    reference_id = models.CharField(max_length=100, null=True, blank=True) # CharField better to store refs like WH/IN/0001
    created_at = models.DateTimeField(auto_now_add=True)
    # user who did it could be added here if needed

# --- OPERATIONS ---
class Receipt(models.Model):
    ref = models.CharField(max_length=50, unique=True)
    supplier_name = models.CharField(max_length=255)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.DRAFT)
    scheduled_date = models.DateField(null=True, blank=True)
    po_number = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class ReceiptItem(models.Model):
    receipt = models.ForeignKey(Receipt, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)

class Delivery(models.Model):
    ref = models.CharField(max_length=50, unique=True)
    customer_name = models.CharField(max_length=255)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.DRAFT)
    scheduled_date = models.DateField(null=True, blank=True)
    so_number = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class DeliveryItem(models.Model):
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)

class InternalTransfer(models.Model):
    ref = models.CharField(max_length=50, unique=True)
    from_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='transfers_out')
    to_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='transfers_in')
    status = models.CharField(max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)

class TransferItem(models.Model):
    transfer = models.ForeignKey(InternalTransfer, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)

class Adjustment(models.Model):
    ref = models.CharField(max_length=50, unique=True)
    location = models.ForeignKey(Location, on_delete=models.CASCADE)
    reason = models.TextField(null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)

class AdjustmentItem(models.Model):
    adjustment = models.ForeignKey(Adjustment, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    recorded_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    counted_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    
    @property
    def difference(self):
        return self.counted_quantity - self.recorded_quantity