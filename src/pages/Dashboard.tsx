import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { isCoach, isStaff } from '../utils/roles';
import AdminDashboard from './AdminDashboard';
import ClientDashboard from './ClientDashboard';

export default function Dashboard() {
  const { user, profile, loading } = useAuthStore();

  if (loading || !user) {
    return (
      <div className="min-h-screen pt-32 flex justify-center">
        <div className="w-12 h-12 border-4 border-glow-green/30 border-t-glow-green rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-32 flex justify-center px-4">
        <p className="text-pure-white/60 text-center max-w-md">
          Profil indisponible. Verifiez la connexion API (VITE_API_URL) et les credentials Firebase Admin.
        </p>
      </div>
    );
  }

  if (isStaff(profile.role) || isCoach(profile.role)) {
    return <AdminDashboard />;
  }

  return <ClientDashboard />;
}
