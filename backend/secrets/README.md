# Credentials Firebase Admin (backend Django)

Ce dossier contient la **cle de compte de service** utilisee par le backend pour :

- verifier les jetons `Authorization: Bearer ...` du frontend ;
- synchroniser les utilisateurs Firebase vers PostgreSQL ;
- pousser les **Custom Claims** (`role`, `is_admin`).

## Etapes (une seule fois)

1. Ouvrez la [Console Firebase](https://console.firebase.google.com/project/gen-lang-client-0374328458/settings/serviceaccounts/adminsdk).
2. Onglet **Comptes de service** → **Generer une nouvelle cle privee** (JSON).
3. Renommez le fichier telecharge en **`firebase-service-account.json`** et placez-le **dans ce dossier** (`backend/secrets/`).
4. Verifiez que `backend/.env` contient :
   ```
   FIREBASE_CREDENTIALS_PATH=/app/secrets/firebase-service-account.json
   ```
5. Verifiez la detection des credentials :
   ```powershell
   docker compose exec web python manage.py check_firebase
   ```
6. Redemarrez Docker si besoin :
   ```powershell
   docker compose down
   docker compose up --build
   ```

## Securite

- **Ne commitez jamais** ce fichier JSON (il est ignore par git).
- Ne partagez pas la cle publiquement.

## Connexion utilisateur (frontend)

La connexion email/mot de passe se fait dans **Firebase Authentication**, pas dans Django `/admin/`.

- Activez **Email/Password** : [Sign-in method](https://console.firebase.google.com/project/gen-lang-client-0374328458/authentication/providers)
- Sur `/login` : utilisez d'abord **Creer un compte**, puis **Se connecter** avec les memes identifiants.

## Commande : pousser les roles vers Firebase (`firebase_push_claims`)

Une fois les credentials ci-dessus en place, cette commande recopie le **role Django** (`api_user.role`) vers les **Custom Claims** Firebase (`role`, `is_admin`).

### Syntaxe

```powershell
docker compose exec web python manage.py firebase_push_claims <email_ou_firebase_uid>
```

Exemple :

```powershell
docker compose exec web python manage.py firebase_push_claims youcomputing2@gmail.com
```

### Quand l'utiliser

- Apres avoir change le role d'un utilisateur dans **Django admin** (`/admin/` → Utilisateurs).
- L'utilisateur doit s'etre connecte au moins une fois sur le site (pour avoir un `firebase_uid` en base).

### Apres la commande

L'utilisateur doit **se reconnecter** (ou rafraichir le jeton Firebase) pour que le dashboard voie le nouveau role.

### Documentation complete

Voir [../README.md](../README.md) (section **Commande `firebase_push_claims`**) pour le detail, les limites de la commande et un exemple pas a pas.
