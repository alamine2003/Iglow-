import json
import logging
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials

logger = logging.getLogger(__name__)

_initialized = False

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_CREDENTIALS_FILE = _BACKEND_DIR / 'secrets' / 'firebase-service-account.json'


def _credential_candidates() -> list[str]:
    env_path = os.environ.get('FIREBASE_CREDENTIALS_PATH', '').strip()
    candidates = [
        env_path,
        '/app/secrets/firebase-service-account.json',
        str(_DEFAULT_CREDENTIALS_FILE),
    ]
    seen: set[str] = set()
    ordered: list[str] = []
    for item in candidates:
        if item and item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def is_firebase_configured() -> bool:
    if os.environ.get('FIREBASE_CREDENTIALS_JSON', '').strip():
        return True
    return any(os.path.isfile(path) for path in _credential_candidates())


def _load_credentials():
    raw_json = os.environ.get('FIREBASE_CREDENTIALS_JSON', '').strip()
    if raw_json:
        return credentials.Certificate(json.loads(raw_json))

    for path in _credential_candidates():
        if os.path.isfile(path):
            logger.info('Firebase Admin: credentials depuis %s', path)
            return credentials.Certificate(path)

    return None


def initialize_firebase() -> None:
    global _initialized
    if _initialized:
        return

    try:
        firebase_admin.get_app()
    except ValueError:
        pass
    else:
        _initialized = True
        return

    cred = _load_credentials()
    if cred is None:
        raise RuntimeError(
            'Firebase Admin SDK non configure. '
            'Telechargez la cle de compte de service (JSON) depuis la console Firebase '
            f'(projet gen-lang-client-0374328458), enregistrez-la sous '
            f'backend/secrets/firebase-service-account.json, puis ajoutez dans backend/.env : '
            'FIREBASE_CREDENTIALS_PATH=/app/secrets/firebase-service-account.json'
        )

    firebase_admin.initialize_app(cred)
    _initialized = True
    logger.info('Firebase Admin SDK initialise.')
