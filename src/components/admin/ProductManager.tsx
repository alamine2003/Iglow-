import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Upload,
  ImageIcon,
  FolderOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { apiFetch, apiFormData, apiJson } from '../../api/client';

export interface ApiProduct {
  id: number;
  name: string;
  description?: string;
  category_id: number;
  category: string;
  category_name: string;
  price: number | string;
  stock: number;
  image_url?: string;
}

interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  product_count?: number;
}

interface ProductFormState {
  name: string;
  description: string;
  price: string;
  stock: string;
  category_id: string;
}

interface CategoryFormState {
  name: string;
  sort_order: string;
}

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: '',
  description: '',
  price: '',
  stock: '0',
  category_id: '',
};

const EMPTY_CATEGORY_FORM: CategoryFormState = {
  name: '',
  sort_order: '0',
};

function formatFcfa(value: number) {
  return value.toLocaleString('fr-FR') + ' FCFA';
}

interface ProductManagerProps {
  user: User | null;
  manageProducts: boolean;
  searchQuery: string;
  onToast: (message: string) => void;
  onProductsChange?: (products: ApiProduct[]) => void;
}

export default function ProductManager({
  user,
  manageProducts,
  searchQuery,
  onToast,
  onProductsChange,
}: ProductManagerProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [stockDrafts, setStockDrafts] = useState<Record<number, string>>({});

  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(EMPTY_CATEGORY_FORM);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  const updateProducts = useCallback(
    (next: ApiProduct[]) => {
      setProducts(next);
      onProductsChange?.(next);
    },
    [onProductsChange]
  );

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const [prods, cats] = await Promise.all([
        apiJson<ApiProduct[]>('/api/products/', token),
        apiJson<ApiCategory[]>('/api/product-categories/', token),
      ]);
      updateProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.error(e);
      onToast('Erreur chargement produits / categories.');
    } finally {
      setLoading(false);
    }
  }, [user, onToast, updateProducts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const q = searchQuery.trim().toLowerCase();

  const resetProductForm = () => {
    setProductForm(EMPTY_PRODUCT_FORM);
    setEditingProductId(null);
    setShowProductForm(false);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetCategoryForm = () => {
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setEditingCategoryId(null);
  };

  const openCreateProduct = () => {
    resetProductForm();
    setProductForm({
      ...EMPTY_PRODUCT_FORM,
      category_id: categories[0] ? String(categories[0].id) : '',
    });
    setShowProductForm(true);
  };

  const openEditProduct = (p: ApiProduct) => {
    setProductForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      stock: String(p.stock),
      category_id: String(p.category_id),
    });
    setEditingProductId(p.id);
    setImageFile(null);
    setImagePreview(p.image_url || null);
    setShowProductForm(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onImageSelected = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const buildProductFormData = (form: ProductFormState) => {
    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('description', form.description.trim());
    fd.append('price', form.price);
    fd.append('stock', form.stock);
    fd.append('category_id', form.category_id);
    if (imageFile) fd.append('image', imageFile);
    return fd;
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manageProducts) return;
    if (!productForm.name.trim() || !productForm.category_id || !productForm.price) {
      onToast('Nom, categorie et prix sont obligatoires.');
      return;
    }
    const isEdit = editingProductId !== null;
    setSavingId(isEdit ? `product-edit-${editingProductId}` : 'product-create');
    try {
      const token = await user.getIdToken();
      const fd = buildProductFormData(productForm);
      if (isEdit) {
        const updated = await apiFormData<ApiProduct>(
          `/api/products/${editingProductId}/`,
          token,
          fd,
          'PATCH'
        );
        updateProducts(products.map((p) => (p.id === editingProductId ? updated : p)));
        onToast('Produit mis a jour.');
      } else {
        const created = await apiFormData<ApiProduct>('/api/products/', token, fd, 'POST');
        updateProducts([created, ...products]);
        onToast('Produit ajoute au catalogue.');
      }
      resetProductForm();
    } catch {
      onToast('Echec enregistrement produit.');
    } finally {
      setSavingId(null);
    }
  };

  const patchProductStock = async (id: number, stock: number) => {
    if (!user || !manageProducts) return;
    if (stock < 0 || Number.isNaN(stock)) {
      onToast('Stock invalide.');
      return;
    }
    setSavingId(`product-stock-${id}`);
    try {
      const token = await user.getIdToken();
      const fd = new FormData();
      fd.append('stock', String(stock));
      const updated = await apiFormData<ApiProduct>(`/api/products/${id}/`, token, fd, 'PATCH');
      updateProducts(products.map((p) => (p.id === id ? updated : p)));
      setStockDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      onToast('Stock mis a jour.');
    } catch {
      onToast('Echec mise a jour du stock.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteProduct = async (id: number, name: string) => {
    if (!user || !manageProducts) return;
    if (!window.confirm(`Supprimer le produit « ${name} » ?`)) return;
    setSavingId(`product-delete-${id}`);
    try {
      const token = await user.getIdToken();
      const res = await apiFetch(`/api/products/${id}/`, token, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      updateProducts(products.filter((p) => p.id !== id));
      if (editingProductId === id) resetProductForm();
      onToast('Produit supprime.');
      loadData();
    } catch {
      onToast('Echec suppression produit.');
    } finally {
      setSavingId(null);
    }
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manageProducts || !categoryForm.name.trim()) return;
    const payload = {
      name: categoryForm.name.trim(),
      sort_order: parseInt(categoryForm.sort_order, 10) || 0,
    };
    const isEdit = editingCategoryId !== null;
    setSavingId(isEdit ? `cat-edit-${editingCategoryId}` : 'cat-create');
    try {
      const token = await user.getIdToken();
      if (isEdit) {
        const updated = await apiJson<ApiCategory>(`/api/product-categories/${editingCategoryId}/`, token, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setCategories((prev) => prev.map((c) => (c.id === editingCategoryId ? updated : c)));
        onToast('Categorie mise a jour.');
      } else {
        const created = await apiJson<ApiCategory>('/api/product-categories/', token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setCategories((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
        onToast('Categorie creee.');
      }
      resetCategoryForm();
      loadData();
    } catch {
      onToast('Echec enregistrement categorie.');
    } finally {
      setSavingId(null);
    }
  };

  const openEditCategory = (c: ApiCategory) => {
    setCategoryForm({ name: c.name, sort_order: String(c.sort_order) });
    setEditingCategoryId(c.id);
    setShowCategoryPanel(true);
  };

  const deleteCategory = async (c: ApiCategory) => {
    if (!user || !manageProducts) return;
    if (!window.confirm(`Supprimer la categorie « ${c.name} » ?`)) return;
    setSavingId(`cat-delete-${c.id}`);
    try {
      const token = await user.getIdToken();
      const res = await apiFetch(`/api/product-categories/${c.id}/`, token, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || 'delete failed');
      }
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
      if (editingCategoryId === c.id) resetCategoryForm();
      onToast('Categorie supprimee.');
      loadData();
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Echec suppression categorie.');
    } finally {
      setSavingId(null);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category_name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-glow-green/30 border-t-glow-green rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="text-pure-white/60 text-sm">
          {products.length} produit(s), {categories.length} categorie(s)
        </p>
        <div className="flex flex-wrap gap-2">
          {manageProducts && (
            <>
              <button
                type="button"
                onClick={() => setShowCategoryPanel((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-glass-border bg-white/5 hover:bg-white/10 text-sm"
              >
                <FolderOpen className="w-4 h-4" />
                Categories
                {showCategoryPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={showProductForm ? resetProductForm : openCreateProduct}
                disabled={categories.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glow-green text-velvet-black font-bold text-sm disabled:opacity-50"
                title={categories.length === 0 ? 'Creez une categorie dabord' : undefined}
              >
                {showProductForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showProductForm ? 'Annuler' : 'Nouveau produit'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => navigate('/catalog')}
            className="px-4 py-2 rounded-xl border border-glass-border bg-white/5 hover:bg-white/10 text-sm"
          >
            Catalogue public
          </button>
        </div>
      </div>

      {manageProducts && showCategoryPanel && (
        <div className="glass p-6 rounded-2xl border border-glass-border space-y-4">
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-glow-green" />
            Gestion des categories
          </h3>
          <form onSubmit={saveCategory} className="flex flex-wrap gap-3 items-end">
            <label className="text-sm flex-1 min-w-[140px]">
              <span className="text-pure-white/60 mb-1 block">Nom *</span>
              <input
                required
                value={categoryForm.name}
                onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-glass-border outline-none focus:border-glow-green/50"
              />
            </label>
            <label className="text-sm w-28">
              <span className="text-pure-white/60 mb-1 block">Ordre</span>
              <input
                type="number"
                min={0}
                value={categoryForm.sort_order}
                onChange={(e) => setCategoryForm((f) => ({ ...f, sort_order: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-glass-border outline-none focus:border-glow-green/50"
              />
            </label>
            <button
              type="submit"
              disabled={!!savingId}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glow-green text-velvet-black font-bold text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {editingCategoryId ? 'Mettre a jour' : 'Ajouter'}
            </button>
            {editingCategoryId && (
              <button type="button" onClick={resetCategoryForm} className="text-sm text-pure-white/50 hover:text-pure-white">
                Annuler edition
              </button>
            )}
          </form>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-glass-border text-sm"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-pure-white/40 text-xs">({c.product_count ?? 0})</span>
                <button type="button" onClick={() => openEditCategory(c)} className="p-1 hover:text-glow-green" title="Modifier">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteCategory(c)}
                  disabled={savingId === `cat-delete-${c.id}`}
                  className="p-1 hover:text-skin-pink disabled:opacity-50"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showProductForm && manageProducts && (
        <form onSubmit={saveProduct} className="glass p-6 rounded-2xl space-y-5 border border-glow-green/20">
          <h3 className="font-display font-bold text-lg">
            {editingProductId ? 'Modifier le produit' : 'Ajouter un produit'}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
            <div>
              <span className="text-pure-white/60 mb-2 block text-sm">Photo du produit</span>
              <div
                className="aspect-square rounded-2xl border-2 border-dashed border-glass-border bg-white/5 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-glow-green/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith('image/')) onImageSelected(file);
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Apercu" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImageIcon className="w-10 h-10 text-pure-white/30 mb-2" />
                    <span className="text-xs text-pure-white/50 text-center px-2">Cliquer ou deposer une image</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onImageSelected(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-glass-border text-sm hover:bg-white/5"
              >
                <Upload className="w-4 h-4" />
                Choisir une photo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-sm md:col-span-2">
                <span className="text-pure-white/60 mb-1 block">Nom *</span>
                <input
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-glass-border focus:border-glow-green/50 outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="text-pure-white/60 mb-1 block">Categorie *</span>
                <select
                  required
                  value={productForm.category_id}
                  onChange={(e) => setProductForm((f) => ({ ...f, category_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-glass-border focus:border-glow-green/50 outline-none"
                >
                  <option value="">— Choisir —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-pure-white/60 mb-1 block">Prix (FCFA) *</span>
                <input
                  required
                  type="number"
                  min={1}
                  value={productForm.price}
                  onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-glass-border focus:border-glow-green/50 outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="text-pure-white/60 mb-1 block">Stock *</span>
                <input
                  required
                  type="number"
                  min={0}
                  value={productForm.stock}
                  onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-glass-border focus:border-glow-green/50 outline-none"
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="text-pure-white/60 mb-1 block">Description</span>
                <textarea
                  rows={4}
                  value={productForm.description}
                  onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-glass-border focus:border-glow-green/50 outline-none resize-y"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={!!savingId || !productForm.category_id}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-glow-green text-velvet-black font-bold text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {editingProductId ? 'Enregistrer les modifications' : 'Publier le produit'}
          </button>
        </form>
      )}

      {categories.length === 0 && manageProducts && (
        <p className="text-sm text-skin-pink/90">Creez au moins une categorie avant d&apos;ajouter un produit.</p>
      )}

      <div className="glass overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-glass-border text-left text-pure-white/50 uppercase text-[11px] tracking-wider">
              <th className="p-4 w-16">Photo</th>
              <th className="p-4">Nom</th>
              <th className="p-4">Categorie</th>
              <th className="p-4">Prix</th>
              <th className="p-4">Stock</th>
              {manageProducts && <th className="p-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const stockValue = stockDrafts[p.id] ?? String(p.stock);
              const lowStock = p.stock < 10;
              return (
                <tr key={p.id} className="border-b border-glass-border/40 hover:bg-white/5">
                  <td className="p-4">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover border border-glass-border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/5 border border-glass-border flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-pure-white/30" />
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-medium">{p.name}</td>
                  <td className="p-4">{p.category_name}</td>
                  <td className="p-4 text-glow-green">{formatFcfa(Number(p.price))}</td>
                  <td className="p-4">
                    {manageProducts ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={stockValue}
                          onChange={(e) => setStockDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          className={`w-20 px-2 py-1 rounded-lg bg-white/5 border text-center outline-none focus:border-glow-green/50 ${
                            lowStock ? 'border-skin-pink/50' : 'border-glass-border'
                          }`}
                        />
                        <button
                          type="button"
                          disabled={savingId === `product-stock-${p.id}`}
                          onClick={() => patchProductStock(p.id, parseInt(stockValue, 10))}
                          className="p-1.5 rounded-lg border border-glass-border hover:border-glow-green/40 disabled:opacity-50"
                          title="Enregistrer le stock"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          lowStock ? 'bg-skin-pink/20 text-skin-pink' : 'bg-white/10'
                        }`}
                      >
                        {p.stock}
                      </span>
                    )}
                  </td>
                  {manageProducts && (
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditProduct(p)}
                          className="p-2 rounded-lg border border-glass-border hover:bg-white/10"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={savingId === `product-delete-${p.id}`}
                          onClick={() => deleteProduct(p.id, p.name)}
                          className="p-2 rounded-lg border border-skin-pink/30 text-skin-pink hover:bg-skin-pink/10 disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
