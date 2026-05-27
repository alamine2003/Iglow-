from django.core.management.base import BaseCommand

from api.services.user_sync import dedupe_all_users_by_email


class Command(BaseCommand):
    help = (
        'Fusionne les utilisateurs Django en double ayant le meme email '
        '(souvent createsuperuser + compte Firebase).'
    )

    def handle(self, *args, **options):
        count = dedupe_all_users_by_email()
        if count:
            self.stdout.write(self.style.SUCCESS(f'{count} compte(s) fusionne(s).'))
        else:
            self.stdout.write(self.style.SUCCESS('Aucun doublon par email trouve.'))
