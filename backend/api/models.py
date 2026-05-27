from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission

class User(AbstractUser):
    ROLE_CHOICES = (
        ('CLIENT', 'Client'),
        ('COACH', 'Coach'),
        ('GESTIONNAIRE', 'Gestionnaire'),
        ('ADMINISTRATEUR', 'Administrateur'),
    )
    firebase_uid = models.CharField(max_length=128, unique=True, null=True, blank=True, db_index=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CLIENT')
    phone = models.CharField(max_length=20, blank=True, null=True)
    groups = models.ManyToManyField(Group, related_name='api_users')
    user_permissions = models.ManyToManyField(Permission, related_name='api_users')

class ProductCategory(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name_plural = 'Product categories'

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.PROTECT,
        related_name='products',
    )
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Order(models.Model):
    STATUS_CHOICES = (
        ('EN_ATTENTE', 'En attente'),
        ('PAYE', 'Payé'),
        ('EN_PREPARATION', 'En préparation'),
        ('EN_LIVRAISON', 'En livraison'),
        ('LIVRE', 'Livré'),
        ('ANNULE', 'Annulé'),
    )
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    order_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='EN_ATTENTE')
    total = models.DecimalField(max_digits=10, decimal_places=2)
    line_items = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Ticket(models.Model):
    STATUS_CHOICES = (
        ('OUVERT', 'Ouvert'),
        ('FERME', 'Fermé'),
    )
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tickets')
    subject = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OUVERT')
    created_at = models.DateTimeField(auto_now_add=True)


class TicketMessage(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ticket_messages')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
