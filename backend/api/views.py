from rest_framework import permissions, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from api.authentication import FirebaseAuthentication
from api.permissions import IsCoachOrStaff, IsStaffRole
from .models import Order, Product
from .serializers import OrderSerializer, ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').order_by('-created_at')
    serializer_class = ProductSerializer
    authentication_classes = [FirebaseAuthentication]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsStaffRole()]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related('client').order_by('-created_at')
    serializer_class = OrderSerializer
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ('partial_update', 'update', 'destroy', 'create'):
            return [permissions.IsAuthenticated(), IsCoachOrStaff()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        role = getattr(self.request.user, 'role', None)
        if role == 'CLIENT':
            return qs.filter(client=self.request.user)
        return qs


