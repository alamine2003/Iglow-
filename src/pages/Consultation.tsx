import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiJson } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { isStaff, ROLE_LABELS } from '../utils/roles';
import {
  Send,
  MessageSquare,
  Plus,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Sparkles,
  Clock,
  Lock,
  ChevronLeft,
  Inbox,
  UserCircle2,
  Stethoscope,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Ticket {
  id: string;
  sujet?: string;
  subject?: string;
  status: string;
  createdAt: string;
  clientId?: string;
  clientEmail?: string;
  clientName?: string;
}

function normalizeTicket(row: Record<string, unknown>): Ticket {
  return {
    id: String(row.id),
    subject: (row.subject as string) || '',
    sujet: (row.sujet as string) || (row.subject as string) || '',
    status: row.status as string,
    clientId: (row.clientId as string) || '',
    createdAt: (row.createdAt as string) || (row.created_at as string) || '',
    clientEmail: row.clientEmail as string | undefined,
    clientName: row.clientName as string | undefined,
  };
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

function ticketTitle(t: Ticket) {
  return t.sujet || t.subject || 'Consultation sans titre';
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export default function Consultation() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OUVERT' | 'FERME'>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const isClient = profile?.role === 'CLIENT';
  const canAccessTickets =
    isClient ||
    profile?.role === 'COACH' ||
    profile?.role === 'ADMINISTRATEUR' ||
    isStaff(profile?.role);

  const loadTickets = useCallback(async () => {
    if (!user || !canAccessTickets) return;
    try {
      const token = await user.getIdToken();
      const data = await apiJson<Record<string, unknown>[]>('/api/tickets/', token);
      let list = (Array.isArray(data) ? data : []).map(normalizeTicket);
      if (isClient) {
        list = list.filter((t) => t.clientId === user.uid);
      }
      setTickets(list);
      if (activeTicket) {
        const still = list.find((t) => t.id === activeTicket.id);
        if (!still) {
          setActiveTicket(null);
          setMobileShowChat(false);
        } else {
          setActiveTicket(still);
        }
      }
    } catch (e) {
      console.error('Chargement tickets:', e);
    }
  }, [user, canAccessTickets, isClient, activeTicket?.id]);

  const loadMessages = useCallback(async () => {
    if (!user || !activeTicket) {
      setMessages([]);
      return;
    }
    if (isClient && activeTicket.clientId !== user.uid) {
      setMessages([]);
      setActiveTicket(null);
      return;
    }
    try {
      const token = await user.getIdToken();
      const data = await apiJson<Record<string, unknown>[]>(
        `/api/ticket-messages/?ticket=${activeTicket.id}`,
        token
      );
      const list = (Array.isArray(data) ? data : []).map((row) => ({
        id: String(row.id),
        senderId: String(row.senderId || ''),
        text: String(row.text || ''),
        createdAt: String(row.createdAt || row.created_at || ''),
      })) as Message[];
      setMessages(list);
    } catch (e) {
      console.error('Chargement messages:', e);
    }
  }, [user, activeTicket, isClient]);

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 8000);
    return () => clearInterval(interval);
  }, [loadTickets]);

  useEffect(() => {
    loadMessages();
    if (!activeTicket) return;
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [loadMessages, activeTicket?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTicket?.id]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTicketSubject.trim() || !isClient) return;

    try {
      const token = await user.getIdToken();
      const created = await apiJson<Record<string, unknown>>('/api/tickets/', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newTicketSubject.trim(),
          status: 'OUVERT',
        }),
      });
      const ticket = normalizeTicket(created);
      setNewTicketSubject('');
      setIsCreating(false);
      setActiveTicket(ticket);
      setMobileShowChat(true);
      await loadTickets();
    } catch (error) {
      console.error('Creation ticket:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeTicket || !newMessage.trim() || activeTicket.status === 'FERME') return;
    if (isClient && activeTicket.clientId !== user.uid) return;

    try {
      const token = await user.getIdToken();
      await apiJson('/api/ticket-messages/', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket: Number(activeTicket.id),
          text: newMessage.trim(),
        }),
      });
      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Envoi message:', error);
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket || !user) return;
    if (isClient && activeTicket.clientId !== user.uid) return;
    try {
      const token = await user.getIdToken();
      await apiJson(`/api/tickets/${activeTicket.id}/`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FERME' }),
      });
      setActiveTicket({ ...activeTicket, status: 'FERME' });
      await loadTickets();
    } catch (error) {
      console.error('Cloture ticket:', error);
    }
  };

  const selectTicket = (ticket: Ticket) => {
    if (isClient && ticket.clientId !== user?.uid) return;
    setActiveTicket(ticket);
    setMobileShowChat(true);
  };

  const filteredAndSortedTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets
      .filter((t) => (filterStatus === 'ALL' ? true : t.status === filterStatus))
      .filter((t) => !q || ticketTitle(t).toLowerCase().includes(q))
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [tickets, filterStatus, sortOrder, searchQuery]);

  const openCount = tickets.filter((t) => t.status === 'OUVERT').length;

  if (!user) {
    return (
      <div className="min-h-screen pt-28 pb-20 relative overflow-hidden">
        <div className="bg-glow-orb glow-1 top-[-120px] right-[-80px]" />
        <div className="bg-glow-orb glow-2 bottom-[-80px] left-[-60px]" />
        <div className="max-w-lg mx-auto px-4 text-center relative z-10">
          <div className="glass p-10">
            <div className="w-16 h-16 rounded-2xl bg-glow-green/15 border border-glow-green/30 flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="w-8 h-8 text-glow-green" />
            </div>
            <h1 className="text-3xl font-display font-bold mb-3">
              Consultation <span className="text-gradient">personnalisée</span>
            </h1>
            <p className="text-pure-white/70 mb-8 leading-relaxed">
              Échangez en direct avec nos experts skincare : conseils sur mesure, suivi de routine et
              réponses à vos questions peau.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3.5 rounded-full bg-glow-green text-velvet-black font-bold hover:shadow-[0_0_25px_rgba(0,255,136,0.45)] transition-shadow"
            >
              Se connecter pour commencer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-8 relative">
      <div className="bg-glow-orb glow-2 top-20 left-[-120px]" />
      <div className="bg-glow-orb glow-1 bottom-0 right-[-100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* En-tête client */}
        {isClient && (
          <header className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="badge inline-flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Espace conseil iGlow
                </span>
                <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
                  Mes <span className="text-gradient">consultations</span>
                </h1>
                <p className="text-pure-white/60 max-w-xl text-sm md:text-base">
                  Posez vos questions, partagez vos photos de routine et recevez des recommandations
                  adaptées à votre peau.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="glass px-4 py-3 min-w-[100px] text-center">
                  <p className="text-2xl font-bold text-glow-green">{openCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-pure-white/50">Ouvertes</p>
                </div>
                <div className="glass px-4 py-3 min-w-[100px] text-center">
                  <p className="text-2xl font-bold">{tickets.length}</p>
                  <p className="text-[10px] uppercase tracking-wider text-pure-white/50">Total</p>
                </div>
              </div>
            </div>
          </header>
        )}

        {!isClient && profile && (
          <header className="mb-6">
            <h1 className="text-2xl font-display font-bold">Consultations clients</h1>
            <p className="text-pure-white/50 text-sm">
              {ROLE_LABELS[profile.role]} — répondez aux demandes en attente
            </p>
          </header>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,340px)_1fr] gap-4 lg:gap-6 h-[calc(100vh-11rem)] min-h-[520px]">
          {/* Liste des tickets */}
          <aside
            className={`glass flex flex-col overflow-hidden min-h-0 ${
              mobileShowChat ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="p-4 md:p-5 border-b border-glass-border shrink-0">
              <div className="flex justify-between items-center gap-2 mb-4">
                <h2 className="text-lg font-display font-bold flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-glow-green" />
                  {isClient ? 'Mes demandes' : 'Tickets'}
                </h2>
                {isClient && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(true);
                      setActiveTicket(null);
                      setMobileShowChat(false);
                    }}
                    className="p-2.5 rounded-xl bg-glow-green text-velvet-black hover:shadow-[0_0_18px_rgba(0,255,136,0.4)] transition-shadow"
                    title="Nouvelle consultation"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pure-white/40" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un sujet..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-glass-border text-sm focus:outline-none focus:border-glow-green/50"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(['ALL', 'OUVERT', 'FERME'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filterStatus === s
                        ? 'bg-glow-green text-velvet-black'
                        : 'bg-white/5 text-pure-white/60 hover:bg-white/10 border border-glass-border'
                    }`}
                  >
                    {s === 'ALL' ? 'Tous' : s === 'OUVERT' ? 'Ouverts' : 'Fermés'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="ml-auto p-1.5 rounded-lg border border-glass-border bg-white/5 hover:border-glow-green/40"
                  title="Trier par date"
                >
                  {sortOrder === 'desc' ? (
                    <ArrowDown className="w-4 h-4" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 custom-scrollbar">
              {isCreating && isClient && (
                <form
                  onSubmit={handleCreateTicket}
                  className="p-4 rounded-2xl bg-gradient-to-br from-glow-green/10 to-transparent border border-glow-green/30 mb-2"
                >
                  <label className="text-xs uppercase tracking-wider text-glow-green font-semibold mb-2 block">
                    Nouvelle consultation
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : Routine peau sensible, taches..."
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                    className="w-full bg-white/5 border border-glass-border rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:border-glow-green"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="text-xs text-pure-white/50 hover:text-pure-white px-2"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-bold text-velvet-black bg-glow-green px-4 py-2 rounded-lg"
                    >
                      Ouvrir le fil
                    </button>
                  </div>
                </form>
              )}

              {filteredAndSortedTickets.length === 0 && !isCreating && (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-pure-white/20" />
                  <p className="text-sm text-pure-white/50 mb-4">Aucune consultation pour le moment.</p>
                  {isClient && (
                    <button
                      type="button"
                      onClick={() => setIsCreating(true)}
                      className="text-sm text-glow-green font-semibold hover:underline"
                    >
                      Créer ma première demande
                    </button>
                  )}
                </div>
              )}

              {filteredAndSortedTickets.map((ticket) => {
                const active = activeTicket?.id === ticket.id;
                const open = ticket.status === 'OUVERT';
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => selectTicket(ticket)}
                    className={`w-full text-left p-4 rounded-2xl transition-all border group ${
                      active
                        ? 'bg-white/10 border-glow-green/50 shadow-[0_0_20px_rgba(0,255,136,0.08)]'
                        : 'bg-white/[0.02] border-transparent hover:bg-white/5 hover:border-glass-border'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`w-1 rounded-full shrink-0 ${
                          open ? 'bg-glow-green' : 'bg-pure-white/20'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate pr-1">{ticketTitle(ticket)}</h3>
                        {!isClient && (ticket.clientName || ticket.clientEmail) && (
                          <p className="text-[11px] text-pure-white/45 truncate mt-0.5">
                            {ticket.clientName || ticket.clientEmail}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <span className="text-[11px] text-pure-white/45 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateLabel(ticket.createdAt)}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                              open
                                ? 'bg-glow-green/20 text-glow-green'
                                : 'bg-white/10 text-pure-white/45'
                            }`}
                          >
                            {open ? 'Ouvert' : 'Fermé'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Zone de chat */}
          <section
            className={`glass flex flex-col overflow-hidden min-h-0 ${
              mobileShowChat ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {activeTicket ? (
              <>
                <div className="p-4 md:p-5 border-b border-glass-border bg-white/[0.03] shrink-0">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileShowChat(false)}
                      className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-white/10 shrink-0"
                      aria-label="Retour à la liste"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg md:text-xl font-display font-bold truncate">
                        {ticketTitle(activeTicket)}
                      </h2>
                      <p className="text-xs text-pure-white/50 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                            activeTicket.status === 'OUVERT'
                              ? 'bg-glow-green/15 text-glow-green'
                              : 'bg-white/10 text-pure-white/50'
                          }`}
                        >
                          {activeTicket.status === 'OUVERT' ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-glow-green animate-pulse" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          {activeTicket.status === 'OUVERT' ? 'En cours' : 'Clôturée'}
                        </span>
                        <span>
                          Créée le{' '}
                          {new Date(activeTicket.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </p>
                    </div>
                    {activeTicket.status === 'OUVERT' && (
                      <button
                        type="button"
                        onClick={handleCloseTicket}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border border-glass-border bg-white/5 hover:bg-skin-pink/10 hover:text-skin-pink hover:border-skin-pink/30 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Clôturer</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-velvet-black/20">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-glass-border flex items-center justify-center mb-4">
                        <Sparkles className="w-7 h-7 text-glow-green" />
                      </div>
                      <p className="text-pure-white/70 font-medium mb-1">Démarrez la conversation</p>
                      <p className="text-sm text-pure-white/45 max-w-xs">
                        Décrivez vos préoccupations (type de peau, produits utilisés, objectifs). Un
                        expert vous répondra ici.
                      </p>
                    </div>
                  )}

                  {messages.map((msg, index) => {
                    const isMe = msg.senderId === user.uid;
                    const prev = messages[index - 1];
                    const showDate =
                      !prev ||
                      formatDateLabel(prev.createdAt) !== formatDateLabel(msg.createdAt);

                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-2">
                            <span className="text-[10px] uppercase tracking-wider text-pure-white/35 px-3 py-1 rounded-full bg-white/5 border border-glass-border">
                              {formatDateLabel(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {!isMe && (
                            <div className="w-8 h-8 rounded-full bg-skin-pink/20 border border-skin-pink/30 flex items-center justify-center shrink-0 mt-1">
                              <Stethoscope className="w-4 h-4 text-skin-pink" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] sm:max-w-[72%] px-4 py-3 rounded-2xl ${
                              isMe
                                ? 'bg-glow-green text-velvet-black rounded-br-md shadow-[0_4px_20px_rgba(0,255,136,0.15)]'
                                : 'bg-white/10 text-pure-white border border-glass-border rounded-bl-md'
                            }`}
                          >
                            {!isMe && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-skin-pink block mb-1">
                                Expert iGlow
                              </span>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            <span
                              className={`text-[10px] mt-2 block ${
                                isMe ? 'text-velvet-black/50' : 'text-pure-white/35'
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {isMe && (
                            <div className="w-8 h-8 rounded-full bg-glow-green/20 border border-glow-green/40 flex items-center justify-center shrink-0 mt-1">
                              <UserCircle2 className="w-4 h-4 text-glow-green" />
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-glass-border bg-white/[0.03] shrink-0">
                  {activeTicket.status === 'FERME' ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-sm text-pure-white/50">
                      <Lock className="w-4 h-4" />
                      Cette consultation est clôturée. Ouvrez un nouveau fil si besoin.
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage(e);
                            }
                          }}
                          rows={1}
                          placeholder="Votre message… (Entrée pour envoyer)"
                          className="w-full min-h-[48px] max-h-32 resize-y bg-white/5 border border-glass-border rounded-2xl px-4 py-3 text-sm text-pure-white focus:outline-none focus:border-glow-green/50 transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="w-12 h-12 shrink-0 rounded-2xl bg-glow-green text-velvet-black flex items-center justify-center hover:shadow-[0_0_22px_rgba(0,255,136,0.45)] transition-all disabled:opacity-40 disabled:shadow-none"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 md:p-12">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-glow-green/20 to-skin-pink/10 border border-glass-border flex items-center justify-center mb-6">
                  <MessageSquare className="w-10 h-10 text-glow-green" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">
                  {isClient ? 'Choisissez une consultation' : 'Sélectionnez un ticket'}
                </h3>
                <p className="text-pure-white/50 text-sm max-w-sm mb-6">
                  {isClient
                    ? 'Sélectionnez une demande dans la liste ou créez-en une nouvelle pour parler à un expert.'
                    : 'Cliquez sur un ticket client pour afficher la conversation.'}
                </p>
                {isClient && (
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-glow-green text-velvet-black font-bold text-sm hover:shadow-[0_0_25px_rgba(0,255,136,0.4)] transition-shadow"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle consultation
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        {isClient && (
          <p className="text-center text-[11px] text-pure-white/35 mt-4 max-w-2xl mx-auto">
            Nos conseils ne remplacent pas un avis médical. En cas de réaction sévère, consultez un
            dermatologue.
          </p>
        )}
      </div>
    </div>
  );
}
