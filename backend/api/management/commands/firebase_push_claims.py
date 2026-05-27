from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from api.services.user_sync import push_role_to_firebase

User = get_user_model()


class Command(BaseCommand):
    help = (
        'Recopie le role Django vers les Custom Claims Firebase '
        '(apres lecture dans l admin : demander au client un getIdToken(true)).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'identifier',
            help='firebase_uid ou email de l utilisateur',
        )

    def handle(self, *args, **options):
        ident = options['identifier'].strip()
        user = None
        if '@' in ident:
            user = User.objects.filter(email__iexact=ident).first()
        else:
            user = User.objects.filter(firebase_uid=ident).first()

        if not user:
            raise CommandError('Aucun utilisateur trouve pour : ' + ident)
        if not user.firebase_uid:
            raise CommandError(
                "Cet utilisateur n'a pas de firebase_uid (pas encore synchronise avec Firebase)."
            )

        push_role_to_firebase(user.firebase_uid, user.role)
        self.stdout.write(
            self.style.SUCCESS(
                f'Claims Firebase mis a jour pour {user.email} ({user.firebase_uid}) -> role={user.role}'
            )
        )
