import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Users,
  MessageSquare,
  TrendingUp,
  Shield,
  LayoutDashboard,
  ShoppingBag,
  Headphones,
  Boxes,
  ExternalLink,
  RefreshCw,
  Search,
} from 'lucide-react';
import { apiJson } from '../api/client';
import ProductManager, { type ApiProduct } from '../components/admin/ProductManager';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../config';
import { isAdministrateur, canManageProducts, ROLE_LABELS, type AppRole } from '../utils/roles';

type TabId = 'overview' | 'orders' | 'tickets' | 'users' | 'products';

interface ApiOrder {
  id: number;
  num_commande: string;
  status: string;
  total: number | string;
  clientEmail?: string;
  clientName?: string;
  createdAt: string;
  items?: { quantity: number }[];
}

interface ApiTicket {
  id: number;
  subject: string;
  status: string;
  clientEmail?: string;
  clientName?: string;
  createdAt: string;
}

interface ApiUser {
  id: number;
  uid: string | null;
  email: string;
  role: AppRole;
  first_name: string;
  last_name: string;
  date_joined: string;
}

const ORDER_STATUSES = [
  'EN_ATTENTE',
  'PAYE',
  'EN_PREPARATION',
  'EN_LIVRAISON',
  'LIVRE',
  'ANNULE',
] as const;

const TICKET_STATUSES = ['OUVERT', 'FERME'] as const;
const ROLES: AppRole[] = ['CLIENT', 'COACH', 'GESTIONNAIRE', 'ADMINISTRATEUR'];

function formatFcfa(value: number) {
  return value.toLocaleString('fr-FR') + ' FCFA';
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    EN_ATTENTE: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30',
    PAYE: 'bg-teal-400/15 text-teal-300 border-teal-400/30',
    EN_PREPARATION: 'bg-purple-400/15 text-purple-300 border-purple-400/30',
    EN_LIVRAISON: 'bg-blue-400/15 text-blue-300 border-blue-400/30',
    LIVRE: 'bg-glow-green/15 text-glow-green border-glow-green/30',
    ANNULE: 'bg-skin-pink/15 text-skin-pink border-skin-pink/30',
    OUVERT: 'bg-glow-green/15 text-glow-green border-glow-green/30',
    FERME: 'bg-white/10 text-pure-white/60 border-glass-border',
  };
  return colors[status] ?? 'bg-white/5 text-pure-white/70 border-glass-border';
}

