import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Box,
  CreditCard,
} from 'lucide-react';
import { apiFetch } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { ROLE_LABELS } from '../utils/roles';

interface Order {
  id: string | number;
  num_commande: string;
  status: string;
  total: number;
  items: { quantity: number }[];
  createdAt: string;
}

const ORDER_STEPS = [
  { id: 'EN_ATTENTE', label: 'En attente' },
  { id: 'PAYE', label: 'Payée' },
  { id: 'EN_PREPARATION', label: 'Préparation' },
  { id: 'EN_LIVRAISON', label: 'Livraison' },
  { id: 'LIVRE', label: 'Livrée' },
];

export default function ClientDashboard() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ orders: 0, tickets: 0 });
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const [ordersRes, ticketsRes] = await Promise.all([
          apiFetch('/api/orders/', token),
          apiFetch('/api/tickets/', token),
        ]);
        const ordersPayload = ordersRes.ok ? await ordersRes.json() : [];
        const ticketsPayload = ticketsRes.ok ? await ticketsRes.json() : [];
        if (cancelled) return;
        const normalized: Order[] = (Array.isArray(ordersPayload) ? ordersPayload : []).map((row: any) => ({
          id: row.id,
          num_commande: row.num_commande ?? row.order_number ?? '',
          status: row.status,
          total: Number(row.total ?? 0),
          items: Array.isArray(row.items) ? row.items : [],
          createdAt: row.createdAt || row.created_at || '',
        }));
        normalized.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(normalized);
        setStats({
          orders: normalized.length,
          tickets: Array.isArray(ticketsPayload) ? ticketsPayload.length : 0,
        });
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      EN_ATTENTE: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
      PAYE: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
      EN_PREPARATION: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
      EN_LIVRAISON: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
      LIVRE: 'text-glow-green bg-glow-green/10 border-glow-green/20',
      ANNULE: 'text-skin-pink bg-skin-pink/10 border-skin-pink/20',
    };
    return map[status] ?? 'text-pure-white/70 bg-white/5 border-glass-border';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EN_ATTENTE':
        return <Clock className="w-4 h-4 mr-2" />;
      case 'PAYE':
        return <CreditCard className="w-4 h-4 mr-2" />;
      case 'EN_PREPARATION':
        return <Box className="w-4 h-4 mr-2" />;
      case 'EN_LIVRAISON':
        return <Truck className="w-4 h-4 mr-2" />;
      case 'LIVRE':
        return <CheckCircle className="w-4 h-4 mr-2" />;
      case 'ANNULE':
        return <XCircle className="w-4 h-4 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-20 relative">
      <div className="bg-glow-orb glow-1 top-[-200px] right-[-100px]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-12">
          <h1 className="text-4xl font-display font-bold mb-2">Mon espace</h1>
          <p className="text-pure-white/70 text-lg">
            Bienvenue,{' '}
            <span className="text-glow-green font-medium">{profile?.prenom || profile?.email}</span>
            {profile?.role && (
              <span className="text-pure-white/50 text-sm ml-2">({ROLE_LABELS[profile.role]})</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="glass p-5 flex items-center gap-4">
            <Package className="w-8 h-8 text-glow-green" />
            <div>
              <span className="block text-[11px] opacity-50 uppercase tracking-wider">Mes commandes</span>
              <strong className="text-2xl">{stats.orders}</strong>
            </div>
          </div>
          <div className="glass p-5 flex items-center gap-4">
            <MessageSquare className="w-8 h-8 text-skin-pink" />
            <div>
              <span className="block text-[11px] opacity-50 uppercase tracking-wider">Consultations</span>
              <strong className="text-2xl">{stats.tickets}</strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass p-6">
            <h3 className="text-xl font-display font-bold mb-6">Actions rapides</h3>
            <div className="space-y-4">
              <button
                onClick={() => navigate('/catalog')}
                className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-glass-border flex justify-between"
              >
                <span>Parcourir le catalogue</span>
                <TrendingUp className="w-5 h-5 text-glow-green" />
              </button>
              <button
                onClick={() => navigate('/consultation')}
                className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-glass-border flex justify-between"
              >
                <span>Ouvrir une consultation</span>
                <MessageSquare className="w-5 h-5 text-skin-pink" />
              </button>
            </div>
          </div>

          <div className="glass p-6 flex flex-col max-h-[480px]">
            <h3 className="text-xl font-display font-bold mb-4">Mes commandes</h3>
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {orders.length === 0 ? (
                <p className="text-pure-white/50 text-center py-8">Aucune commande.</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white/5 border border-glass-border rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-sm">{order.num_commande}</span>
                      <span className={`text-xs px-2 py-1 rounded-full border flex items-center ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-pure-white/50">
                        {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-glow-green font-bold">
                        {Number(order.total).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
