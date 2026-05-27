from rest_framework import serializers

from .models import Product, ProductCategory, Order, Ticket, TicketMessage, User


class UserSerializer(serializers.ModelSerializer):
    uid = serializers.CharField(source='firebase_uid', read_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'uid',
            'email',
            'username',
            'first_name',
            'last_name',
            'role',
            'phone',
            'date_joined',
        )
        read_only_fields = ('id', 'uid', 'email', 'username', 'date_joined')


class UserRoleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('role',)


class ProductCategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = ('id', 'name', 'slug', 'sort_order', 'product_count', 'created_at')
        read_only_fields = ('id', 'created_at', 'product_count')

    def get_product_count(self, obj):
        return obj.products.count()


class ProductSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductCategory.objects.all(),
        source='category',
    )
    category = serializers.CharField(source='category.slug', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'description',
            'price',
            'stock',
            'category_id',
            'category',
            'category_name',
            'image',
            'image_url',
            'created_at',
        )
        read_only_fields = ('id', 'created_at', 'category', 'category_name', 'image_url')
        extra_kwargs = {
            'image': {'write_only': True, 'required': False},
        }

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            url = obj.image.url
            if request and url.startswith('/'):
                return request.build_absolute_uri(url)
            return url
        return obj.image_url or ''

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError('Le stock ne peut pas etre negatif.')
        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Le prix doit etre strictement positif.')
        return value


class OrderSerializer(serializers.ModelSerializer):
    """Aligne les noms avec le tableau de bord frontend (Firestore legacy)."""

    num_commande = serializers.CharField(source='order_number', read_only=True)
    clientId = serializers.SerializerMethodField()
    clientEmail = serializers.SerializerMethodField()
    clientName = serializers.SerializerMethodField()
    createdAt = serializers.SerializerMethodField()
    items = serializers.JSONField(source='line_items', required=False)

    class Meta:
        model = Order
        fields = (
            'id',
            'client',
            'order_number',
            'num_commande',
            'status',
            'total',
            'line_items',
            'items',
            'clientId',
            'clientEmail',
            'clientName',
            'createdAt',
            'created_at',
        )
        read_only_fields = ('id', 'num_commande', 'clientId', 'clientEmail', 'clientName', 'createdAt')

    def get_clientId(self, obj):
        client = getattr(obj, 'client', None)
        if client and getattr(client, 'firebase_uid', None):
            return client.firebase_uid
        return ''

    def get_clientEmail(self, obj):
        client = getattr(obj, 'client', None)
        return client.email if client else ''

    def get_clientName(self, obj):
        client = getattr(obj, 'client', None)
        if not client:
            return ''
        name = f'{client.first_name or ""} {client.last_name or ""}'.strip()
        return name or client.username

    def get_createdAt(self, obj):
        if obj.created_at:
            return obj.created_at.isoformat()
        return ''


class TicketSerializer(serializers.ModelSerializer):
    sujet = serializers.CharField(source='subject', read_only=True)
    clientId = serializers.SerializerMethodField()
    clientEmail = serializers.SerializerMethodField()
    clientName = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Ticket
        fields = (
            'id',
            'client',
            'subject',
            'sujet',
            'status',
            'createdAt',
            'clientId',
            'clientEmail',
            'clientName',
            'created_at',
        )
        read_only_fields = ('id', 'client', 'clientId', 'clientEmail', 'clientName', 'createdAt', 'sujet')
        extra_kwargs = {
            'subject': {'required': True},
            'status': {'required': False},
        }

    def get_clientId(self, obj):
        client = getattr(obj, 'client', None)
        if client and getattr(client, 'firebase_uid', None):
            return client.firebase_uid
        return ''

    def get_clientEmail(self, obj):
        client = getattr(obj, 'client', None)
        return client.email if client else ''

    def get_clientName(self, obj):
        client = getattr(obj, 'client', None)
        if not client:
            return ''
        name = f'{client.first_name or ""} {client.last_name or ""}'.strip()
        return name or client.username


class TicketMessageSerializer(serializers.ModelSerializer):
    senderId = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = TicketMessage
        fields = ('id', 'ticket', 'senderId', 'text', 'createdAt', 'created_at')
        read_only_fields = ('id', 'senderId', 'createdAt')

    def get_senderId(self, obj):
        if obj.sender and obj.sender.firebase_uid:
            return obj.sender.firebase_uid
        return str(obj.sender_id)
