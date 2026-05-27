/** Base URL du backend Django (declaree dans .env : VITE_API_URL). */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
