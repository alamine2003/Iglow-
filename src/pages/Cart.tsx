import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, CreditCard, ShoppingCart } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { addDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Cart() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsCheckingOut(true);
    try {
      const orderData = {
        num_commande: `IGLOW-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random() * 10000)}`,
        clientId: user.uid,
        status: 'EN_ATTENTE',
        total: total(),
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.prix
        })),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), orderData);
      clearCart();
      // Simulate Wave Payment redirect or success
      alert('Commande créée avec succès ! Redirection vers Wave (simulation)...');
      navigate('/profile');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-glass-border">
          <ShoppingCart className="w-10 h-10 text-pure-white/50" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-4">Votre panier est vide</h2>
        <p className="text-pure-white/50 mb-8">Découvrez nos produits pour révéler votre glow.</p>
        <button onClick={() => navigate('/catalog')} className="px-8 py-3 rounded-full bg-glow-green text-velvet-black font-semibold hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all">
          Parcourir le catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-20 relative">
      <div className="bg-glow-orb glow-1 top-[-100px] left-[-100px]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h1 className="text-4xl font-display font-bold mb-12">Votre <span className="text-gradient">Panier</span></h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {items.map((item) => (
              <motion.div 
                layout
                key={item.productId}
                className="glass p-4 flex items-center gap-6"
              >
                <img 
                  src={item.image || `https://picsum.photos/seed/${item.productId}/200/200`} 
                  alt={item.nom} 
                  className="w-24 h-24 rounded-xl object-cover border border-glass-border"
                  referrerPolicy="no-referrer"
                />
                
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-pure-white mb-1">{item.nom}</h3>
                  <p className="text-glow-green font-medium">{item.prix} FCFA</p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 rounded-full px-2 py-1 border border-glass-border">
                  <button 
                    onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-pure-white transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-4 text-center font-medium">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-pure-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button 
                  onClick={() => removeItem(item.productId)}
                  className="p-3 text-pure-white/50 hover:text-skin-pink transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="glass p-8 sticky top-32">
              <h3 className="text-xl font-display font-bold mb-6">Résumé de la commande</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-pure-white/70">
                  <span>Sous-total</span>
                  <span>{total()} FCFA</span>
                </div>
                <div className="flex justify-between text-pure-white/70">
                  <span>Livraison</span>
                  <span>Calculé à l'étape suivante</span>
                </div>
                <div className="h-px bg-white/10 w-full my-4" />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-glow-green">{total()} FCFA</span>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full py-4 rounded-xl bg-glow-green text-velvet-black font-bold text-lg flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(0,255,136,0.4)] transition-all disabled:opacity-50"
              >
                {isCheckingOut ? (
                  <div className="w-6 h-6 border-2 border-velvet-black/30 border-t-velvet-black rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Payer avec Wave
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
