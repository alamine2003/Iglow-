import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { apiFetch, fetchMe } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { Sparkles, Bug } from 'lucide-react';

const getFirebaseAuthErrorMessage = (error: any, mode: 'login' | 'signup' = 'login') => {
  switch (error?.code) {
    case 'auth/operation-not-allowed':
      return "La connexion par email/mot de passe n'est pas active dans Firebase. Activez-la dans Authentication > Sign-in method.";
    case 'auth/invalid-email':
      return "L'adresse email est invalide.";
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return mode === 'login'
        ? "Email ou mot de passe incorrect. Si vous n'avez pas encore de compte Firebase, cliquez sur « Creer un compte » (ce n'est pas le compte Django /admin/)."
        : 'Impossible de creer le compte. Verifiez email et mot de passe (6 caracteres minimum).';
    case 'auth/email-already-in-use':
      return 'Cet email est deja utilise.';
    case 'auth/weak-password':
      return 'Mot de passe trop faible (minimum 6 caracteres).';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Reessayez dans quelques minutes.';
    default:
      return error?.message || 'Une erreur est survenue lors de la connexion.';
  }
};

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setProfile } = useAuthStore();

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithPopup(auth, googleProvider);

      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(getFirebaseAuthErrorMessage(err, 'login'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (mode: 'login' | 'signup') => {
    if (!email || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(getFirebaseAuthErrorMessage(err, mode));
    } finally {
      setLoading(false);
    }
  };

  // DEV ONLY: aligne role COACH en Django + Custom Claims Firebase
  const forceCoachLogin = async () => {
    if (!auth.currentUser) {
      setError("Connectez-vous d'abord, puis utilisez ce raccourci pour passer en COACH (backend DEBUG + Firebase Admin).");
      return;
    }

    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const res = await apiFetch('/api/dev/promote-coach/', token, { method: 'POST' });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      await auth.currentUser.getIdToken(true);
      const fresh = await fetchMe(await auth.currentUser.getIdToken());
      setProfile({
        uid: fresh.uid || auth.currentUser.uid,
        email: fresh.email || auth.currentUser.email || '',
        role: fresh.role as any,
        nom: fresh.nom,
        prenom: fresh.prenom,
      });
      alert('Role COACH applique (Django + claims Firebase).');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('Erreur promotion COACH : ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-28 pb-20 relative overflow-hidden">
      <div className="bg-glow-orb glow-1 top-[-100px] right-[-100px]" />
      <div className="bg-glow-orb glow-2 bottom-[-100px] left-[-100px]" />
      
      <div className="glass p-12 max-w-md w-full mx-4 text-center relative z-10">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-glass-border relative group">
          <Sparkles className="w-10 h-10 text-glow-green" />
          
          {/* Hidden Dev Button */}
          <button 
            onClick={forceCoachLogin}
            className="absolute -top-2 -right-2 p-2 bg-velvet-black rounded-full border border-glass-border opacity-0 group-hover:opacity-100 transition-opacity"
            title="[DEV] Forcer le rôle COACH"
          >
            <Bug className="w-4 h-4 text-skin-pink" />
          </button>
        </div>
        
        <h1 className="text-3xl font-display font-bold mb-4">Connexion</h1>
        <p className="text-pure-white/70 mb-8">
          Accédez à votre espace personnel, vos consultations et vos commandes.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-glass-border text-pure-white placeholder:text-pure-white/50 focus:outline-none focus:ring-2 focus:ring-glow-green/70"
            disabled={loading}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-glass-border text-pure-white placeholder:text-pure-white/50 focus:outline-none focus:ring-2 focus:ring-glow-green/70"
            disabled={loading}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleEmailAuth('login')}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-glow-green text-velvet-black font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Se connecter
            </button>
            <button
              onClick={() => handleEmailAuth('signup')}
              disabled={loading}
              className="w-full py-3 rounded-xl border border-glass-border bg-white/5 text-pure-white font-semibold hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Creer un compte
            </button>
          </div>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-glass-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-3 bg-velvet-black text-pure-white/60">ou</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 rounded-xl bg-white text-velvet-black font-bold text-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Continuer avec Google
        </button>

        <p className="mt-6 text-center text-sm text-pure-white/50">
          En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
        </p>
      </div>
    </div>
  );
}
