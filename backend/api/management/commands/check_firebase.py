from django.core.management.base import BaseCommand

from api.firebase_service import _credential_candidates, is_firebase_configured


class Command(BaseCommand):
    help = 'Verifie que les credentials Firebase Admin sont accessibles.'

    def handle(self, *args, **options):
        if is_firebase_configured():
            self.stdout.write(self.style.SUCCESS('Firebase Admin : credentials detectes.'))
            for path in _credential_candidates():
                if path:
                    exists = 'OK' if __import__('os').path.isfile(path) else 'absent'
                    self.stdout.write(f'  - {path} [{exists}]')
            return

        self.stderr.write(self.style.ERROR(
            'Firebase Admin : AUCUNE credential trouvee.\n'
            'Voir backend/secrets/README.md'
        ))
        raise SystemExit(1)
