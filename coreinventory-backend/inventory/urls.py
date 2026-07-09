from django.urls import path
from . import views

urlpatterns = [

    path("api/auth/login/", views.api_login),
    path("api/auth/signup/", views.api_signup),
    path("api/auth/me/", views.api_me),
    path("api/auth/logout/", views.api_logout),

    path("api/products/", views.products),
    path("api/products/<int:pk>/", views.product_detail),
    path("api/warehouses/", views.warehouses),
    path("api/warehouses/<int:pk>/", views.warehouse_detail),
    path("api/locations/", views.locations),
    path("api/locations/<int:pk>/", views.location_detail),
    path("api/dashboard/", views.dashboard),
    path("api/stock-alerts/", views.stock_alerts),

    path("api/receipts/", views.receipts),
    path("api/deliveries/", views.deliveries),
    path("api/transfers/", views.transfers),
    path("api/adjustments/", views.adjustments),
    path("api/history/", views.history),

]