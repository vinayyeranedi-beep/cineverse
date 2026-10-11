import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Bike,
  Sparkles,
  Volume2,
  VolumeX,
  AlertTriangle,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  PackageCheck,
  Film,
  Plus,
  Grid3X3,
  ListOrdered,
  Columns,
  Eye,
  X,
  Send,
  User,
  ShoppingBag,
  Bell,
} from 'lucide-react';
import {
  Order,
  OrderStatus,
  UserProfile,
  MenuItem,
  OrderItem,
  ScreenGridConfig,
  Ticket,
} from '../types';
import { storeService, getRowLetter } from '../services/store';
import { soundService } from '../services/sound';
import { TicketsManagementView } from './TicketsManagementView';

interface StaffDashboardProps {
  orders: Order[];
  currentUser: UserProfile | null;
  isDemoMode?: boolean;
  menuItems?: MenuItem[];
}

type QueueTab = 'all' | 'new' | 'in_progress' | 'completed';
type LayoutMode = 'split' | 'queue' | 'map';

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  orders,
  currentUser,
  isDemoMode,
  menuItems = [],
}) => {
  const [queueTab, setQueueTab] = useState<QueueTab>('all');
  const [searchSeat, setSearchSeat] = useState('');
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');

  // Screen selection for live seat map
  const [mapScreenId, setMapScreenId] = useState<string>('1');
  const [selectedSeatForDetails, setSelectedSeatForDetails] = useState<{
    screen: string;
    row: string;
    seat: string;
    order?: Order;
  } | null>(null);

  // Manual Order Modal
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [manualScreen, setManualScreen] = useState('1');
  const [manualRow, setManualRow] = useState('B');
  const [manualSeat, setManualSeat] = useState('7');
  const [manualNotes, setManualNotes] = useState('');
  const [manualCart, setManualCart] = useState<Record<string, number>>({});
  const [manualError, setManualError] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Auth login state
  const [emailInput, setEmailInput] = useState('staff@seatserve.cinema');
  const [passwordInput, setPasswordInput] = useState('staff123');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Screens map for live seat map
  const [screensMap, setScreensMap] = useState<Record<string, ScreenGridConfig>>(() =>
    storeService.getAllScreens()
  );

  // Tickets state & real-time subscription
  const [tickets, setTickets] = useState<Ticket[]>(() => storeService.getTickets());
  const [staffTab, setStaffTab] = useState<'orders' | 'tickets'>('orders');

  useEffect(() => {
    const unsub = storeService.subscribeScreens((sc) => setScreensMap(sc));
    const unsubTickets = storeService.subscribeTickets((t) => setTickets(t));
    return () => {
      unsub();
      unsubTickets();
    };
  }, []);

  const openTicketsCount = tickets.filter((t) => t.status === 'open').length;

  // Track previous orders to trigger audio chime and visual pulse on incoming order
  const prevOrdersCountRef = useRef(orders.length);
  const prevOrderIdsRef = useRef<Set<string>>(new Set(orders.map((o) => o.id)));

  useEffect(() => {
    const currentIds = new Set(orders.map((o) => o.id));
    const newOrders = orders.filter((o) => !prevOrderIdsRef.current.has(o.id));

    if (newOrders.length > 0) {
      const newest = newOrders[0];
      setHighlightOrderId(newest.id);
      soundService.playNewOrderSound();

      const timer = setTimeout(() => {
        setHighlightOrderId(null);
      }, 6000);
      return () => clearTimeout(timer);
    }

    prevOrderIdsRef.current = currentIds;
    prevOrdersCountRef.current = orders.length;
  }, [orders]);

  // Auth handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    try {
      await storeService.login(emailInput, passwordInput);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setAuthError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickStaffLogin = async () => {
    setIsLoggingIn(true);
    try {
      await storeService.login('staff@cineverse.com', 'staff123');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Status transitions: received -> preparing -> on_the_way -> delivered
  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await storeService.updateOrderStatus(orderId, nextStatus);
      if (nextStatus === 'on_the_way') {
        soundService.playReadySound();
      }
    } catch (err) {
      console.error(err);
      alert('Could not update status.');
    }
  };

  // Filter orders by tab & search query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab matching
      let matchesTab = true;
      if (queueTab === 'new') {
        matchesTab = order.status === 'received';
      } else if (queueTab === 'in_progress') {
        matchesTab = order.status === 'preparing' || order.status === 'on_the_way';
      } else if (queueTab === 'completed') {
        matchesTab = order.status === 'delivered';
      }

      // Seat search matching
      const seatString = `Screen ${order.screen} ${order.row}${order.seat}`.toLowerCase();
      const matchesSearch =
        !searchSeat.trim() || seatString.includes(searchSeat.trim().toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [orders, queueTab, searchSeat]);

  // Counts for tabs
  const newCount = orders.filter((o) => o.status === 'received').length;
  const inProgressCount = orders.filter(
    (o) => o.status === 'preparing' || o.status === 'on_the_way'
  ).length;
  const completedCount = orders.filter((o) => o.status === 'delivered').length;

  // Active orders map by seat for the Live Seat Map
  // Key: `${screen}-${row}${seat}`
  const seatOrdersMap = useMemo(() => {
    const map: Record<string, Order> = {};
    for (const ord of orders) {
      if (ord.status !== 'delivered') {
        const key = `${ord.screen}-${ord.row.toUpperCase()}${ord.seat}`;
        map[key] = ord;
      }
    }
    return map;
  }, [orders]);

  // Handle Manual Order Submission
  const handlePlaceManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');

    const cleanRow = manualRow.trim().toUpperCase();
    const cleanSeat = manualSeat.trim();

    if (!cleanRow || !cleanSeat) {
      setManualError('Please provide a valid row and seat number.');
      return;
    }

    const validation = storeService.validateSeat(manualScreen, cleanRow, cleanSeat);
    if (!validation.valid) {
      setManualError(validation.reason || 'Invalid seat for this screen.');
      return;
    }

    const cartEntries = Object.entries(manualCart).filter(([_, qty]) => qty > 0);
    if (cartEntries.length === 0) {
      setManualError('Please add at least one item from the menu.');
      return;
    }

    setIsSubmittingManual(true);
    try {
      const orderItems: OrderItem[] = cartEntries.map(([itemId, qty]) => {
        const it = menuItems.find((m) => m.id === itemId);
        return {
          id: itemId,
          name: it?.name || 'Snack',
          qty,
          price: it?.price || 150,
          isVeg: it?.isVeg,
        };
      });

      const total = orderItems.reduce((sum, it) => sum + it.price * it.qty, 0);

      await storeService.placeOrder({
        screen: manualScreen,
        row: cleanRow,
        seat: cleanSeat,
        items: orderItems,
        total,
        notes: manualNotes.trim() ? `[Manual Counter] ${manualNotes}` : '[Manual Counter Order]',
      });

      setManualCart({});
      setManualNotes('');
      setIsManualOrderOpen(false);
      soundService.playNewOrderSound();
    } catch (err) {
      console.error(err);
      setManualError('Failed to place manual order.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const isAuthorized =
    currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin');

  // If not logged in, show cinema staff login card
  if (!isAuthorized) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-zinc-950 text-white">
        <div className="w-full max-w-md bg-[#15151C] border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E50914]/15 text-[#E50914] border border-[#E50914]/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#E50914]/10">
              <ChefHat className="w-7 h-7 stroke-[2.2]" />
            </div>
            <h2 className="text-2xl font-display font-extrabold text-white">Counter Staff Display</h2>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Sign in to manage live cinema food preparation & runner delivery
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                Staff Email
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl bg-[#E50914] hover:bg-[#b80710] font-bold text-xs text-white shadow-lg shadow-[#E50914]/25 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoggingIn ? 'Verifying...' : 'Sign In to Counter'}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-zinc-800 text-center">
            <button
              onClick={handleQuickStaffLogin}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-[#D4AF37] border border-zinc-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sign In with Counter Staff (staff@cineverse.com)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active screen configuration for Live Seat Map
  const currentMapConfig = screensMap[mapScreenId] || {
    id: `screen-${mapScreenId}`,
    name: `Screen ${mapScreenId}`,
    screenNumber: mapScreenId,
    rowsCount: 14,
    seatsPerRow: 21,
    rowOverrides: { A: 19, N: 17 },
    aisleGaps: [7, 14],
    disabledSeats: ['A1', 'A19', 'N1'],
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-3 sm:p-6 pb-24">
      <div className="max-w-[1600px] mx-auto space-y-5">
        {/* Top Counter Bar */}
        <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E50914]/15 text-[#E50914] border border-[#E50914]/30 flex items-center justify-center shadow-lg">
              <ChefHat className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-display font-black text-white">
                  Cinema Counter & Delivery Display
                </h1>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Live orders synced with auditorium seat armrest QR codes.
              </p>
            </div>
          </div>

          {/* Action buttons: Manual Order, Sound Test, View Mode, Logout */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsManualOrderOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] font-bold text-xs text-white shadow-md shadow-[#E50914]/25 transition-all flex items-center gap-1.5 min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Manual Order</span>
            </button>

            {/* Layout switch: Split, Queue only, Map only */}
            <div className="hidden lg:flex items-center bg-[#0B0B0F] p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                onClick={() => setLayoutMode('split')}
                className={`p-2 rounded-lg transition-colors ${
                  layoutMode === 'split' ? 'bg-zinc-800 text-white' : 'text-[#A1A1AA] hover:text-white'
                }`}
                title="Split View (Orders + Seat Map)"
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('queue')}
                className={`p-2 rounded-lg transition-colors ${
                  layoutMode === 'queue' ? 'bg-zinc-800 text-white' : 'text-[#A1A1AA] hover:text-white'
                }`}
                title="Order Queue Only"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('map')}
                className={`p-2 rounded-lg transition-colors ${
                  layoutMode === 'map' ? 'bg-zinc-800 text-white' : 'text-[#A1A1AA] hover:text-white'
                }`}
                title="Live Seat Map Only"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => soundService.playNewOrderSound()}
              title="Test Chime Sound"
              className="p-2.5 rounded-xl bg-[#0B0B0F] hover:bg-zinc-800 text-[#A1A1AA] hover:text-[#D4AF37] border border-zinc-800 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => storeService.logout()}
              title="Sign Out"
              className="p-2.5 rounded-xl bg-[#0B0B0F] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-400 border border-zinc-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Counter Navigation Tabs: Orders vs Tickets with red badge */}
        <div className="flex items-center gap-2 bg-[#15151C] border border-zinc-800 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setStaffTab('orders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all min-h-[40px] ${
              staffTab === 'orders'
                ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Orders Queue</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/30 font-bold">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setStaffTab('tickets')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all min-h-[40px] relative ${
              staffTab === 'tickets'
                ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Tickets</span>
            {openTicketsCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#E50914] text-white border border-[#0B0B0F] animate-pulse">
                {openTicketsCount}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-zinc-800 text-zinc-400 font-bold">
                {tickets.length}
              </span>
            )}
          </button>
        </div>

        {staffTab === 'tickets' ? (
          /* AUDITORIUM TICKETS TAB VIEW */
          <TicketsManagementView
            onSelectSeat={(sc, r, s) => {
              setMapScreenId(sc);
              setLayoutMode('split');
              setSelectedSeatForDetails({ screen: sc, row: r, seat: s });
              setStaffTab('orders');
            }}
          />
        ) : (
          <>
            {/* Status Counters & Filters Bar */}
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-3.5 sm:p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Order Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Orders', count: orders.length },
              { id: 'new', label: 'New / Received', count: newCount, color: 'text-rose-400' },
              { id: 'in_progress', label: 'In Progress', count: inProgressCount, color: 'text-sky-400' },
              { id: 'completed', label: 'Completed', count: completedCount, color: 'text-emerald-400' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setQueueTab(tab.id as QueueTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[38px] ${
                  queueTab === tab.id
                    ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                    : 'bg-[#0B0B0F] text-[#A1A1AA] hover:text-white border border-zinc-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                    queueTab === tab.id ? 'bg-black/30 text-white' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative sm:w-72">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchSeat}
              onChange={(e) => setSearchSeat(e.target.value)}
              placeholder="Search seat e.g. B7, Screen 1..."
              className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl pl-10 pr-3.5 py-2 text-xs text-white placeholder-[#A1A1AA] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Main Content Area: Split View between Order Cards & Live Seat Map */}
        <div
          className={`grid gap-5 ${
            layoutMode === 'split'
              ? 'grid-cols-1 lg:grid-cols-12'
              : 'grid-cols-1'
          }`}
        >
          {/* LEFT: ORDER QUEUE CARDS */}
          {(layoutMode === 'split' || layoutMode === 'queue') && (
            <div
              className={`space-y-4 ${
                layoutMode === 'split' ? 'lg:col-span-7 xl:col-span-7' : 'w-full'
              }`}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                  Live Order Queue ({filteredOrders.length})
                </span>
                <span className="text-[11px] text-[#A1A1AA]">
                  Newest orders trigger sound & flashing highlight
                </span>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-12 text-center">
                  <PackageCheck className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No active orders</h3>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    Orders placed from customer armrest QRs will appear here instantly.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredOrders.map((order) => {
                    const isHighlighted = highlightOrderId === order.id;
                    const seatLabel = `${order.row}${order.seat}`;

                    return (
                      <div
                        key={order.id}
                        className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xl ${
                          isHighlighted
                            ? 'bg-[#E50914]/20 border-[#E50914] ring-2 ring-[#E50914]/80 shadow-[#E50914]/30 animate-pulse'
                            : order.status === 'received'
                            ? 'bg-[#15151C] border-[#E50914]/50'
                            : order.status === 'preparing'
                            ? 'bg-[#15151C] border-[#2563EB]/50'
                            : order.status === 'on_the_way'
                            ? 'bg-[#15151C] border-[#D4AF37]/50'
                            : 'bg-[#15151C]/60 border-zinc-800 opacity-70'
                        }`}
                      >
                        {/* Card Header: LARGE SEAT NUMBER */}
                        <div className="p-4 bg-[#0B0B0F] border-b border-zinc-800/80 flex items-start justify-between gap-3">
                          <div>
                            {/* LARGE BOLD SEAT ID */}
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-display font-black text-[#D4AF37] tracking-wider">
                                {seatLabel}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-[#A1A1AA] uppercase">
                                Screen {order.screen}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#A1A1AA] flex items-center gap-1 mt-1 font-mono">
                              <Clock className="w-3 h-3 text-zinc-500" />
                              {new Date(order.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div className="text-right">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                order.status === 'received'
                                  ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30'
                                  : order.status === 'preparing'
                                  ? 'bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/30'
                                  : order.status === 'on_the_way'
                                  ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {order.status === 'on_the_way' ? 'Out for Delivery' : order.status}
                            </span>
                            <span className="block font-mono font-bold text-sm text-white mt-1">
                              ₹{order.total}
                            </span>
                          </div>
                        </div>

                        {/* Order Items List */}
                        <div className="p-4 flex-1 space-y-2">
                          <div className="space-y-1.5">
                            {order.items.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs py-0.5"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded bg-[#D4AF37]/15 text-[#D4AF37] font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                                    {it.qty}
                                  </span>
                                  <span className="font-semibold text-zinc-200 truncate">
                                    {it.name}
                                  </span>
                                </div>
                                <span className="font-mono text-[#A1A1AA] text-xs shrink-0 ml-2">
                                  ₹{it.price * it.qty}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Special Instructions Note */}
                          {(order.notes || order.note) && (
                            <div className="mt-3 p-2.5 rounded-xl bg-[#0B0B0F] border border-zinc-800 text-[11px] text-[#D4AF37]">
                              <span className="font-bold text-[10px] text-[#A1A1AA] uppercase tracking-wider block">
                                Customer Note:
                              </span>
                              "{order.notes || order.note}"
                            </div>
                          )}
                        </div>

                        {/* ONE-TAP STATUS ACTION BUTTONS */}
                        <div className="p-3 bg-[#0B0B0F] border-t border-zinc-800">
                          {order.status === 'received' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'preparing')}
                              className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 min-h-[40px]"
                            >
                              <ChefHat className="w-4 h-4" />
                              <span>Start Preparing</span>
                            </button>
                          )}

                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'on_the_way')}
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 font-bold text-xs text-zinc-950 shadow-md transition-all flex items-center justify-center gap-2 min-h-[40px]"
                            >
                              <Bike className="w-4 h-4" />
                              <span>Out for Delivery</span>
                            </button>
                          )}

                          {order.status === 'on_the_way' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'delivered')}
                              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 min-h-[40px]"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Delivered to Seat {seatLabel}</span>
                            </button>
                          )}

                          {order.status === 'delivered' && (
                            <div className="py-2 text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Delivered to Patron</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* RIGHT: LIVE SEAT MAP (draws cinema grid colored by order status) */}
          {(layoutMode === 'split' || layoutMode === 'map') && (
            <div
              className={`space-y-4 ${
                layoutMode === 'split' ? 'lg:col-span-5 xl:col-span-5' : 'w-full'
              }`}
            >
              <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4 sticky top-20">
                {/* Header & Screen Selector */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Grid3X3 className="w-4 h-4 text-[#D4AF37]" />
                      <span>Live Auditorium Seat Map</span>
                    </h3>
                    <p className="text-[11px] text-[#A1A1AA]">
                      Seats colored by order status so delivery runners see where to walk.
                    </p>
                  </div>

                  {/* Screen Toggle */}
                  <div className="flex items-center gap-1 bg-[#0B0B0F] p-1 rounded-xl border border-zinc-800 text-xs">
                    {['1', '2', '3'].map((scId) => (
                      <button
                        key={scId}
                        onClick={() => setMapScreenId(scId)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                          mapScreenId === scId
                            ? 'bg-[#E50914] text-white shadow-sm'
                            : 'text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        Scr {scId}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[10px] pb-1">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] animate-pulse" />
                    <span className="text-white">New</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    <span className="text-white">Preparing</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                    <span className="text-white">Out for Delivery</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-zinc-800 border border-zinc-700" />
                    <span className="text-[#A1A1AA]">Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400 font-bold">Open Ticket</span>
                  </div>
                </div>

                {/* Cinema Screen Curve */}
                <div className="text-center py-1">
                  <div className="h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)] mb-1" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                    AUDITORIUM SCREEN
                  </span>
                </div>

                {/* Grid Visualizer */}
                <div className="overflow-x-auto pb-2 max-h-[500px]">
                  <div className="min-w-max flex flex-col items-center gap-1">
                    {Array.from({ length: currentMapConfig.rowsCount }).map((_, rIdx) => {
                      const rowLetter = getRowLetter(rIdx);
                      const rowSeatsCount =
                        currentMapConfig.rowOverrides?.[rowLetter] || currentMapConfig.seatsPerRow;

                      return (
                        <div key={rowLetter} className="flex items-center gap-1.5">
                          <span className="w-5 text-center font-mono font-bold text-[10px] text-[#D4AF37]">
                            {rowLetter}
                          </span>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: rowSeatsCount }).map((_, sIdx) => {
                              const seatNum = sIdx + 1;
                              const seatCode = `${rowLetter}${seatNum}`;
                              const isDisabled = currentMapConfig.disabledSeats?.includes(seatCode);
                              const hasAisleGap = currentMapConfig.aisleGaps?.includes(seatNum);

                              // Check if seat has active order
                              const activeOrderKey = `${mapScreenId}-${seatCode}`;
                              const seatOrder = seatOrdersMap[activeOrderKey];

                              // Check if seat has open ticket
                              const seatTickets = tickets.filter(
                                (t) =>
                                  t.screen === mapScreenId &&
                                  t.row.toUpperCase() === rowLetter &&
                                  (t.seat === String(seatNum) || t.seat === seatCode)
                              );
                              const hasOpenTicket = seatTickets.some((t) => t.status === 'open');

                              let seatStyle = 'bg-zinc-800 border-zinc-700 text-zinc-400';
                              if (isDisabled) {
                                seatStyle = 'bg-zinc-950 border-zinc-900 text-zinc-700 opacity-40';
                              } else if (seatOrder) {
                                if (seatOrder.status === 'received') {
                                  seatStyle =
                                    'bg-[#E50914] text-white border-[#E50914] font-black shadow-md shadow-[#E50914]/50 animate-pulse';
                                } else if (seatOrder.status === 'preparing') {
                                  seatStyle =
                                    'bg-[#2563EB] text-white border-[#2563EB] font-black shadow-md shadow-[#2563EB]/40';
                                } else if (seatOrder.status === 'on_the_way') {
                                  seatStyle =
                                    'bg-[#D4AF37] text-zinc-950 border-[#D4AF37] font-black shadow-md shadow-[#D4AF37]/40';
                                }
                              }

                              return (
                                <React.Fragment key={seatNum}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isDisabled) {
                                        setSelectedSeatForDetails({
                                          screen: mapScreenId,
                                          row: rowLetter,
                                          seat: String(seatNum),
                                          order: seatOrder,
                                        });
                                      }
                                    }}
                                    title={`${seatCode}${hasOpenTicket ? ' - [OPEN TICKET]' : ''}${seatOrder ? ` - Order #${seatOrder.orderId} (${seatOrder.status})` : ''}`}
                                    className={`w-6 h-6 rounded text-[9px] font-mono transition-all flex items-center justify-center border relative ${seatStyle}`}
                                  >
                                    {hasOpenTicket && (
                                      <span
                                        className="absolute -top-1.5 -right-1.5 z-20 w-3 h-3 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-md animate-bounce"
                                        title="Open Issue Ticket"
                                      >
                                        <AlertTriangle className="w-2 h-2 stroke-[3]" />
                                      </span>
                                    )}
                                    {isDisabled ? '·' : seatNum}
                                  </button>
                                  {hasAisleGap && <div className="w-3" />}
                                </React.Fragment>
                              );
                            })}
                          </div>

                          <span className="w-5 text-center font-mono font-bold text-[10px] text-[#D4AF37]">
                            {rowLetter}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Seat Detail Popover Card if selected */}
                {selectedSeatForDetails && (
                  <div className="p-4 rounded-2xl bg-[#0B0B0F] border border-[#D4AF37]/50 animate-fade-in text-xs space-y-3 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <span className="font-bold text-white text-sm">
                        Screen {selectedSeatForDetails.screen} • Seat{' '}
                        {selectedSeatForDetails.row}
                        {selectedSeatForDetails.seat}
                      </span>
                      <button
                        onClick={() => setSelectedSeatForDetails(null)}
                        className="text-[#A1A1AA] hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Check if seat has open issue tickets */}
                    {(() => {
                      const seatCode = `${selectedSeatForDetails.row}${selectedSeatForDetails.seat}`;
                      const seatTickets = tickets.filter(
                        (t) =>
                          t.screen === selectedSeatForDetails.screen &&
                          t.row.toUpperCase() === selectedSeatForDetails.row.toUpperCase() &&
                          (t.seat === selectedSeatForDetails.seat || t.seat === seatCode)
                      );
                      const openTicket = seatTickets.find((t) => t.status === 'open') || seatTickets[0];

                      return (
                        <>
                          {openTicket && (
                            <div className="p-3 rounded-xl bg-[#E50914]/15 border border-[#E50914]/40 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#E50914] flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Issue: {openTicket.issueType}</span>
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#E50914] text-white">
                                  {openTicket.status}
                                </span>
                              </div>
                              {openTicket.description && (
                                <p className="text-zinc-200 italic">
                                  "{openTicket.description}"
                                </p>
                              )}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={async () => {
                                    await storeService.updateTicketStatus(openTicket.id, 'resolved');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                                >
                                  Resolve Ticket
                                </button>
                                <button
                                  onClick={() => setStaffTab('tickets')}
                                  className="text-[10px] text-[#D4AF37] underline"
                                >
                                  Open in Tickets tab
                                </button>
                              </div>
                            </div>
                          )}

                          {selectedSeatForDetails.order ? (
                            <div className="space-y-1.5 pt-1">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-[#A1A1AA]">Order #{selectedSeatForDetails.order.orderId}</span>
                                <span className="font-bold text-[#D4AF37] uppercase">
                                  {selectedSeatForDetails.order.status}
                                </span>
                              </div>
                              <div className="space-y-1 py-1">
                                {selectedSeatForDetails.order.items.map((it, idx) => (
                                  <div key={idx} className="flex justify-between text-[11px] text-zinc-300">
                                    <span>
                                      {it.qty}x {it.name}
                                    </span>
                                    <span className="font-mono">₹{it.price * it.qty}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            !openTicket && (
                              <p className="text-[11px] text-[#A1A1AA]">
                                No active order for this seat. Customer has not ordered yet.
                              </p>
                            )
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </>
      )}
      </div>

      {/* MANUAL ORDER MODAL */}
      {isManualOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#15151C] border border-zinc-800 rounded-3xl shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-lg font-bold">Counter Manual Order</h3>
              </div>
              <button
                onClick={() => setIsManualOrderOpen(false)}
                className="text-[#A1A1AA] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {manualError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}

            <form onSubmit={handlePlaceManualOrder} className="space-y-4">
              {/* Screen, Row, Seat */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
                    Screen
                  </label>
                  <select
                    value={manualScreen}
                    onChange={(e) => setManualScreen(e.target.value)}
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="1">Screen 1</option>
                    <option value="2">Screen 2</option>
                    <option value="3">Screen 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
                    Row Letter
                  </label>
                  <input
                    type="text"
                    value={manualRow}
                    onChange={(e) => setManualRow(e.target.value.toUpperCase())}
                    placeholder="e.g. B"
                    required
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
                    Seat Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={manualSeat}
                    onChange={(e) => setManualSeat(e.target.value)}
                    placeholder="e.g. 7"
                    required
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Menu Item Quick Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-2">
                  Select Snacks & Drinks
                </label>
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {menuItems.map((item) => {
                    const qty = manualCart[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#0B0B0F] border border-zinc-800 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-8 h-8 rounded-lg object-cover bg-zinc-800 shrink-0"
                          />
                          <div className="truncate">
                            <span className="font-semibold text-white block truncate">{item.name}</span>
                            <span className="text-[#D4AF37] font-mono text-[11px]">₹{item.price}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {qty > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setManualCart((prev) => ({
                                  ...prev,
                                  [item.id]: Math.max(0, (prev[item.id] || 0) - 1),
                                }))
                              }
                              className="w-6 h-6 rounded bg-zinc-800 text-white font-bold flex items-center justify-center hover:bg-zinc-700"
                            >
                              -
                            </button>
                          )}
                          <span className="w-5 text-center font-mono font-bold">{qty}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setManualCart((prev) => ({
                                ...prev,
                                [item.id]: (prev[item.id] || 0) + 1,
                              }))
                            }
                            className="w-6 h-6 rounded bg-[#E50914] text-white font-bold flex items-center justify-center hover:bg-[#b80710]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
                  Special Notes
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. VIP patron, extra napkins"
                  className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsManualOrderOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="px-5 py-2 rounded-xl bg-[#E50914] text-xs font-bold text-white hover:bg-[#b80710] shadow-md shadow-[#E50914]/25"
                >
                  {isSubmittingManual ? 'Placing Order...' : 'Place Manual Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
