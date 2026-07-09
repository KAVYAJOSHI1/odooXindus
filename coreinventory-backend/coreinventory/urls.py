from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings
import os

def render_frontend(request, path=''):
    if not path or path == '/':
        path = 'index.html'
    
    # If the file exists in the frontend directory, serve it natively via runserver
    full_path = os.path.join(settings.FRONTEND_DIR, path)
    if os.path.exists(full_path):
        return serve(request, path, document_root=settings.FRONTEND_DIR)
        
    # default SPA/index behavior
    return serve(request, 'index.html', document_root=settings.FRONTEND_DIR)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('inventory.urls')),
    re_path(r'^(.*)$', render_frontend),
]