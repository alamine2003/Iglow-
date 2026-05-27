from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Product, ProductCategory, Order, Ticket, TicketMessage

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        ('Informations iGlow', {'fields': ('role', 'phone')}),
    )

@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'sort_order', 'created_at')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'stock', 'created_at')
    list_filter = ('category',)
    search_fields = ('name', 'description')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'client', 'status', 'total', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('order_number', 'client__username', 'client__email')

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('subject', 'client', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('subject', 'client__username', 'client__email')


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'sender', 'text', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('text', 'ticket__subject', 'sender__email')
