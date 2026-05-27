from django.conf import settings
from django.http import HttpResponseForbidden


class RestrictDjangoAdminMiddleware:
    """
    Limite l'acces a /admin/ aux IP listees dans ADMIN_ALLOWED_IPS (comma-separated).
    Si la variable est vide, l'acces reste autorise (configurer en production).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path or ''
        if path.startswith('/admin/'):
            allowed = getattr(settings, 'ADMIN_ALLOWED_IPS', []) or []
            if allowed:
                ip = request.META.get('REMOTE_ADDR')
                xff = request.META.get('HTTP_X_FORWARDED_FOR')
                if xff:
                    ip = xff.split(',')[0].strip()
                if ip not in allowed:
                    return HttpResponseForbidden(
                        'Acces a l\'administration Django refuse pour cette adresse.'
                    )
        return self.get_response(request)
