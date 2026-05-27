from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsStaffRole(BasePermission):
    """Ecriture reservee aux roles back-office."""

    allowed_roles = ('ADMINISTRATEUR', 'GESTIONNAIRE')

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return getattr(user, 'role', None) in self.allowed_roles


class IsAdministrateur(BasePermission):
    allowed_roles = ('ADMINISTRATEUR',)

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return getattr(user, 'role', None) in self.allowed_roles


class IsCoachOrStaff(BasePermission):
    """Lecture/écriture back-office incluant les coaches."""

    allowed_roles = ('ADMINISTRATEUR', 'GESTIONNAIRE', 'COACH')

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return getattr(user, 'role', None) in self.allowed_roles


class ReadOnlyOrStaff(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'role', None) in (
            'ADMINISTRATEUR', 'GESTIONNAIRE',
        ))
