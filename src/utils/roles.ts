import type { UserProfile } from '../store/useAuthStore';

export type AppRole = UserProfile['role'];

export function isAdministrateur(role?: string | null) {
  return role === 'ADMINISTRATEUR';
}

export function isGestionnaire(role?: string | null) {
  return role === 'GESTIONNAIRE';
}

export function isStaff(role?: string | null) {
  return role === 'ADMINISTRATEUR' || role === 'GESTIONNAIRE';
}

export function isCoach(role?: string | null) {
  return role === 'COACH';
}

export function canAccessAdminPanel(role?: string | null) {
  return isStaff(role);
}

/** Ajout / modification produits et stocks (gestionnaire + administrateur). */
export function canManageProducts(role?: string | null) {
  return isStaff(role);
}

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMINISTRATEUR: 'Administrateur',
  GESTIONNAIRE: 'Gestionnaire',
  COACH: 'Coach',
  CLIENT: 'Client',
};
