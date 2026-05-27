import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import ProductCard, { Product } from '../components/ProductCard';
import { Search, Filter, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { canManageProducts } from '../utils/roles';

interface ApiProduct {
  id: number;
  name: string;
  description: string;
  price: number | string;
  stock: number;
  category_id: number;
  category: string;
  category_name: string;
  image_url?: string | null;
}

function mapApiProduct(p: ApiProduct): Product {
  return {
    id: String(p.id),
    nom: p.name,
    desc: p.description || '',
    prix: Number(p.price),
    stock: p.stock,
    image: p.image_url || '',
    categoryId: p.category,
  };
}

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const { profile } = useAuthStore();

  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          apiFetch('/api/products/', null),
          apiFetch('/api/product-categories/', null),
        ]);
        const data = prodRes.ok ? await prodRes.json() : [];
        const cats = catRes.ok ? await catRes.json() : [];
        if (!cancelled) {
          setProducts((Array.isArray(data) ? data : []).map(mapApiProduct));
          const labels: Record<string, string> = {};
          for (const c of Array.isArray(cats) ? cats : []) {
            labels[c.slug] = c.name;
          }
          setCategoryLabels(labels);
        }
      } catch (e) {
        console.error('Chargement catalogue:', e);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.categoryId || 'autre')))];
  const categoryLabel = (slug: string) => categoryLabels[slug] || slug;

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;

    let matchesPrice = true;
    if (selectedPriceRange === 'under-10000') matchesPrice = p.prix < 10000;
    else if (selectedPriceRange === '10000-20000') matchesPrice = p.prix >= 10000 && p.prix <= 20000;
    else if (selectedPriceRange === 'over-20000') matchesPrice = p.prix > 20000;

    return matchesSearch && matchesCategory && matchesPrice;
  });

  return (
    <div className="min-h-screen pt-28 pb-20 relative">
      <div className="bg-glow-orb glow-2 top-40 right-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Notre <span className="text-gradient">Collection</span>
            </h1>
            <p className="text-pure-white/70 max-w-xl">
              Découvrez notre gamme de produits skincare premium, sélectionnés par nos experts pour révéler l'éclat
              naturel de votre peau.
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            {canManageProducts(profile?.role) && (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-glow-green/20 text-glow-green hover:bg-glow-green hover:text-velvet-black transition-colors text-sm font-bold whitespace-nowrap"
                title="Gérer les produits et stocks"
              >
                <LayoutDashboard className="w-4 h-4" />
                Gérer le catalogue
              </Link>
            )}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pure-white/50" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-glass-bg border border-glass-border rounded-full py-3 pl-12 pr-4 text-pure-white focus:outline-none focus:border-glow-green/50 transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-full border transition-colors ${showFilters ? 'bg-glow-green text-velvet-black border-glow-green' : 'bg-glass-bg border-glass-border hover:bg-white/10 text-pure-white'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="glass p-6 mb-8 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-glow-green">Catégorie</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm transition-colors ${selectedCategory === cat ? 'bg-glow-green text-velvet-black font-bold' : 'bg-white/5 text-pure-white/70 hover:bg-white/10 border border-glass-border'}`}
                    >
                      {cat === 'all' ? 'Toutes' : categoryLabel(cat)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-glow-green">Prix</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'Tous les prix' },
                    { id: 'under-10000', label: 'Moins de 10 000 FCFA' },
                    { id: '10000-20000', label: '10 000 - 20 000 FCFA' },
                    { id: 'over-20000', label: 'Plus de 20 000 FCFA' },
                  ].map((range) => (
                    <button
                      key={range.id}
                      type="button"
                      onClick={() => setSelectedPriceRange(range.id)}
                      className={`px-4 py-2 rounded-full text-sm transition-colors ${selectedPriceRange === range.id ? 'bg-glow-green text-velvet-black font-bold' : 'bg-white/5 text-pure-white/70 hover:bg-white/10 border border-glass-border'}`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-glow-green/30 border-t-glow-green rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product: Product) => <ProductCard key={product.id} product={product} />)
            ) : (
              <div className="col-span-full text-center py-20 text-pure-white/50">
                Aucun produit ne correspond à votre recherche.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
