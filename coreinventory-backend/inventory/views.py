import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.db.models import Sum, F, Q
from django.db.models.functions import Coalesce

from .models import (
    Product, ProductCategory, Warehouse, Location, StockLevel, StockLedger,
    Receipt, Delivery, InternalTransfer, Adjustment, OperationType
)
from .services import receive_stock, deliver_stock, transfer_stock, adjust_stock

User = get_user_model()

# --- AUTH ---
@csrf_exempt
def api_login(request):
    if request.method == "POST":
        data = json.loads(request.body)
        user = authenticate(username=data.get("username"), password=data.get("password"))
        if user is not None:
            login(request, user)
            return JsonResponse({"message": "Logged in", "user": {"username": user.username}})
        return JsonResponse({"error": "Invalid credentials"}, status=401)
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def api_signup(request):
    if request.method == "POST":
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")
        email = data.get("email", "")
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "Username taken"}, status=400)
        user = User.objects.create_user(username=username, password=password, email=email)
        login(request, user)
        return JsonResponse({"message": "Signed up", "user": {"username": user.username}})
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def api_logout(request):
    logout(request)
    return JsonResponse({"message": "Logged out"})

def api_me(request):
    if request.user.is_authenticated:
        return JsonResponse({"authenticated": True, "user": {"username": request.user.username}})
    return JsonResponse({"authenticated": False}, status=401)

# --- DASHBOARD ---
def dashboard(request):
    total_products = Product.objects.count()
    low_stock = StockLevel.objects.values('product').annotate(total=Sum('quantity')).filter(total__lt=10).count()
    
    pending_receipts = Receipt.objects.filter(status__in=['DRAFT', 'READY']).count()
    pending_deliveries = Delivery.objects.filter(status__in=['DRAFT', 'READY']).count()
    internal_transfers = InternalTransfer.objects.filter(status__in=['DRAFT', 'READY']).count()
    total_stock = StockLevel.objects.aggregate(total=Sum('quantity'))['total'] or 0

    return JsonResponse({
        "total_products": total_products,
        "low_stock": low_stock,
        "pending_receipts": pending_receipts,
        "pending_deliveries": pending_deliveries,
        "internal_transfers": internal_transfers,
        "total_stock": float(total_stock),
    })

# --- STOCK ALERTS (live from DB) ---
def stock_alerts(request):
    """Return per-product stock levels with alert status, replacing the hardcoded STOCK_ALERTS."""
    data = []
    for p in Product.objects.all():
        total = StockLevel.objects.filter(product=p).aggregate(t=Sum('quantity'))['t'] or 0
        total = float(total)
        min_stock = 10  # default threshold
        if total <= 0:
            status = 'out'
        elif total < min_stock:
            status = 'low'
        else:
            status = 'healthy'
        data.append({
            "product": p.name,
            "sku": p.sku,
            "stock": total,
            "min": min_stock,
            "status": status,
        })
    return JsonResponse(data, safe=False)

# --- CRUD ---
@csrf_exempt
def products(request):
    if request.method == "GET":
        data = []
        for p in Product.objects.select_related('category').all():
            stock = StockLevel.objects.filter(product=p).aggregate(total=Sum('quantity'))['total'] or 0
            data.append({
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "category": p.category.name if p.category else "Uncategorized",
                "unit": p.unit_of_measure,
                "stock": float(stock),
            })
        return JsonResponse(data, safe=False)
    
    elif request.method == "POST":
        data = json.loads(request.body)
        cat_name = data.get('category', 'Uncategorized')
        cat, _ = ProductCategory.objects.get_or_create(name=cat_name)
        p = Product.objects.create(
            name=data['name'], 
            sku=data['sku'], 
            category=cat,
            unit_of_measure=data.get('unit', 'pcs')
        )
        # Create initial stock level if stock > 0
        initial_stock = float(data.get('stock', 0))
        if initial_stock > 0:
            loc = Location.objects.first()
            if loc:
                sl, _ = StockLevel.objects.get_or_create(product=p, location=loc)
                sl.quantity = initial_stock
                sl.save()
                StockLedger.objects.create(
                    product=p,
                    location=loc,
                    operation_type=OperationType.ADJUSTMENT,
                    quantity=initial_stock,
                    reference_id=f'INIT/{p.sku}'
                )
        return JsonResponse({"id": p.id, "message": "Product created"})

