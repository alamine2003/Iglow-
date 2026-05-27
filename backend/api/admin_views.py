from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from api.authentication import FirebaseAuthentication
from api.permissions import IsAdministrateur, IsStaffRole
from api.services.user_sync import push_role_to_firebase
from .models import User
from .serializers import UserRoleUpdateSerializer, UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    """Gestion des utilisateurs applicatifs (lecture staff, modification role admin)."""

    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    authentication_classes = [FirebaseAuthentication]
    http_method_names = ['get', 'head', 'patch']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated(), IsStaffRole()]
        if self.action == 'partial_update':
            return [permissions.IsAuthenticated(), IsAdministrateur()]
        return [permissions.IsAuthenticated(), IsAdministrateur()]

    def get_serializer_class(self):
        if self.action == 'partial_update':
            return UserRoleUpdateSerializer
        return UserSerializer

    def partial_update(self, request, *args, **kwargs):
        if set(request.data.keys()) - {'role'}:
            raise PermissionDenied('Seul le champ role peut etre modifie.')
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if user.firebase_uid and 'role' in request.data:
            try:
                push_role_to_firebase(user.firebase_uid, user.role)
            except Exception:
                pass
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
