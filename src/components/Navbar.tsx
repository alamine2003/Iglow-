import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Sun, Moon, Shield, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { isAdministrateur, isCoach, isStaff, ROLE_LABELS } from '../utils/roles';
import { useCartStore } from '../store/useCartStore';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Navbar() {
  const { user, profile } = useAuthStore();
  const items = useCartStore((state) => state.items);
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    // Check local storage for theme preference on mount
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsLightMode(true);
      document.documentElement.classList.add('light-mode');
    }
  }, []);

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
    if (!isLightMode) {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-7xl mx-auto">
      <nav className="glass px-6 py-3 flex justify-between items-center">
        <Link to="/" className="text-[28px] font-black tracking-tighter text-gradient uppercase">
          iGLOW.
        </Link>

        <div className="hidden md:flex items-center space-x-8">
          <Link to="/catalog" className="text-pure-white text-sm uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity">Catalogue</Link>
          <Link to="/consultation" className="text-pure-white text-sm uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity">Consultation</Link>
          
          {(isStaff(profile?.role) || isCoach(profile?.role)) && (
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-sm uppercase tracking-widest text-skin-pink opacity-90 hover:opacity-100 transition-opacity"
            >
              {isAdministrateur(profile?.role) ? (
                <Shield className="w-4 h-4" />
              ) : (
                <LayoutDashboard className="w-4 h-4" />
              )}
              {isAdministrateur(profile?.role)
                ? 'Administration'
                : isStaff(profile?.role)
                  ? 'Pilotage'
                  : 'Espace Coach'}
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleTheme} 
            className="text-pure-white/70 hover:text-glow-green transition-colors p-2 rounded-full hover:bg-white/5"
            title={isLightMode ? "Passer en mode sombre" : "Passer en mode clair"}
          >
            {isLightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <Link to="/cart" className="bg-glow-green text-velvet-black px-5 py-2 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(0,255,136,0.5)] hover:shadow-[0_0_25px_rgba(0,255,136,0.8)] transition-shadow">
            PANIER ({cartCount})
          </Link>

          {user && profile && (
            <span className="hidden lg:inline text-[10px] uppercase tracking-wider text-pure-white/40 border border-glass-border px-2 py-1 rounded-full">
              {ROLE_LABELS[profile.role]}
            </span>
          )}

          {user ? (
            <div className="flex items-center space-x-4 ml-4">
              <Link to="/dashboard" className="text-pure-white hover:text-glow-green transition-colors" title="Mon espace">
                <User className="w-5 h-5" />
              </Link>
              <button onClick={handleLogout} className="text-pure-white hover:text-skin-pink transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-pure-white text-sm uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity ml-4">
              Connexion
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
