# iGlow Backend (Django)

Backend Django + DRF pour l'application iGlow. Authentification applicative via **Firebase** (jeton JWT), synchronisation des utilisateurs vers **PostgreSQL**, et administration technique via **Django Admin**.

## Prérequis

- Docker et Docker Compose (depuis la racine du monorepo `iglow/`)

## Lancement rapide

À la racine du projet (`iglow/`) :

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| API | http://localhost:8000/api/ |
| Swagger | http://localhost:8000/api/docs/ |
| Admin Django | http://localhost:8000/admin/ |
| pgAdmin | http://localhost:5050 |

Variables d'environnement : copier `backend/.env.example` vers `backend/.env` et renseigner les valeurs (voir aussi `secrets/README.md` pour Firebase Admin).

## Stack technique

- Django 5.x
- Django REST Framework
- PostgreSQL 15
- Redis et Celery
- **Firebase Admin SDK** (verification des ID tokens + Custom Claims)
- drf-spectacular (OpenAPI / Swagger)

## Architecture d'authentification

### Trois piliers

1. **Firebase = source de verite (identite)**  
   Chaque connexion sur le frontend (email/mot de passe ou Google) cree ou met a jour un `User` Django via `api/services/user_sync.py`, a chaque requete API portant `Authorization: Bearer <idToken>`.

2. **Custom Claims (roles dans le JWT)**  
   Le backend peut ecrire dans Firebase les claims `role` et `is_admin`. Le frontend et l'API s'appuient sur le jeton, pas sur les sessions Django.

3. **Admin Django vs dashboard applicatif**  
   - `/admin/` : maintenance technique (superuser Django, sessions classiques).  
   - Dashboard React : donnees via l'API securisee par jeton Firebase (`/api/me/`, `/api/orders/`, etc.).

Fichiers utiles : `api/authentication.py`, `api/services/user_sync.py`, `api/auth_views.py`.

## Types de comptes

| Compte | Creation | Usage |
|--------|----------|--------|
| **Superuser Django** | Ligne de commande (`createsuperuser`) | `/admin/` uniquement |
| **Utilisateur application** | Page login React / Firebase | Site + API avec Bearer token |
| **Role applicatif** (COACH, ADMINISTRATEUR, etc.) | Django admin + commande `firebase_push_claims` | Dashboard, droits API, claims JWT |

### Superuser Django (admin technique)

Ne sert **pas** a se connecter sur `/login` du frontend. Reserve a l'interface Django :

```bash
docker compose exec web python manage.py createsuperuser
```

### Utilisateurs Firebase (site)

Crees sur http://localhost:3030/login :

1. **Creer un compte** (ou Google) — premiere inscription dans Firebase  
2. **Se connecter** — memes email / mot de passe  

Le profil Django est cree automatiquement au premier appel API authentifie (`GET /api/me/`).

## Firebase Admin SDK (obligatoire pour l'API)

Le backend doit verifier les jetons Firebase. Voir le guide detaille : **[secrets/README.md](secrets/README.md)**.

Verification rapide :

```bash
docker compose exec web python manage.py check_firebase
```

Reponse attendue : `Firebase Admin : credentials detectes.`

## Commande `firebase_push_claims`

### Syntaxe

```bash
docker compose exec web python manage.py firebase_push_claims <email_ou_firebase_uid>
```

Exemple :

```bash
docker compose exec web python manage.py firebase_push_claims you@exemple.com
```

On peut aussi passer le **firebase_uid** au lieu de l'email.

### A quoi elle sert

Cette commande **recopie le role Django vers Firebase** (Custom Claims). Elle ne cree pas de compte et ne modifie pas le role en base : elle **lit** le champ `role` deja present sur `api.User` et l'envoie a Firebase.

Etapes executees par la commande :

1. Recherche l'utilisateur dans **PostgreSQL** (par email ou `firebase_uid`).
2. Lit son **`role`** : `CLIENT`, `COACH`, `GESTIONNAIRE`, `ADMINISTRATEUR`.
3. Ecrit les **Custom Claims** Firebase pour ce compte :
   - `role` = valeur Django
   - `is_admin` = `true` uniquement si le role est `ADMINISTRATEUR`

Ces claims sont ensuite inclus dans le **jeton JWT** Firebase envoye par le frontend (`Authorization: Bearer ...`).

### Pourquoi c'est necessaire

Deux endroits stockent le role :

| Emplacement | Exemple de modification |
|-------------|-------------------------|
| **Django** (`api_user.role`) | Changement dans `/admin/` |
| **Firebase** (claims dans le JWT) | Ce que le front et l'API utilisent pour le dashboard |

Si vous changez le role **uniquement dans Django admin**, Firebase conserve l'ancien role dans le jeton tant que les claims ne sont pas repoussees. Cette commande **aligne Firebase sur Django**.

### Quand l'utiliser

- Apres avoir passe un utilisateur en **COACH**, **GESTIONNAIRE** ou **ADMINISTRATEUR** dans Django admin.
- L'utilisateur doit s'etre connecte **au moins une fois** sur le site (pour avoir un `firebase_uid` en base). Sinon la commande echoue avec : *pas encore synchronise avec Firebase*.

### Apres la commande (important)

L'utilisateur doit **obtenir un nouveau jeton** : les claims ne sont pas mises a jour dans un ancien token.

- Se deconnecter puis se reconnecter sur le site, ou  
- Cote client : `getIdToken(true)` sur Firebase Auth.

### Ce que la commande ne fait pas

- Ne **cree pas** de compte (ni Django, ni Firebase).
- Ne **remplace pas** `createsuperuser`.
- Ne **change pas** le role en base : elle envoie a Firebase le role **deja** defini en base.

### Exemple concret

1. L'utilisateur `client@exemple.com` se connecte une fois sur le site (profil Django cree, role `CLIENT`).
2. Dans `/admin/`, vous passez son role a **ADMINISTRATEUR**.
3. Vous lancez :
   ```bash
   docker compose exec web python manage.py firebase_push_claims client@exemple.com
   ```
4. L'utilisateur se reconnecte (ou rafraichit le jeton).
5. Le dashboard et l'API voient **ADMINISTRATEUR** dans le JWT (`is_admin: true`).

## Autres commandes utiles

```bash
# Migrations
docker compose exec web python manage.py migrate

# Verifier Firebase Admin
docker compose exec web python manage.py check_firebase
```

## Configuration (`backend/.env`)

| Variable | Role |
|----------|------|
| `FIREBASE_CREDENTIALS_PATH` | Chemin du JSON compte de service (ex. `/app/secrets/firebase-service-account.json`) |
| `FIREBASE_CREDENTIALS_JSON` | Alternative : JSON sur une ligne |
| `ADMIN_ALLOWED_IPS` | IPs autorisees pour `/admin/` (vide = pas de filtre) |

Frontend (racine du monorepo) : `VITE_API_URL=http://localhost:8000` dans un fichier `.env`.

## Endpoints API principaux

| Methode | Chemin | Auth |
|---------|--------|------|
| GET | `/api/me/` | Bearer Firebase |
| GET | `/api/products/` | Lecture publique |
| GET/POST | `/api/orders/`, `/api/tickets/` | Bearer Firebase |
| POST | `/api/dev/promote-coach/` | Bearer + `DEBUG=True` uniquement |

## Developpement

- Bouton cache sur la page login : promotion **COACH** (DB + claims) via `POST /api/dev/promote-coach/`.
- Documentation interactive : http://localhost:8000/api/docs/
