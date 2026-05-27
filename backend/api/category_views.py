from django.utils.text import slugify
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from api.authentication import FirebaseAuthentication
from api.permissions import IsStaffRole
from .models import ProductCategory
from .serializers import ProductCategorySerializer


class ProductCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    authentication_classes = [FirebaseAuthentication]
    lookup_field = 'pk'

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsStaffRole()]

    def perform_create(self, serializer):
        data = serializer.validated_data
        slug = data.get('slug') or slugify(data['name'])
        serializer.save(slug=slug)

    def perform_update(self, serializer):
        data = serializer.validated_data
        slug = data.get('slug')
        if slug is None and 'name' in data:
            slug = slugify(data['name'])
        if slug:
            serializer.save(slug=slug)
        else:
            serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.products.exists():
            return Response(
                {
                    'detail': (
                        'Impossible de supprimer cette categorie : '
                        f'{instance.products.count()} produit(s) y sont rattaches.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
