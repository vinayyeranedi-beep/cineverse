import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  MessageSquare,
  Send,
  Phone,
  Film,
  Hash,
  Filter,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Ticket, TicketStatus, IssueType } from '../types';
import { storeService } from '../services/store';
import { soundService } from '../services/sound';

interface TicketsManagementViewProps {
  onSelectSeat?: (screen: string, row: string, seat: string) => void;
}

export const TicketsManagementView: React.FC<TicketsManagementViewProps> = ({
  onSelectSeat,
}) => {
  const [tickets, setTickets] = useState<Ticket[]>(() => storeService.getTickets());
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null);
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(null);

  // Sound chime tracking for incoming tickets
  const prevTicketsCountRef = useRef(tickets.length);
  const prevTicketIdsRef = useRef<Set<string>>(new Set(tickets.map((t) => t.id)));

  useEffect(() => {
    const unsub = storeService.subscribeTickets((updatedTickets) => {
      // Check for newly added open ticket
      const newItems = updatedTickets.filter((t) => !prevTicketIdsRef.current.has(t.id));
      if (newItems.length > 0) {
        const latestNew = newItems[0];
        if (latestNew.status === 'open') {
          soundService.playAlertSound();
          setHighlightedTicketId(latestNew.id);
          setTimeout(() => setHighlightedTicketId(null), 8000);
        }
      }

      prevTicketsCountRef.current = updatedTickets.length;
      prevTicketIdsRef.current = new Set(updatedTickets.map((t) => t.id));
      setTickets(updatedTickets);
    });

    return () => unsub();
  }, []);

  const openTicketsCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  // Filtered tickets
  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const cleanSeatNum = ticket.seat.replace(/^[A-Za-z]+/, '') || ticket.seat;
    const seatLabel = `${ticket.row.toUpperCase()}${cleanSeatNum}`;
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !q ||
      ticket.ticketId.toLowerCase().includes(q) ||
      ticket.issueType.toLowerCase().includes(q) ||
      (ticket.description && ticket.description.toLowerCase().includes(q)) ||
      (ticket.orderId && ticket.orderId.toLowerCase().includes(q)) ||
      seatLabel.toLowerCase().includes(q) ||
      `screen ${ticket.screen}`.includes(q);

    return matchesStatus && matchesSearch;
  });

  const handleStatusChange = async (
    ticketId: string,
    newStatus: TicketStatus,
    replyText?: string
  ) => {
    setSavingTicketId(ticketId);
    try {
      await storeService.updateTicketStatus(ticketId, newStatus, replyText);
    } catch (e) {
      console.error(e);
      alert('Could not update ticket status.');
    } finally {
      setSavingTicketId(null);
    }
  };

  const handleSendReply = async (ticketId: string) => {
    const draft = replyDrafts[ticketId]?.trim();
    if (!draft) return;

    setSavingTicketId(ticketId);
    try {
      // Find current status; if open, automatically transition to in_progress upon staff reply
      const currentTicket = tickets.find((t) => t.id === ticketId);
      const nextStatus = currentTicket?.status === 'open' ? 'in_progress' : currentTicket?.status || 'in_progress';
      await storeService.updateTicketStatus(ticketId, nextStatus, draft);
      // Clear draft
      setReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }));
    } catch (e) {
      console.error(e);
      alert('Could not send reply.');
    } finally {
      setSavingTicketId(null);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-5 animate-fade-in text-white">
      {/* Top Banner & Quick Stats */}
      <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#E50914]/15 border border-[#E50914]/30 text-[#E50914] flex items-center justify-center shadow-lg shadow-[#E50914]/15">
            <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-black text-white">
                Auditorium Issue Tickets
              </h2>
              {openTicketsCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#E50914] text-white animate-pulse">
                  {openTicketsCount} OPEN
                </span>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Real-time issues reported by cinema moviegoers from their seat armrests
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#0B0B0F] p-1.5 rounded-2xl border border-zinc-800 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({tickets.length})
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'open'
                ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#E50914]" />
            <span>Open ({openTicketsCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'in_progress'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>In Progress ({inProgressCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'resolved'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Resolved ({resolvedCount})</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by seat (e.g. B7), screen number, ticket ID, or issue..."
          className="w-full bg-[#15151C] border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800"
          >
            Clear
          </button>
        )}
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="p-12 text-center bg-[#15151C] border border-zinc-800 rounded-3xl space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 stroke-[2]" />
          </div>
          <h3 className="font-display font-black text-lg text-white">No Tickets Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {statusFilter !== 'all'
              ? `There are currently no tickets marked as "${statusFilter}".`
              : 'All auditorium seats and orders are operating smoothly.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => {
            const cleanSeatNum = ticket.seat.replace(/^[A-Za-z]+/, '') || ticket.seat;
            const cleanSeatLabel = `${ticket.row.toUpperCase()}${cleanSeatNum}`;
            const isHighlighted = highlightedTicketId === ticket.id;

            return (
              <div
                key={ticket.id}
                className={`bg-[#15151C] border rounded-3xl p-5 shadow-xl transition-all duration-300 flex flex-col justify-between ${
                  isHighlighted
                    ? 'border-[#E50914] ring-2 ring-[#E50914] shadow-[0_0_30px_rgba(229,9,20,0.4)] animate-pulse'
                    : ticket.status === 'open'
                    ? 'border-[#E50914]/60 hover:border-[#E50914]'
                    : ticket.status === 'in_progress'
                    ? 'border-blue-500/50 hover:border-blue-400'
                    : 'border-zinc-800 opacity-90 hover:opacity-100'
                }`}
              >
                <div>
                  {/* Top Bar: Seat & Screen Badge + Status Badge */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-display font-black text-[#D4AF37] tracking-tight">
                          Screen {ticket.screen} • Seat {cleanSeatLabel}
                        </span>
                        {ticket.status === 'open' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] animate-ping" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                        <span className="font-mono text-zinc-300">#{ticket.ticketId}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>{formatTimeAgo(ticket.createdAt)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        ticket.status === 'open'
                          ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40'
                          : ticket.status === 'in_progress'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {ticket.status === 'open' && 'Open'}
                      {ticket.status === 'in_progress' && 'In Progress'}
                      {ticket.status === 'resolved' && 'Resolved'}
                    </span>
                  </div>

                  {/* Issue Type Highlight */}
                  <div className="pt-3 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                      Reported Issue:
                    </span>
                    <span className="inline-block px-2.5 py-1 rounded-xl bg-black/50 border border-zinc-700 font-bold text-white text-xs">
                      {ticket.issueType}
                    </span>
                  </div>

                  {/* Customer Description */}
                  {ticket.description && (
                    <div className="my-2 p-3 rounded-xl bg-black/40 border border-zinc-800 text-xs italic text-zinc-300 leading-relaxed">
                      "{ticket.description}"
                    </div>
                  )}

                  {/* Linked Order & Contact Info */}
                  <div className="space-y-1.5 text-xs text-zinc-400 my-2.5 pt-2 border-t border-zinc-800/80">
                    {ticket.orderId && (
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Order ID:</span>
                        <span className="font-mono text-[#D4AF37] font-bold">
                          #{ticket.orderId}
                        </span>
                      </div>
                    )}
                    {ticket.contact && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Contact:</span>
                        <a
                          href={`tel:${ticket.contact}`}
                          className="font-mono text-zinc-200 underline hover:text-white"
                        >
                          {ticket.contact}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Staff Reply Section */}
                  {ticket.staffReply && (
                    <div className="my-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Active Staff Note to Customer:</span>
                      </div>
                      <p className="text-zinc-200">{ticket.staffReply}</p>
                    </div>
                  )}

                  {/* Reply Input Form */}
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Send Reply Note:
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={replyDrafts[ticket.id] || ''}
                        onChange={(e) =>
                          setReplyDrafts({ ...replyDrafts, [ticket.id]: e.target.value })
                        }
                        placeholder="e.g. Runner dispatched to seat..."
                        className="flex-1 bg-[#0B0B0F] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                      />
                      <button
                        onClick={() => handleSendReply(ticket.id)}
                        disabled={savingTicketId === ticket.id || !replyDrafts[ticket.id]?.trim()}
                        className="px-3 py-2 rounded-xl bg-[#D4AF37] hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1 transition-all"
                      >
                        <Send className="w-3 h-3" />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap items-center gap-2">
                  {ticket.status === 'open' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                        disabled={savingTicketId === ticket.id}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-sm"
                      >
                        Mark In Progress
                      </button>
                      <button
                        onClick={() => handleStatusChange(ticket.id, 'resolved')}
                        disabled={savingTicketId === ticket.id}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
                      >
                        Resolve
                      </button>
                    </>
                  )}

                  {ticket.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(ticket.id, 'resolved')}
                        disabled={savingTicketId === ticket.id}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
                      >
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => handleStatusChange(ticket.id, 'open')}
                        disabled={savingTicketId === ticket.id}
                        className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                      >
                        Back to Open
                      </button>
                    </>
                  )}

                  {ticket.status === 'resolved' && (
                    <button
                      onClick={() => handleStatusChange(ticket.id, 'open')}
                      disabled={savingTicketId === ticket.id}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-[#E50914]/20 hover:text-[#E50914] text-zinc-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen Ticket</span>
                    </button>
                  )}

                  {onSelectSeat && (
                    <button
                      onClick={() => onSelectSeat(ticket.screen, ticket.row, cleanSeatNum)}
                      title="Inspect Seat in Map"
                      className="py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors flex items-center gap-1 ml-auto"
                    >
                      <Film className="w-3 h-3 text-[#D4AF37]" />
                      <span className="hidden sm:inline">Seat Map</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
