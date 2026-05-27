import logging

from firebase_admin import auth as firebase_auth
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from api.firebase_service import initialize_firebase
from api.services.user_sync import sync_user_from_decoded_token

logger = logging.getLogger(__name__)


class FirebaseAuthentication(BaseAuthentication):
    """
    Authentifie via Authorization: Bearer <Firebase ID token>.
    Synchronise le User Django a chaque requete authentifiee.
    """

    keyword = 'Bearer'

    def authenticate(self, request):
        header = request.META.get('HTTP_AUTHORIZATION')
        if not header:
            return None
        parts = header.split()
        if len(parts) != 2 or parts[0].lower() != self.keyword.lower():
            return None
        raw_token = parts[1].strip()
        if not raw_token:
            return None

        try:
            initialize_firebase()
        except RuntimeError as exc:
            logger.error('Firebase Admin non configure: %s', exc)
            raise AuthenticationFailed(
                'Le serveur API n\'est pas configure pour Firebase. '
                'Placez le JSON du compte de service dans backend/secrets/firebase-service-account.json '
                'et redemarrez Docker (voir backend/secrets/README.md).'
            ) from exc

        try:
            decoded = firebase_auth.verify_id_token(raw_token)
        except Exception as exc:
            logger.debug('JWT Firebase invalide: %s', exc)
            raise AuthenticationFailed('Jeton Firebase invalide ou expire.') from exc

        try:
            user = sync_user_from_decoded_token(decoded)
        except Exception as exc:
            logger.exception('Echec sync utilisateur Firebase -> Django')
            raise AuthenticationFailed('Impossible de synchroniser le profil utilisateur.') from exc

        return user, decoded