export default function AdminDashboard() {
  const { user, profile } = useAuthStore();
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const manageProducts = canManageProducts(profile?.role);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const fetches: Promise<void>[] = [
        apiJson<ApiOrder[]>('/api/orders/', token).then(setOrders),
        apiJson<ApiTicket[]>('/api/tickets/', token).then(setTickets),
        apiJson<ApiProduct[]>('/api/products/', token).then(setProducts),
      ];
      if (isAdministrateur(profile?.role)) {
        fetches.push(apiJson<ApiUser[]>('/api/users/', token).then(setUsers));
      }
      await Promise.all(fetches);
    } catch (e) {
      console.error(e);
      showToast('Erreur de chargement des donnees admin.');
    } finally {
      setLoading(false);
    }
  }, [user, profile?.role]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const patchOrderStatus = async (id: number, status: string) => {
    if (!user) return;
    setSavingId(`order-${id}`);
    try {
      const token = await user.getIdToken();
      await apiJson(`/api/orders/${id}/`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      showToast('Statut commande mis a jour.');
    } catch {
      showToast('Echec mise a jour commande.');
    } finally {
      setSavingId(null);
    }
  };

  const patchTicketStatus = async (id: number, status: string) => {
    if (!user) return;
    setSavingId(`ticket-${id}`);
    try {
      const token = await user.getIdToken();
      await apiJson(`/api/tickets/${id}/`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      showToast('Statut consultation mis a jour.');
    } catch {
      showToast('Echec mise a jour consultation.');
    } finally {
      setSavingId(null);
    }
  };

  const patchUserRole = async (id: number, role: AppRole) => {
    if (!user || !isAdministrateur(profile?.role)) return;
    setSavingId(`user-${id}`);
    try {
      const token = await user.getIdToken();
      await apiJson(`/api/users/${id}/`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      showToast('Role mis a jour (claims Firebase synchronises).');
    } catch {
      showToast('Echec mise a jour du role.');
    } finally {
      setSavingId(null);
    }
  };

  const totalRevenue = orders
    .filter((o) => o.status !== 'ANNULE')
    .reduce((sum, o) => sum + Number(o.total), 0);

  const openTickets = tickets.filter((t) => t.status === 'OUVERT').length;
  const pendingOrders = orders.filter((o) =>
    ['EN_ATTENTE', 'PAYE', 'EN_PREPARATION', 'EN_LIVRAISON'].includes(o.status)
  ).length;

  const tabs: { id: TabId; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'overview', label: "Vue d'ensemble", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'orders', label: 'Commandes', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'tickets', label: 'Consultations', icon: <Headphones className="w-4 h-4" /> },
    { id: 'users', label: 'Utilisateurs', icon: <Users className="w-4 h-4" />, adminOnly: true },
    { id: 'products', label: 'Produits', icon: <Boxes className="w-4 h-4" /> },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdministrateur(profile?.role));

  const q = search.trim().toLowerCase();

  return (
    <div className="min-h-screen pt-28 pb-20 relative">
      <div className="bg-glow-orb glow-1 top-[-180px] left-[-80px]" />
      <div className="bg-glow-orb glow-2 bottom-0 right-[-120px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {toast && (
          <div className="fixed top-24 right-4 z-[60] glass border border-glow-green/40 px-4 py-3 text-sm text-glow-green max-w-sm">
            {toast}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-skin-pink/30 bg-skin-pink/10 text-skin-pink text-xs font-bold uppercase tracking-wider mb-3">
              <Shield className="w-3.5 h-3.5" />
              Administration iGlow
            </div>
            <h1 className="text-4xl font-display font-bold mb-2">Centre de pilotage</h1>
            <p className="text-pure-white/70">
              {profile?.email} —{' '}
              <span className="text-glow-green font-medium">
                {profile?.role ? ROLE_LABELS[profile.role] : ''}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadAll}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-glass-border bg-white/5 hover:bg-white/10 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <a
              href={`${API_BASE_URL}/admin/`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-glass-border bg-white/5 hover:bg-white/10 text-sm"
            >
              Django Admin <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 p-1 glass rounded-2xl">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-glow-green text-velvet-black'
                  : 'text-pure-white/70 hover:bg-white/5'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pure-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-glass-border text-sm focus:outline-none focus:border-glow-green/50"
          />
        </div>

        {loading && tab === 'overview' ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-glow-green/30 border-t-glow-green rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Commandes', value: orders.length, icon: Package, accent: 'text-glow-green' },
                    { label: 'En cours', value: pendingOrders, icon: TrendingUp, accent: 'text-yellow-300' },
                    { label: 'Consultations ouvertes', value: openTickets, icon: MessageSquare, accent: 'text-skin-pink' },
                    { label: 'Produits', value: products.length, icon: Boxes, accent: 'text-glow-green' },
                  ].map((card) => (
                    <div key={card.label} className="glass p-5">
                      <card.icon className={`w-6 h-6 mb-3 ${card.accent}`} />
                      <span className="text-[11px] uppercase tracking-wider text-pure-white/50">{card.label}</span>
                      <p className="text-3xl font-bold mt-1">{card.value}</p>
                    </div>
                  ))}
                </div>
                <div className="glass p-6 border border-glow-green/20">
                  <p className="text-sm text-pure-white/50 uppercase tracking-wider mb-1">Chiffre d'affaires (hors annulees)</p>
                  <p className="text-3xl font-display font-bold text-glow-green">{formatFcfa(totalRevenue)}</p>
                </div>
                <div className="glass p-6">
                  <h3 className="font-display font-bold text-lg mb-4">Dernieres commandes</h3>
                  <div className="space-y-2">
                    {orders.slice(0, 5).map((o) => (
                      <div
                        key={o.id}
                        className="flex justify-between items-center py-2 border-b border-glass-border/50 last:border-0"
                      >
                        <span className="font-mono text-sm">{o.num_commande}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${statusBadge(o.status)}`}>
                          {o.status.replace('_', ' ')}
                        </span>
                        <span className="text-glow-green text-sm font-medium">
                          {formatFcfa(Number(o.total))}
                        </span>
                      </div>
                    ))}
                    {orders.length === 0 && <p className="text-pure-white/50">Aucune commande.</p>}
                  </div>
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div className="glass overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-glass-border text-left text-pure-white/50 uppercase text-[11px] tracking-wider">
                        <th className="p-4">Commande</th>
                        <th className="p-4">Client</th>
                        <th className="p-4">Montant</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders
                        .filter(
                          (o) =>
                            !q ||
                            o.num_commande.toLowerCase().includes(q) ||
                            (o.clientEmail || '').toLowerCase().includes(q)
                        )
                        .map((o) => (
                          <tr key={o.id} className="border-b border-glass-border/40 hover:bg-white/5">
                            <td className="p-4 font-mono">{o.num_commande}</td>
                            <td className="p-4">
                              <div className="font-medium">{o.clientName || '—'}</div>
                              <div className="text-xs text-pure-white/50">{o.clientEmail}</div>
                            </td>
                            <td className="p-4 text-glow-green font-medium">{formatFcfa(Number(o.total))}</td>
                            <td className="p-4 text-pure-white/60">
                              {o.createdAt ? new Date(o.createdAt).toLocaleString('fr-FR') : '—'}
                            </td>
                            <td className="p-4">
                              <select
                                value={o.status}
                                disabled={savingId === `order-${o.id}`}
                                onChange={(e) => patchOrderStatus(o.id, e.target.value)}
                                className="bg-velvet-black border border-glass-border rounded-lg px-2 py-1.5 text-xs"
                              >
                                {ORDER_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s.replace('_', ' ')}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'tickets' && (
              <div className="glass overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-glass-border text-left text-pure-white/50 uppercase text-[11px] tracking-wider">
                      <th className="p-4">Sujet</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets
                      .filter(
                        (t) =>
                          !q ||
                          t.subject.toLowerCase().includes(q) ||
                          (t.clientEmail || '').toLowerCase().includes(q)
                      )
                      .map((t) => (
                        <tr key={t.id} className="border-b border-glass-border/40 hover:bg-white/5">
                          <td className="p-4 font-medium">{t.subject}</td>
                          <td className="p-4">
                            <div>{t.clientName || '—'}</div>
                            <div className="text-xs text-pure-white/50">{t.clientEmail}</div>
                          </td>
                          <td className="p-4 text-pure-white/60">
                            {t.createdAt ? new Date(t.createdAt).toLocaleString('fr-FR') : '—'}
                          </td>
                          <td className="p-4">
                            <select
                              value={t.status}
                              disabled={savingId === `ticket-${t.id}`}
                              onChange={(e) => patchTicketStatus(t.id, e.target.value)}
                              className="bg-velvet-black border border-glass-border rounded-lg px-2 py-1.5 text-xs"
                            >
                              {TICKET_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'users' && isAdministrateur(profile?.role) && (
              <div className="glass overflow-hidden">
                <p className="p-4 text-xs text-pure-white/50 border-b border-glass-border">
                  Modifier un role met a jour Firebase (Custom Claims) automatiquement. L'utilisateur doit se reconnecter pour voir le changement cote app.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-glass-border text-left text-pure-white/50 uppercase text-[11px] tracking-wider">
                      <th className="p-4">Email</th>
                      <th className="p-4">Nom</th>
                      <th className="p-4">Inscription</th>
                      <th className="p-4">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(
                        (u) =>
                          !q ||
                          u.email.toLowerCase().includes(q) ||
                          (u.first_name + u.last_name).toLowerCase().includes(q)
                      )
                      .map((u) => (
                        <tr key={u.id} className="border-b border-glass-border/40 hover:bg-white/5">
                          <td className="p-4">{u.email}</td>
                          <td className="p-4">
                            {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                          </td>
                          <td className="p-4 text-pure-white/60">
                            {u.date_joined ? new Date(u.date_joined).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="p-4">
                            <select
                              value={u.role}
                              disabled={savingId === `user-${u.id}` || u.uid === profile?.uid}
                              onChange={(e) => patchUserRole(u.id, e.target.value as AppRole)}
                              className="bg-velvet-black border border-glass-border rounded-lg px-2 py-1.5 text-xs min-w-[140px]"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'products' && (
              <>
                <ProductManager
                  user={user}
                  manageProducts={manageProducts}
                  searchQuery={search}
                  onToast={showToast}
                  onProductsChange={setProducts}
                />
                {profile?.role === 'COACH' && (
                  <p className="text-xs text-pure-white/40 mt-4">
                    Les coaches peuvent consulter le catalogue ; seuls les gestionnaires et administrateurs peuvent
                    modifier les produits.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
