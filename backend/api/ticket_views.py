from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from api.authentication import FirebaseAuthentication
from api.permissions import IsCoachOrStaff
from .models import Ticket, TicketMessage
from .serializers import TicketMessageSerializer, TicketSerializer


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.select_related('client').order_by('-created_at')
    serializer_class = TicketSerializer
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        role = getattr(self.request.user, 'role', None)
        if role == 'CLIENT':
            return qs.filter(client=self.request.user)
        return qs

    def get_permissions(self):
        if self.action in ('create',):
            return [permissions.IsAuthenticated()]
        if self.action in ('partial_update', 'update', 'destroy'):
            role = getattr(self.request.user, 'role', None)
            if role == 'CLIENT':
                return [permissions.IsAuthenticated()]
            return [permissions.IsAuthenticated(), IsCoachOrStaff()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        role = getattr(self.request.user, 'role', None)
        if role == 'CLIENT':
            serializer.save(client=self.request.user)
        else:
            client = serializer.validated_data.get('client')
            if not client:
                raise ValidationError({'client': 'Client requis pour creer un ticket.'})
            serializer.save()

    def partial_update(self, request, *args, **kwargs):
        if getattr(request.user, 'role', None) == 'CLIENT':
            allowed = {'status'}
            if set(request.data.keys()) - allowed:
                raise PermissionDenied('Seul le statut peut etre modifie.')
        return super().partial_update(request, *args, **kwargs)


class TicketMessageViewSet(viewsets.ModelViewSet):
    serializer_class = TicketMessageSerializer
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'head', 'post']

    def get_queryset(self):
        qs = TicketMessage.objects.select_related('ticket', 'sender', 'ticket__client').order_by(
            'created_at'
        )
        ticket_id = self.request.query_params.get('ticket')
        if not ticket_id:
            return qs.none()

        qs = qs.filter(ticket_id=ticket_id)
        role = getattr(self.request.user, 'role', None)
        if role == 'CLIENT':
            qs = qs.filter(ticket__client=self.request.user)
        return qs

    def perform_create(self, serializer):
        ticket = serializer.validated_data['ticket']
        user = self.request.user
        role = getattr(user, 'role', None)

        if role == 'CLIENT':
            if ticket.client_id != user.id:
                raise PermissionDenied('Acces refuse a ce ticket.')
            if ticket.status == 'FERME':
                raise PermissionDenied('Ce ticket est ferme.')

        serializer.save(sender=user)