@csrf_exempt
def product_detail(request, pk):
    try:
        p = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return JsonResponse({"error": "Product not found"}, status=404)

    if request.method == "PUT":
        data = json.loads(request.body)
        if 'name' in data: p.name = data['name']
        if 'sku' in data: p.sku = data['sku']
        if 'category' in data:
            cat, _ = ProductCategory.objects.get_or_create(name=data['category'])
            p.category = cat
        if 'unit' in data: p.unit_of_measure = data['unit']
        p.save()
        return JsonResponse({"message": "Product updated"})
        
    elif request.method == "DELETE":
        p.delete()
        return JsonResponse({"message": "Product deleted"})
        
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def warehouses(request):
    if request.method == "GET":
        data = list(Warehouse.objects.values('id', 'name', 'address'))
        return JsonResponse(data, safe=False)
    elif request.method == "POST":
        body = json.loads(request.body)
        w = Warehouse.objects.create(
            name=body['name'],
            address=body.get('address', '')
        )
        # Auto-create a default location inside the warehouse
        Location.objects.create(warehouse=w, name='Default Location')
        return JsonResponse({"id": w.id, "message": "Warehouse created"})

# --- LOCATIONS ---
@csrf_exempt
def locations(request):
    if request.method == "GET":
        data = list(Location.objects.annotate(
            warehouse_name=F('warehouse__name')
        ).values('id', 'name', 'warehouse_name', 'warehouse_id'))
        return JsonResponse(data, safe=False)
    elif request.method == "POST":
        body = json.loads(request.body)
        loc = Location.objects.create(
            warehouse_id=body['warehouse_id'],
            name=body['name'],
        )
        return JsonResponse({"id": loc.id, "message": "Location created"})

@csrf_exempt
def warehouse_detail(request, pk):
    try:
        w = Warehouse.objects.get(pk=pk)
    except Warehouse.DoesNotExist:
        return JsonResponse({"error": "Warehouse not found"}, status=404)

    if request.method == "PUT":
        data = json.loads(request.body)
        if 'name' in data: w.name = data['name']
        if 'address' in data: w.address = data['address']
        w.save()
        return JsonResponse({"message": "Warehouse updated"})
    elif request.method == "DELETE":
        w.delete()
        return JsonResponse({"message": "Warehouse deleted"})
    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def location_detail(request, pk):
    try:
        loc = Location.objects.get(pk=pk)
    except Location.DoesNotExist:
        return JsonResponse({"error": "Location not found"}, status=404)

    if request.method == "PUT":
        data = json.loads(request.body)
        if 'name' in data: loc.name = data['name']
        if 'warehouse_id' in data: loc.warehouse_id = data['warehouse_id']
        loc.save()
        return JsonResponse({"message": "Location updated"})
    elif request.method == "DELETE":
        loc.delete()
        return JsonResponse({"message": "Location deleted"})
    return JsonResponse({"error": "Method not allowed"}, status=405)

# --- OPERATIONS (CRUD + Actions) ---
@csrf_exempt
def receipts(request):
    if request.method == "GET":
        data = list(Receipt.objects.annotate(
            warehouse_name=F('warehouse__name')
        ).values('id', 'ref', 'supplier_name', 'warehouse_name', 'status', 'scheduled_date'))
        return JsonResponse(data, safe=False)

    elif request.method == "POST":
        data = json.loads(request.body)
        try:
            return receive_stock(data)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
def deliveries(request):
    if request.method == "GET":
        data = list(Delivery.objects.annotate(
            warehouse_name=F('warehouse__name')
        ).values('id', 'ref', 'customer_name', 'warehouse_name', 'status', 'scheduled_date'))
        return JsonResponse(data, safe=False)

    elif request.method == "POST":
        data = json.loads(request.body)
        try:
            return deliver_stock(data)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
def transfers(request):
    if request.method == "GET":
        data = list(InternalTransfer.objects.annotate(
            from_loc=F('from_location__name'),
            to_loc=F('to_location__name')
        ).values('id', 'ref', 'from_loc', 'to_loc', 'status', 'created_at'))
        return JsonResponse(data, safe=False)
        
    elif request.method == "POST":
        data = json.loads(request.body)
        try:
            return transfer_stock(data)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

@csrf_exempt
def adjustments(request):
    if request.method == "GET":
        data = list(Adjustment.objects.annotate(
            loc_name=F('location__name'),
            user_name=F('user__username')
        ).values('id', 'ref', 'loc_name', 'reason', 'user_name', 'status', 'created_at'))
        return JsonResponse(data, safe=False)
    
    elif request.method == "POST":
        data = json.loads(request.body)
        try:
            return adjust_stock(data, request.user if request.user.is_authenticated else None)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

def history(request):
    data = []
    qs = StockLedger.objects.select_related('product', 'location__warehouse').order_by('-created_at')[:50]
    for move in qs:
        data.append({
            "id": move.id,
            "date": move.created_at.strftime("%Y-%m-%d %H:%M"),
            "ref": move.reference_id,
            "type": move.operation_type,
            "product": move.product.name,
            "location": f"{move.location.warehouse.name} - {move.location.name}",
            "qty": str(move.quantity) if move.quantity < 0 else f"+{move.quantity}"
        })
    return JsonResponse(data, safe=False)