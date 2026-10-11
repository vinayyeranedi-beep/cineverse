import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  ChefHat,
  Bike,
  Film,
  X,
  ArrowRight,
  Info,
  Clock,
  Edit3,
  Trash2,
  Loader2,
  AlertTriangle,
  QrCode,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MenuItem, Order, OrderItem, Category, IssueType } from '../types';
import { storeService } from '../services/store';
import { soundService } from '../services/sound';
import { useCart } from '../context/CartContext';

interface CustomerOrderViewProps {
  screen: string;
  row: string;
  seat: string;
  menuItems: MenuItem[];
  orders: Order[];
  onOpenReportIssue?: (orderId?: string, initialIssue?: IssueType) => void;
  onOpenQRTest?: () => void;
}

const CATEGORIES: { label: string; value: Category | 'All' }[] = [
  { label: 'All Items', value: 'All' },
  { label: '🍿 Popcorn', value: 'Popcorn' },
  { label: '🥤 Drinks', value: 'Drinks' },
  { label: '🌮 Snacks', value: 'Snacks' },
  { label: '🎬 Combos', value: 'Combos' },
];

export const CustomerOrderView: React.FC<CustomerOrderViewProps> = ({
  screen,
  row,
  seat,
  menuItems,
  orders,
  onOpenReportIssue,
  onOpenQRTest,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [lastDeliveredOrderId, setLastDeliveredOrderId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);

  // Global Cart from Context (persisted in localStorage)
  const {
    cart,
    customerNotes,
    setCustomerNotes,
    addItem,
    decreaseItem,
    removeItem,
    clearCart,
    getItemQuantity,
    totalItemsCount,
    calculateTotal,
    isCartOpen,
    openCart,
    closeCart,
  } = useCart();

  const cartTotal = calculateTotal(menuItems);

  // Clean seat number & label e.g. "B7"
  const cleanSeatNum = seat.replace(/^[A-Za-z]+/, '') || seat;
  const cleanSeatLabel = `${row.toUpperCase()}${cleanSeatNum}`;

  // Session orders storage key for this specific seat
  const sessionOrdersKey = `seatserve_session_orders_${screen}_${row.toUpperCase()}_${cleanSeatNum}`;
  const [sessionOrderIds, setSessionOrderIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(sessionOrdersKey) || '[]');
    } catch {
      return [];
    }
  });

  const seatOrders = orders.filter((o: Order) => {
    const isSameSeat =
      String(o.screen) === String(screen) &&
      o.row.toUpperCase() === row.toUpperCase() &&
      o.seat.replace(/^[A-Za-z]+/, '') === cleanSeatNum;
    const isSessionOrder = sessionOrderIds.includes(o.id) || sessionOrderIds.includes(o.orderId || '');
    return isSameSeat || isSessionOrder;
  });

  const activeSeatOrders = seatOrders.filter((o: Order) => o.status !== 'delivered');
  const pastSeatOrders = seatOrders.filter((o: Order) => o.status === 'delivered');
  const latestActiveOrder = activeSeatOrders[0];

  // Check if current seat has an active order
  const activeOrder =
    storeService.getActiveOrderBySeat(screen, row, cleanSeatNum) ||
    storeService.getActiveOrderBySeat(screen, row, seat);

  // Status audio/confetti effects
  useEffect(() => {
    if (!activeOrder) return;
    if (activeOrder.status === 'on_the_way') {
      soundService.playReadySound();
    } else if (activeOrder.status === 'delivered' && lastDeliveredOrderId !== activeOrder.id) {
      setLastDeliveredOrderId(activeOrder.id);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  }, [activeOrder?.status, activeOrder?.id, lastDeliveredOrderId]);

  // Filter items
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle Order Placement
  const handlePlaceOrder = async () => {
    if (totalItemsCount === 0 || isSubmitting) return;
    setOrderError('');

    // 1. Block ordering if seat is missing or invalid
    if (!screen || !row || !cleanSeatNum) {
      setOrderError('Seat information is missing from this QR scan. Please report this issue to cinema staff.');
      return;
    }

    const validation = storeService.validateSeat(screen, row, cleanSeatNum);
    if (!validation.valid) {
      setOrderError(validation.reason || `Seat ${cleanSeatLabel} is invalid for Screen ${screen}. Please report this issue.`);
      return;
    }

    // 3. Block out-of-stock items
    for (const [itemId, qty] of Object.entries(cart)) {
      if (qty > 0) {
        const item = menuItems.find((m) => m.id === itemId);
        if (!item || !item.available) {
          setOrderError(`"${item?.name || 'An item'}" is currently sold out. Please remove it from your cart.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const orderItems: OrderItem[] = Object.entries(cart)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const item = menuItems.find((m) => m.id === itemId)!;
          return {
            id: item.id,
            name: item.name,
            qty,
            price: item.price,
            isVeg: item.isVeg,
          };
        });

      const placed = await storeService.placeOrder({
        screen,
        row: row.toUpperCase(),
        seat: cleanSeatNum,
        items: orderItems,
        total: cartTotal,
        notes: customerNotes.trim() || undefined,
      });

      // Remember order in session storage
      const existingIds = JSON.parse(localStorage.getItem(sessionOrdersKey) || '[]');
      if (!existingIds.includes(placed.id)) {
        const nextIds = [placed.id, ...existingIds];
        localStorage.setItem(sessionOrdersKey, JSON.stringify(nextIds));
        setSessionOrderIds(nextIds);
      }

      // Clear cart on success & return to menu
      clearCart();
      closeCart();
      soundService.playNewOrderSound();

      setToastMessage(`Order #${placed.orderId || placed.id.substring(0, 6)} placed for Seat ${cleanSeatLabel}!`);
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err: unknown) {
      console.error('Order placement error:', err);
      const msg = err instanceof Error ? err.message : 'Could not place order. Please try again.';
      setOrderError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validate seat against cinema seating grid
  const seatValidation = storeService.validateSeat(screen, row, cleanSeatNum);

  if (!seatValidation.valid) {
    return (
      <div className="min-h-[85vh] bg-[#0B0B0F] flex items-center justify-center p-4 text-white">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#15151C] border border-[#E50914]/50 shadow-[0_0_50px_rgba(229,9,20,0.15)] text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[#E50914]/15 border border-[#E50914]/40 text-[#E50914] flex items-center justify-center mx-auto shadow-lg shadow-[#E50914]/20">
            <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-display font-black text-white">
              This QR code is not valid.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Please report the issue so our cinema team can assist you at your seat.
            </p>
            {seatValidation.reason && (
              <p className="text-xs text-[#E50914] font-medium bg-[#E50914]/10 p-2.5 rounded-xl border border-[#E50914]/20">
                {seatValidation.reason}
              </p>
            )}
          </div>

          <div className="pt-2">
            {onOpenReportIssue && (
              <button
                onClick={() => onOpenReportIssue(undefined, 'QR not working')}
                className="w-full py-3.5 px-6 rounded-xl bg-[#E50914] hover:bg-[#c80812] text-white font-display font-black text-sm tracking-wide shadow-lg shadow-[#E50914]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-h-[48px]"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Report Issue</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] pb-36 text-white">
      {/* FIXED BANNER AT VERY TOP OF EVERY CUSTOMER SCREEN - STAYS VISIBLE WHILE SCROLLING */}
      <div className="sticky top-16 z-30 bg-[#0B0B0F]/95 backdrop-blur-md border-b border-[#D4AF37]/30 px-4 py-2.5 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="w-6 h-6 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
              <Film className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs sm:text-sm font-display font-bold tracking-wide">
              Screen {screen} - Seat {cleanSeatLabel}
            </span>
            {onOpenQRTest && (
              <button
                onClick={onOpenQRTest}
                title="Test Armrest QR Scanner & Seat Simulator"
                className="ml-1 sm:ml-2 px-2 py-0.5 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-[#D4AF37] hover:text-white border border-[#D4AF37]/30 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
              >
                <QrCode className="w-3 h-3" />
                <span>Test QR</span>
              </button>
            )}
          </div>

          {onOpenReportIssue && (
            <button
              onClick={() => onOpenReportIssue(activeOrder?.orderId || activeOrder?.id)}
              className="text-[11px] font-semibold text-zinc-400 hover:text-[#D4AF37] transition-colors flex items-center gap-1.5 min-h-[32px] px-2 py-1 rounded-lg hover:bg-zinc-800/60"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Report an issue</span>
            </button>
          )}
        </div>
      </div>

      {/* CLEAR SEAT BANNER - Delivering to Screen 1 - Seat B7 (No extra clutter) */}
      <section className="bg-[#15151C] border-b border-zinc-800 px-4 py-4 sm:py-5 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-0.5">
            <Film className="w-3.5 h-3.5" />
            <span>SeatServe Cinema Dining</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white flex items-center gap-2">
            Delivering to <span className="text-[#D4AF37]">Screen {screen} - Seat {cleanSeatLabel}</span>
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Fresh snacks & beverages delivered directly to your armrest during the show.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 pt-4">
        {/* LIVE ORDER TRACKER BANNER (If seat has active order) */}
        {activeOrder && (
          <motion.div
            key={`${activeOrder.id}-${activeOrder.status}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#15151C] border border-[#D4AF37]/50 shadow-xl shadow-black/40"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E50914] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#E50914]"></span>
                </span>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Active Order #{activeOrder.orderId || activeOrder.id.substring(0, 7)}
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Screen {activeOrder.screen} • Seat {activeOrder.row.toUpperCase()}
                    {activeOrder.seat.replace(/^[A-Za-z]+/, '') || activeOrder.seat} • Placed at{' '}
                    {new Date(activeOrder.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {onOpenReportIssue && (
                  <button
                    onClick={() => onOpenReportIssue(activeOrder.orderId || activeOrder.id, 'Order delayed')}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Report issue</span>
                  </button>
                )}
                <div className="text-right">
                  <span className="text-xs text-[#A1A1AA] block">Order Amount</span>
                  <span className="font-display font-extrabold text-[#D4AF37] text-lg">
                    ₹{activeOrder.total}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Live Tracker: Received -> Preparing -> On the Way -> Delivered */}
            <div className="py-5">
              <div className="grid grid-cols-4 gap-1 text-center relative">
                {/* Step 1: Received */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      ['received', 'preparing', 'on_the_way', 'delivered'].includes(activeOrder.status)
                        ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/30'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-white mt-2">Received</span>
                  <span className="text-[10px] text-[#A1A1AA] hidden sm:inline">Sent to counter</span>
                </div>

                {/* Step 2: Preparing */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      ['preparing', 'on_the_way', 'delivered'].includes(activeOrder.status)
                        ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/30'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-white mt-2">Preparing</span>
                  <span className="text-[10px] text-[#A1A1AA] hidden sm:inline">Popping & packing</span>
                </div>

                {/* Step 3: On the Way */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      ['on_the_way', 'delivered'].includes(activeOrder.status)
                        ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/30 ring-2 ring-[#2563EB]/60'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Bike className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[#2563EB] mt-2">On the Way</span>
                  <span className="text-[10px] text-[#A1A1AA] hidden sm:inline">Runner dispatched</span>
                </div>

                {/* Step 4: Delivered */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      activeOrder.status === 'delivered'
                        ? 'bg-[#22C55E] text-white font-bold'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Film className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[#22C55E] mt-2">Delivered</span>
                  <span className="text-[10px] text-[#A1A1AA] hidden sm:inline">Enjoy movie</span>
                </div>
              </div>
            </div>

            {/* Order Items Summary */}
            <div className="bg-[#0B0B0F] rounded-xl p-3.5 text-xs border border-zinc-800">
              <div className="text-[#A1A1AA] font-semibold mb-1.5">Items in preparation:</div>
              <div className="flex flex-wrap gap-2">
                {activeOrder.items.map((it, idx) => (
                  <span
                    key={idx}
                    className="bg-[#15151C] text-white px-2.5 py-1 rounded-lg font-mono text-[11px] border border-zinc-800"
                  >
                    {it.qty}x {it.name}
                  </span>
                ))}
              </div>
              {activeOrder.notes && (
                <p className="mt-2 text-[#D4AF37] italic text-[11px]">
                  Special instruction: "{activeOrder.notes}"
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Search & Category Filter Navigation */}
        <div className="sticky top-16 z-30 bg-[#0B0B0F]/95 py-3 backdrop-blur-md space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search popcorn, soft drinks, nachos, combos..."
              className="w-full bg-[#15151C] border border-zinc-800 rounded-xl pl-10 pr-9 py-3 text-sm text-white placeholder-[#A1A1AA] focus:outline-none focus:border-[#D4AF37] min-h-[48px] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[40px] flex items-center gap-1.5 ${
                  selectedCategory === cat.value
                    ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                    : 'bg-[#15151C] text-[#A1A1AA] hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Food Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {filteredItems.map((item) => {
            const quantityInCart = getItemQuantity(item.id);

            return (
              <div
                key={item.id}
                className={`bg-[#15151C] rounded-2xl border transition-all overflow-hidden p-3.5 sm:p-4 flex flex-col justify-between ${
                  item.available
                    ? 'border-zinc-800 hover:border-zinc-700'
                    : 'border-zinc-900 opacity-60 bg-zinc-950/60'
                }`}
              >
                <div className="flex gap-3.5">
                  {/* Photo */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-zinc-900 shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${
                        !item.available ? 'grayscale' : ''
                      }`}
                      loading="lazy"
                    />
                    {!item.available && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-1 text-center">
                        <span className="text-[10px] font-extrabold text-[#E50914] uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      {/* Veg / Non-Veg Indicator & Category */}
                      <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                        <div
                          title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                          className={`w-3.5 h-3.5 border flex items-center justify-center rounded-[3px] shrink-0 ${
                            item.isVeg ? 'border-[#22C55E]' : 'border-[#E50914]'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isVeg ? 'bg-[#22C55E]' : 'bg-[#E50914]'
                            }`}
                          />
                        </div>
                        <span className="text-[#A1A1AA] font-semibold">{item.category}</span>
                      </div>

                      <h3 className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-2">
                        {item.name}
                      </h3>
                      <p className="text-xs text-[#A1A1AA] line-clamp-2 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Price and Add Control */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800">
                      <span className="font-display font-black text-[#D4AF37] text-base sm:text-lg">
                        ₹{item.price}
                      </span>

                      {item.available ? (
                        quantityInCart === 0 ? (
                          /* Add Button */
                          <button
                            onClick={() => addItem(item)}
                            disabled={Boolean(activeOrder)}
                            title={activeOrder ? 'You have an order in progress' : 'Add to cart'}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[44px] min-w-[76px] justify-center ${
                              activeOrder
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : 'bg-[#E50914] hover:bg-[#c80812] text-white shadow-md shadow-[#E50914]/25 active:scale-95'
                            }`}
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>Add</span>
                          </button>
                        ) : (
                          /* Quantity Control (- 1 +) */
                          <div className="flex items-center bg-[#0B0B0F] border border-[#D4AF37]/50 rounded-xl overflow-hidden min-h-[44px] shadow-sm">
                            <button
                              onClick={() => decreaseItem(item.id)}
                              aria-label="Decrease quantity"
                              className="px-3 py-2 text-[#A1A1AA] hover:text-white hover:bg-zinc-800 min-h-[44px] flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-2.5 font-mono font-bold text-xs text-[#D4AF37] min-w-[24px] text-center">
                              {quantityInCart}
                            </span>
                            <button
                              onClick={() => addItem(item)}
                              aria-label="Increase quantity"
                              className="px-3 py-2 text-[#A1A1AA] hover:text-white hover:bg-zinc-800 min-h-[44px] flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-[#A1A1AA]/60 font-semibold italic">Sold Out</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 bg-[#15151C] rounded-2xl border border-zinc-800 p-6 mt-4">
            <Film className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-white font-bold text-base">No cinema snacks found</p>
            <p className="text-xs text-[#A1A1AA] mt-1">Try searching for butter popcorn, cola, or nachos.</p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* FLOATING GOLD-BORDERED CART BAR (Visible on mobile when items in cart) */}
      {/* ============================================================ */}
      {totalItemsCount > 0 && !isCartOpen && (
        <aside
          aria-label="Floating cart summary"
          className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto sm:hidden animate-fade-in"
        >
          <div className="p-1 rounded-2xl bg-[#0B0B0F]/95 backdrop-blur-md border border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.3)]">
            <button
              onClick={openCart}
              className="w-full bg-[#E50914] hover:bg-[#c80812] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-between shadow-lg shadow-[#E50914]/30 min-h-[48px] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-sm font-display font-black tracking-wide">View Cart</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-white/90">
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                </span>
                <span className="text-sm font-mono font-black text-white bg-black/30 px-2 py-0.5 rounded-lg border border-white/10">
                  Rs {cartTotal}
                </span>
              </div>
            </button>
          </div>
        </aside>
      )}

      {/* ============================================================ */}
      {/* CART SCREEN / BOTTOM SHEET MODAL */}
      {/* ============================================================ */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
        >
          {/* Backdrop click to close */}
          <div className="fixed inset-0" onClick={closeCart} aria-hidden="true" />

          {/* Cart Dialog Card: Bottom sheet on mobile, centered modal on tablet/desktop */}
          <div className="relative w-full sm:max-w-lg bg-[#15151C] border border-[#D4AF37]/50 rounded-t-3xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden z-10 flex flex-col max-h-[90vh] text-white animate-slide-up">
            {/* Cart Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-[#15151C] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#E50914]/15 text-[#E50914] border border-[#E50914]/30">
                  <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 id="cart-drawer-title" className="font-bold text-lg text-white">
                    Your Cinema Cart
                  </h2>
                  <span className="text-xs text-[#A1A1AA]">
                    {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} selected
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {totalItemsCount > 0 && (
                  <button
                    onClick={clearCart}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 text-xs font-semibold transition-colors flex items-center gap-1"
                    title="Clear all items from cart"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}

                <button
                  onClick={closeCart}
                  aria-label="Close cart"
                  className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-zinc-800 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* SEAT BANNER INSIDE CART */}
            <div className="px-4 py-2.5 bg-[#0B0B0F] border-b border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-md bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
                  <Film className="w-3 h-3" />
                </span>
                <span className="text-[#A1A1AA] truncate">
                  Delivering to:{' '}
                  <span className="font-bold text-[#D4AF37] font-mono">
                    Screen {screen} - Seat {cleanSeatLabel}
                  </span>
                </span>
              </div>
              {onOpenReportIssue && (
                <button
                  onClick={() => {
                    closeCart();
                    onOpenReportIssue(undefined, 'Wrong seat');
                  }}
                  className="text-[11px] font-semibold text-zinc-400 hover:text-[#D4AF37] transition-colors flex items-center gap-1 shrink-0 ml-2"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>Report issue</span>
                </button>
              )}
            </div>

            {/* Error Message Alert */}
            {orderError && (
              <div className="m-4 mb-0 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{orderError}</span>
              </div>
            )}

            {/* Cart Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {totalItemsCount === 0 ? (
                /* EMPTY CART STATE */
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8 stroke-[1.8]" />
                  </div>
                  <h3 className="font-bold text-white text-base">Your cart is empty</h3>
                  <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto leading-relaxed">
                    Add freshly popped popcorn, chilled beverages, or movie combos to enjoy during the film.
                  </p>
                  <button
                    onClick={closeCart}
                    className="mt-3 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#c80812] text-xs font-bold text-white shadow-md shadow-[#E50914]/25 transition-all"
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                /* CART ITEMS LIST */
                <div className="space-y-3 divide-y divide-zinc-800/80">
                  {Object.entries(cart)
                    .filter(([_, qty]) => qty > 0)
                    .map(([itemId, qty]) => {
                      const item = menuItems.find((m) => m.id === itemId);
                      if (!item) return null;
                      const itemSubtotal = item.price * qty;

                      return (
                        <div key={itemId} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Item Photo */}
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover bg-zinc-900 shrink-0 border border-zinc-800"
                            />
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    item.isVeg ? 'bg-[#22C55E]' : 'bg-[#E50914]'
                                  }`}
                                />
                                <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                              </div>
                              <span className="text-xs text-[#A1A1AA]">₹{item.price} each</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {/* Quantity Controls (- 1 +) */}
                            <div className="flex items-center bg-[#0B0B0F] rounded-xl border border-zinc-700 min-h-[36px]">
                              <button
                                onClick={() => decreaseItem(itemId)}
                                aria-label="Decrease quantity"
                                className="px-2 py-1 text-[#A1A1AA] hover:text-white"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2 font-mono text-xs font-bold text-[#D4AF37]">
                                {qty}
                              </span>
                              <button
                                onClick={() => addItem(item)}
                                aria-label="Increase quantity"
                                className="px-2 py-1 text-[#A1A1AA] hover:text-white"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Item Subtotal */}
                            <span className="font-mono font-bold text-xs sm:text-sm text-[#D4AF37] w-14 text-right">
                              ₹{itemSubtotal}
                            </span>

                            {/* Remove item button */}
                            <button
                              onClick={() => removeItem(itemId)}
                              aria-label="Remove item"
                              className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {/* Customer Special Notes Field */}
                  <div className="pt-4 space-y-1.5">
                    <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                      Cinema Delivery Note (e.g. less salt, extra tissues)
                    </label>
                    <input
                      type="text"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="e.g. less salt on popcorn, extra straw..."
                      maxLength={100}
                      className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37] min-h-[44px]"
                    />
                  </div>

                  {/* Bill Breakdown */}
                  <div className="pt-4 space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#A1A1AA]">
                      <span>Items Subtotal</span>
                      <span className="font-mono text-white">₹{cartTotal}</span>
                    </div>
                    <div className="flex justify-between text-[#A1A1AA]">
                      <span>In-Seat Delivery Service</span>
                      <span className="font-mono text-[#22C55E] font-semibold">FREE</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-zinc-800">
                      <span>Total Amount</span>
                      <span className="font-display font-black text-[#D4AF37] text-xl">
                        ₹{cartTotal}
                      </span>
                    </div>
                  </div>

                  {/* Pay-At-Seat Notice */}
                  <div className="pt-3">
                    <div className="p-3 rounded-xl bg-[#0B0B0F] border border-zinc-800 flex items-start gap-2.5 text-xs text-[#A1A1AA]">
                      <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white block">Pay on Delivery at Seat</span>
                        <span>Pay runner via UPI or cash when food is handed over at your seat.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Place Order Footer */}
            {totalItemsCount > 0 && (
              <div className="p-4 sm:p-5 border-t border-zinc-800 bg-[#0B0B0F] shrink-0">
                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || totalItemsCount === 0}
                  className="w-full py-3.5 sm:py-4 px-4 rounded-xl bg-[#E50914] hover:bg-[#c80812] text-white font-bold text-sm sm:text-base shadow-lg shadow-[#E50914]/25 transition-all flex items-center justify-center gap-2 min-h-[50px] active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending Order to Counter...</span>
                    </>
                  ) : (
                    <>
                      <ChefHat className="w-5 h-5 stroke-[2.2]" />
                      <span>
                        Place Order for Seat {cleanSeatLabel} (₹{cartTotal})
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
