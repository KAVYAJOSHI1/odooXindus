from django.db import transaction
from django.db.models import F
from django.http import JsonResponse
from .models import (
    StockLevel, StockLedger, OperationType, DocumentStatus,
    Receipt, ReceiptItem, Delivery, DeliveryItem, InternalTransfer, TransferItem, Adjustment, AdjustmentItem,
    Product, Location
)

@transaction.atomic
def receive_stock(data):
    ref = data.get('ref')
    if Receipt.objects.filter(ref=ref).exists():
        return JsonResponse({"error": "Receipt reference already exists"}, status=400)
        
    receipt = Receipt.objects.create(
        ref=ref,
        supplier_name=data.get('supplier', 'Unknown'),
        warehouse_id=data.get('warehouse_id'),
        status=DocumentStatus.DONE, # Automatically done for simplified prototype
        po_number=data.get('po', '')
    )
    
    # Needs a default location in that warehouse, assuming first one or creating one
    loc = Location.objects.filter(warehouse_id=receipt.warehouse_id).first()
    if not loc:
        loc = Location.objects.create(warehouse_id=receipt.warehouse_id, name="Default Location")

    for item in data.get('items', []):
        product_id = item.get('product_id')
        qty = item.get('quantity', 0)
        
        ReceiptItem.objects.create(receipt=receipt, product_id=product_id, quantity=qty)
        
        stock, _ = StockLevel.objects.get_or_create(product_id=product_id, location=loc)
        StockLevel.objects.filter(pk=stock.pk).update(quantity=F('quantity') + qty)
        
        StockLedger.objects.create(
            product_id=product_id,
            location=loc,
            operation_type=OperationType.RECEIPT,
            quantity=qty,
            reference_id=ref
        )
    return JsonResponse({"message": "Receipt processed successfully", "id": receipt.id})


@transaction.atomic
def deliver_stock(data):
    ref = data.get('ref')
    if Delivery.objects.filter(ref=ref).exists():
         return JsonResponse({"error": "Delivery reference already exists"}, status=400)
         
    delivery = Delivery.objects.create(
        ref=ref,
        customer_name=data.get('customer', 'Unknown'),
        warehouse_id=data.get('warehouse_id'),
        status=DocumentStatus.DONE,
        so_number=data.get('so', '')
    )

    loc = Location.objects.filter(warehouse_id=delivery.warehouse_id).first()
    if not loc:
        loc = Location.objects.create(warehouse_id=delivery.warehouse_id, name="Default Location")

    for item in data.get('items', []):
        product_id = item.get('product_id')
        qty = item.get('quantity', 0)
        
        stock = StockLevel.objects.select_for_update().filter(product_id=product_id, location=loc).first()
        if not stock or stock.quantity < qty:
            raise Exception(f"Not enough stock at {loc.name} for product ID {product_id}")
            
        DeliveryItem.objects.create(delivery=delivery, product_id=product_id, quantity=qty)
        StockLevel.objects.filter(pk=stock.pk).update(quantity=F('quantity') - qty)
        
        StockLedger.objects.create(
            product_id=product_id,
            location=loc,
            operation_type=OperationType.DELIVERY,
            quantity=-qty,
            reference_id=ref
        )
    return JsonResponse({"message": "Delivery processed successfully", "id": delivery.id})


@transaction.atomic
def transfer_stock(data):
    ref = data.get('ref')
    if InternalTransfer.objects.filter(ref=ref).exists():
         return JsonResponse({"error": "Transfer reference already exists"}, status=400)
         
    transfer = InternalTransfer.objects.create(
        ref=ref,
        from_location_id=data.get('from_location_id'),
        to_location_id=data.get('to_location_id'),
        status=DocumentStatus.DONE
    )

    for item in data.get('items', []):
        product_id = item.get('product_id')
        qty = item.get('quantity', 0)
        
        stock_from = StockLevel.objects.select_for_update().filter(product_id=product_id, location_id=transfer.from_location_id).first()
        if not stock_from or stock_from.quantity < qty:
             raise Exception(f"Not enough stock at source for product ID {product_id}")
             
        # Deduct source
        StockLevel.objects.filter(pk=stock_from.pk).update(quantity=F('quantity') - qty)
        
        # Add dest
        stock_to, _ = StockLevel.objects.get_or_create(product_id=product_id, location_id=transfer.to_location_id)
        StockLevel.objects.filter(pk=stock_to.pk).update(quantity=F('quantity') + qty)
        
        TransferItem.objects.create(transfer=transfer, product_id=product_id, quantity=qty)
        
        StockLedger.objects.create(
            product_id=product_id,
            location_id=transfer.from_location_id,
            operation_type=OperationType.TRANSFER_OUT,
            quantity=-qty,
            reference_id=ref
        )
        StockLedger.objects.create(
            product_id=product_id,
            location_id=transfer.to_location_id,
            operation_type=OperationType.TRANSFER_IN,
            quantity=qty,
            reference_id=ref
        )
    return JsonResponse({"message": "Transfer processed successfully", "id": transfer.id})


@transaction.atomic
def adjust_stock(data, user):
    ref = data.get('ref')
    if Adjustment.objects.filter(ref=ref).exists():
         return JsonResponse({"error": "Adjustment reference already exists"}, status=400)
         
    adjustment = Adjustment.objects.create(
        ref=ref,
        location_id=data.get('location_id'),
        reason=data.get('reason', ''),
        user=user,
        status=DocumentStatus.DONE
    )
    
    for item in data.get('items', []):
        product_id = item.get('product_id')
        counted_qty = item.get('counted_quantity', 0)
        
        stock, _ = StockLevel.objects.select_for_update().get_or_create(product_id=product_id, location_id=adjustment.location_id)
        recorded_qty = stock.quantity
        diff = counted_qty - recorded_qty
        
        AdjustmentItem.objects.create(
            adjustment=adjustment, 
            product_id=product_id, 
            recorded_quantity=recorded_qty, 
            counted_quantity=counted_qty
        )
        
        StockLevel.objects.filter(pk=stock.pk).update(quantity=counted_qty)
        
        StockLedger.objects.create(
            product_id=product_id,
            location_id=adjustment.location_id,
            operation_type=OperationType.ADJUSTMENT,
            quantity=diff,
            reference_id=ref
        )
    return JsonResponse({"message": "Adjustment processed successfully", "id": adjustment.id})