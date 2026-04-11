from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, TemplateViewSet

router = DefaultRouter()
router.register(r'templates', TemplateViewSet, basename='template')
router.register(r'', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
]
