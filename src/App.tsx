import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { fetchMe } from './api/client';
import { useAuthStore } from './store/useAuthStore';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Catalog from './pages/Catalog';
import Cart from './pages/Cart';
import Consultation from './pages/Consultation';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';

export default function App() {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          let token = await user.getIdToken();
          let data = await fetchMe(token);
          if (data.claims_out_of_sync) {
            token = await user.getIdToken(true);
            data = await fetchMe(token);
          }
          setProfile({
            uid: data.uid || user.uid,
            email: data.email || user.email || '',
            role: data.role as any,
            nom: data.nom,
            prenom: data.prenom,
          });
        } catch (error) {
          console.error('Profil API indisponible (verifiez VITE_API_URL et Firebase Admin sur le backend):', error);
          const label = user.displayName?.trim() || '';
          const parts = label.split(/\s+/).filter(Boolean);
          setProfile({
            uid: user.uid,
            email: user.email || '',
            role: 'CLIENT',
            prenom: parts[0] || '',
            nom: parts.slice(1).join(' ') || '',
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return (
    <Router>
      <div className="min-h-screen bg-velvet-black text-pure-white selection:bg-glow-green selection:text-velvet-black overflow-x-hidden flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/consultation" element={<Consultation />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Dashboard />} />
            <Route path="/scanner" element={<Scanner />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}




