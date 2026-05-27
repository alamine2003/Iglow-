from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .admin_views import UserViewSet
from .auth_views import DevPromoteCoachView, MeView
from .ticket_views import TicketMessageViewSet, TicketViewSet
from .category_views import ProductCategoryViewSet
from .views import OrderViewSet, ProductViewSet

router = DefaultRouter()
router.register(r'product-categories', ProductCategoryViewSet, basename='product-category')
router.register(r'products', ProductViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'tickets', TicketViewSet)
router.register(r'ticket-messages', TicketMessageViewSet, basename='ticket-message')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('me/', MeView.as_view(), name='api-me'),
    path('dev/promote-coach/', DevPromoteCoachView.as_view(), name='api-dev-promote-coach'),
    path('', include(router.urls)),
]
