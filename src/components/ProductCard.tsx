import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

export interface Product {
  id: string;
  nom: string;
  prix: number;
  desc: string;
  stock: number;
  image: string;
  categoryId?: string;
  createdAt?: string;
}

export interface ProductCardProps {
  product: Product;
  key?: string | number;
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      nom: product.nom,
      prix: product.prix,
      quantity: 1,
      image: product.image
    });
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="glass p-6 flex flex-col gap-4 group"
    >
      <div className="flex justify-between items-start">
        <div className="badge">Must-have 2026</div>
        {product.stock < 10 && product.stock > 0 && (
          <div className="text-[10px] uppercase bg-skin-pink/20 text-skin-pink px-2.5 py-1 rounded">
            Plus que {product.stock}
          </div>
        )}
        {product.stock === 0 && (
          <div className="text-[10px] uppercase bg-red-500/20 text-red-500 px-2.5 py-1 rounded">
            Rupture
          </div>
        )}
      </div>

      <div className="w-full h-[180px] bg-white/5 rounded-2xl flex items-center justify-center border border-dashed border-glass-border overflow-hidden relative">
        <img 
          src={product.image || `https://picsum.photos/seed/${product.id}/400/400`} 
          alt={product.nom}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
      </div>

      <h3 className="text-2xl font-bold">{product.nom}</h3>
      <p className="text-[13px] opacity-60 leading-relaxed line-clamp-2">{product.desc}</p>
      
      <div className="text-[32px] font-light">{product.prix} FCFA</div>
      
      <button 
        onClick={handleAddToCart}
        disabled={product.stock === 0}
        className="bg-transparent border border-glow-green text-glow-green p-3 rounded-xl font-bold text-center hover:bg-glow-green/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
      >
        <ShoppingCart className="w-4 h-4" />
        AJOUTER AU PANIER
      </button>
    </motion.div>
  );
}
