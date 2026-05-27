from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.authentication import FirebaseAuthentication
from api.services.user_sync import push_role_to_firebase


class MeView(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        decoded = getattr(request, 'auth', None) or {}
        claim_role = decoded.get('role')
        claim_is_admin = decoded.get('is_admin')
        return Response({
            'uid': user.firebase_uid or decoded.get('uid'),
            'email': user.email,
            'role': user.role,
            'nom': user.last_name or '',
            'prenom': user.first_name or '',
            'phone': getattr(user, 'phone', '') or '',
            'claims': {
                k: decoded.get(k)
                for k in ('role', 'is_admin')
                if k in decoded
            },
            'claims_out_of_sync': bool(
                claim_role and claim_role != user.role
            ) or bool(
                claim_is_admin is True and user.role != 'ADMINISTRATEUR'
            ),
        })


class DevPromoteCoachView(APIView):
    """Reserve au developpement : aligne role COACH en DB + Custom Claims."""
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.DEBUG:
            return Response({'detail': 'Interdit.'}, status=403)
        user = request.user
        uid = user.firebase_uid
        if not uid:
            return Response({'detail': 'Utilisateur sans firebase_uid.'}, status=400)
        user.role = 'COACH'
        user.save(update_fields=['role'])
        push_role_to_firebase(uid, 'COACH')
        return Response({
            'role': user.role,
            'message': 'Role COACH applique (DB + Firebase claims). Rafraichissez le jeton (getIdToken(true)).',
        })
