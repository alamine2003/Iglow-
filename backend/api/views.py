import uuid
from datetime import date

from django.db import models, transaction
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

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
        if self.action in ('partial_update', 'update', 'destroy'):
            return [permissions.IsAuthenticated(), IsCoachOrStaff()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        order_number = f"IGLOW-{date.today().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        serializer.save(client=self.request.user, order_number=order_number)

    def get_queryset(self):
        qs = super().get_queryset()
        role = getattr(self.request.user, 'role', None)
        if role == 'CLIENT':
            return qs.filter(client=self.request.user)
        return qs

    @action(detail=False, methods=['post'], url_path='deduct-stock',
            permission_classes=[permissions.IsAuthenticated])
    @transaction.atomic
    def deduct_stock(self, request):
        items = request.data.get('items', [])
        if not items:
            return Response({'error': 'Aucun article fourni.'}, status=400)

        for item in items:
            product_id = item.get('productId')
            quantity = item.get('quantity', 0)

            if not product_id or quantity <= 0:
                return Response({'error': 'Données article invalides.'}, status=400)

            try:
                product = Product.objects.select_for_update().get(id=product_id)
            except Product.DoesNotExist:
                return Response({'error': f'Produit {product_id} introuvable.'}, status=404)

            if product.stock < quantity:
                return Response(
                    {'error': f'Stock insuffisant pour « {product.name} » '
                              f'(demandé : {quantity}, disponible : {product.stock}).'},
                    status=400,
                )
            product.stock -= quantity
            product.save(update_fields=['stock'])

        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'], url_path='restore-stock',
            permission_classes=[permissions.IsAuthenticated, IsCoachOrStaff])
    def restore_stock(self, request):
        items = request.data.get('items', [])
        if not items:
            return Response({'error': 'Aucun article fourni.'}, status=400)

        for item in items:
            product_id = item.get('productId')
            quantity = item.get('quantity', 0)
            if product_id and quantity > 0:
                Product.objects.filter(id=product_id).update(
                    stock=models.F('stock') + quantity
                )

        return Response({'status': 'ok'})


