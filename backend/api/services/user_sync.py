import logging

from django.contrib.auth import get_user_model
from django.db.models import Count
from firebase_admin import auth as firebase_auth

from api.firebase_service import initialize_firebase

logger = logging.getLogger(__name__)
User = get_user_model()

VALID_ROLES = {'CLIENT', 'COACH', 'GESTIONNAIRE', 'ADMINISTRATEUR'}
ROLE_RANK = {'CLIENT': 0, 'COACH': 1, 'GESTIONNAIRE': 2, 'ADMINISTRATEUR': 3}


def claims_to_role(decoded: dict) -> str | None:
    """Lit le role depuis les Custom Claims du jeton Firebase."""
    if decoded.get('is_admin') is True:
        return 'ADMINISTRATEUR'
    role = decoded.get('role')
    if role in VALID_ROLES:
        return role
    return None


def _pick_best_role(*roles: str) -> str:
    best = 'CLIENT'
    for role in roles:
        if role in ROLE_RANK and ROLE_RANK[role] > ROLE_RANK.get(best, 0):
            best = role
    return best


def _select_primary_user(matches: list, uid: str) -> User:
    """Choisit le compte a conserver (meilleur role + firebase_uid correspondant)."""
    uid_matches = [u for u in matches if u.firebase_uid == uid]
    pool = uid_matches if uid_matches else matches
    return max(
        pool,
        key=lambda u: (ROLE_RANK.get(u.role, 0), 1 if u.firebase_uid else 0, u.pk),
    )


def _apply_role_from_claims(user: User, claim_role: str | None, uid: str) -> list[str]:
    """
    Aligne role Django / Firebase sans retrograder un admin deja promu en base.
    Si la base a un role plus eleve que le jeton, on repousse les claims Firebase.
    """
    updated: list[str] = []
    if not claim_role:
        return updated

    db_rank = ROLE_RANK.get(user.role, 0)
    claim_rank = ROLE_RANK.get(claim_role, 0)

    if claim_rank >= db_rank:
        if user.role != claim_role:
            user.role = claim_role
            updated.append('role')
    elif user.firebase_uid:
        try:
            push_role_to_firebase(user.firebase_uid, user.role)
        except Exception as exc:
            logger.warning('Repousse role Django vers Firebase: %s', exc)

    return updated


def merge_users_into_primary(primary: User, duplicates: list) -> User:
    """Fusionne commandes/tickets et droits staff; supprime les doublons meme email."""
    from api.models import Order, Ticket

    for other in duplicates:
        if other.pk == primary.pk:
            continue
        primary.is_staff = primary.is_staff or other.is_staff
        primary.is_superuser = primary.is_superuser or other.is_superuser
        primary.role = _pick_best_role(primary.role, other.role)
        if not primary.firebase_uid and other.firebase_uid:
            primary.firebase_uid = other.firebase_uid
        Order.objects.filter(client=other).update(client=primary)
        Ticket.objects.filter(client=other).update(client=primary)
        logger.info('Fusion utilisateur %s -> %s (email %s)', other.pk, primary.pk, primary.email)
        other.delete()

    primary.save()
    return primary


def dedupe_all_users_by_email() -> int:
    """Fusionne les comptes partageant le meme email (ex. createsuperuser + Firebase)."""
    merged = 0
    dup_emails = (
        User.objects.exclude(email='')
        .values('email')
        .annotate(c=Count('id'))
        .filter(c__gt=1)
    )
    for row in dup_emails:
        email = row['email']
        users = list(User.objects.filter(email__iexact=email).order_by('id'))
        if len(users) < 2:
            continue
        primary = max(
            users,
            key=lambda u: (ROLE_RANK.get(u.role, 0), 1 if u.firebase_uid else 0),
        )
        others = [u for u in users if u.pk != primary.pk]
        merge_users_into_primary(primary, others)
        merged += len(others)
    return merged


def push_role_to_firebase(firebase_uid: str, role: str) -> None:
    """Ecrit les Custom Claims Firebase alignes sur le User Django (role + is_admin)."""
    initialize_firebase()
    claims = {
        'role': role,
        'is_admin': role == 'ADMINISTRATEUR',
    }
    firebase_auth.set_custom_user_claims(firebase_uid, claims)


def sync_user_from_decoded_token(decoded: dict) -> User:
    """
    Cree ou met a jour le User Django a partir du jeton Firebase (uid, email, claims).
    Un seul enregistrement par email (fusion des doublons createsuperuser / Firebase).
    """
    uid = decoded.get('uid')
    if not uid:
        raise ValueError('Jeton Firebase sans uid')

    email = (decoded.get('email') or '').strip()
    claim_role = claims_to_role(decoded)

    try:
        user = User.objects.get(firebase_uid=uid)
        if email:
            dupes = list(User.objects.filter(email__iexact=email).exclude(pk=user.pk))
            if dupes:
                user = merge_users_into_primary(user, dupes)
        updated_fields = []
        if email and user.email != email:
            user.email = email
            updated_fields.append('email')
        updated_fields.extend(_apply_role_from_claims(user, claim_role, uid))
        if updated_fields:
            user.save(update_fields=updated_fields)
        return user
    except User.DoesNotExist:
        pass

    if email:
        matches = list(User.objects.filter(email__iexact=email).order_by('id'))
        if matches:
            primary = _select_primary_user(matches, uid)
            others = [u for u in matches if u.pk != primary.pk]
            primary.firebase_uid = uid
            if claim_role and ROLE_RANK.get(claim_role, 0) >= ROLE_RANK.get(primary.role, 0):
                primary.role = claim_role
            elif not primary.role:
                primary.role = 'CLIENT'
            primary.set_unusable_password()
            merge_users_into_primary(primary, others)
            try:
                push_role_to_firebase(uid, primary.role)
            except Exception as exc:
                logger.warning('Impossible de pousser les claims initiales vers Firebase: %s', exc)
            return primary

    role = claim_role or 'CLIENT'
    username = uid[:150]
    if User.objects.filter(username=username).exists():
        username = f'{uid[:120]}_iglow'[:150]

    user = User(
        username=username,
        email=email or f'{uid}@firebase.local',
        firebase_uid=uid,
        role=role,
    )
    user.set_unusable_password()
    user.save()

    try:
        push_role_to_firebase(uid, role)
    except Exception as exc:
        logger.warning('Impossible de pousser les claims initiales vers Firebase: %s', exc)

    return user
