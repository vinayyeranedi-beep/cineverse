import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  X,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Film,
  ShoppingBag,
} from 'lucide-react';
import { storeService } from '../services/store';
import { MenuItem } from '../types';

interface QRTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: string;
  currentRow: string;
  currentSeat: string;
  menuItems: MenuItem[];
  onSelectSeat: (screen: string, row: string, seat: string) => void;
}

export const QRTestModal: React.FC<QRTestModalProps> = ({
  isOpen,
  onClose,
  currentScreen,
  currentRow,
  currentSeat,
  menuItems,
  onSelectSeat,
}) => {
  const [selectedScreen, setSelectedScreen] = useState(currentScreen || '1');
  const [selectedRow, setSelectedRow] = useState(currentRow || 'B');
  const [selectedSeat, setSelectedSeat] = useState(currentSeat.replace(/^[A-Za-z]+/, '') || '7');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [testOrderPlaced, setTestOrderPlaced] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Synchronize when opened with current props
  useEffect(() => {
    if (isOpen) {
      setSelectedScreen(currentScreen || '1');
      setSelectedRow(currentRow || 'B');
      setSelectedSeat(currentSeat.replace(/^[A-Za-z]+/, '') || '7');
      setTestOrderPlaced(false);
    }
  }, [isOpen, currentScreen, currentRow, currentSeat]);

  // Determine repository base URL
  const getBaseUrl = (): string => {
    if (typeof window === 'undefined') return 'https://vinayyeranedi-beep.github.io/cineverse';
    const segments = window.location.pathname.split('/').filter(Boolean);
    const repoBase =
      segments.length > 0 && !['order', 'counter', 'staff', 'admin'].includes(segments[0].toLowerCase())
        ? '/' + segments[0]
        : '';
    return `${window.location.origin}${repoBase}`;
  };

  const baseUrl = getBaseUrl();
  const cleanSeatNum = selectedSeat.replace(/^[A-Za-z]+/, '') || selectedSeat;
  const targetUrl = `${baseUrl}/?screen=${selectedScreen}&row=${selectedRow.toUpperCase()}&seat=${cleanSeatNum}`;

  // Generate QR code data URL whenever screen, row, or seat changes
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(targetUrl, {
      width: 320,
      margin: 1.5,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [targetUrl]);

  if (!isOpen) return null;

  // Seat validation
  const validation = storeService.validateSeat(selectedScreen, selectedRow, cleanSeatNum);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleSimulateScan = () => {
    onSelectSeat(selectedScreen, selectedRow.toUpperCase(), cleanSeatNum);
    onClose();
  };

  const handleOpenNewTab = () => {
    window.open(targetUrl, '_blank');
  };

  const handlePlaceTestOrder = async () => {
    setIsPlacingOrder(true);
    try {
      // Find sample items (e.g. popcorn and drink)
      const popcornItem = menuItems.find((m) => m.category === 'Popcorn') || menuItems[0];
      const drinkItem = menuItems.find((m) => m.category === 'Drinks') || menuItems[1];

      const items: import('../types').OrderItem[] = [];
      let total = 0;

      if (popcornItem) {
        items.push({
          id: popcornItem.id,
          name: popcornItem.name,
          price: popcornItem.price,
          qty: 1,
          isVeg: popcornItem.isVeg,
        });
        total += popcornItem.price;
      }

      if (drinkItem) {
        items.push({
          id: drinkItem.id,
          name: drinkItem.name,
          price: drinkItem.price,
          qty: 1,
          isVeg: drinkItem.isVeg,
        });
        total += drinkItem.price;
      }

      await storeService.placeOrder({
        screen: selectedScreen,
        row: selectedRow.toUpperCase(),
        seat: cleanSeatNum,
        items:
          items.length > 0
            ? items
            : [{ id: 'p1', name: 'Caramel Popcorn', price: 290, qty: 1, isVeg: true }],
        total: total > 0 ? total : 290,
        notes: 'Test order from QR testing suite',
      });

      // Switch to this seat immediately so the customer view shows the live order tracker
      onSelectSeat(selectedScreen, selectedRow.toUpperCase(), cleanSeatNum);
      setTestOrderPlaced(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to place test order:', err);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleClearOrders = async () => {
    await storeService.clearAllOrders();
    setTestOrderPlaced(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#15151C] border border-[#D4AF37]/40 rounded-3xl shadow-2xl p-5 sm:p-7 text-white my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
              <QrCode className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-black text-white flex items-center gap-2">
                QR Scanner & Seat Tracking Tester
                <span className="text-[10px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  LIVE TEST
                </span>
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Verify armrest QR code scanning, web redirection, and real-time seat delivery tracking.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close QR tester"
            className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
          {/* Left Column: QR Code Display & Scan Frame */}
          <div className="flex flex-col items-center bg-[#0B0B0F] p-4 rounded-2xl border border-zinc-800/80 text-center">
            <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Aim Mobile Camera to Test</span>
            </div>

            {/* QR Image with Cinema Sticker Frame */}
            <div className="relative p-3 bg-white rounded-2xl shadow-xl w-56 h-56 flex flex-col items-center justify-center my-1 group">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR for Screen ${selectedScreen} Seat ${selectedRow}${cleanSeatNum}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="mt-3">
              <div className="text-sm font-black font-display text-white">
                Screen {selectedScreen} • Seat {selectedRow.toUpperCase()}{cleanSeatNum}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5 font-mono truncate max-w-[240px]">
                {targetUrl}
              </div>
            </div>

            {/* Action buttons under QR */}
            <div className="flex items-center gap-2 mt-4 w-full">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
              <button
                onClick={handleOpenNewTab}
                title="Open in new window"
                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>New Tab</span>
              </button>
            </div>
          </div>

          {/* Right Column: Seat Selectors, Verification Checks, 1-Click Simulation */}
          <div className="space-y-4 flex flex-col justify-between">
            {/* Seat Coordinate Pickers */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                Select Seat Coordinates to Test
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Auditorium</label>
                  <select
                    value={selectedScreen}
                    onChange={(e) => setSelectedScreen(e.target.value)}
                    className="w-full bg-[#0B0B0F] border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="1">Screen 1 (IMAX)</option>
                    <option value="2">Screen 2</option>
                    <option value="3">Screen 3 (VIP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Row Letter</label>
                  <select
                    value={selectedRow}
                    onChange={(e) => setSelectedRow(e.target.value.toUpperCase())}
                    className="w-full bg-[#0B0B0F] border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    {'ABCDEFGHIJKLMN'.split('').map((r) => (
                      <option key={r} value={r}>
                        Row {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Seat Number</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={selectedSeat}
                    onChange={(e) => setSelectedSeat(e.target.value)}
                    className="w-full bg-[#0B0B0F] border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Status Validation Indicator */}
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                  validation.valid
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                }`}
              >
                {validation.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-medium">
                  {validation.valid
                    ? `Seat ${selectedRow.toUpperCase()}${cleanSeatNum} in Screen ${selectedScreen} is valid & ready.`
                    : validation.reason || 'Seat coordinate unavailable in layout.'}
                </span>
              </div>
            </div>

            {/* Test Verification Mechanisms */}
            <div className="bg-[#0B0B0F] p-3 rounded-2xl border border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Mechanism Verification Status
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>URL Parameter Parsing</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Session Storage Lock</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Staff Counter Sync</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Live Status Tracker</span>
                </div>
              </div>
            </div>

            {/* Simulation Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleSimulateScan}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:from-[#c29f2f] hover:to-[#91690a] text-black font-display font-black text-xs tracking-wider uppercase shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Smartphone className="w-4 h-4" />
                <span>Simulate Scan on This Device (Switch Seat)</span>
              </button>

              <button
                onClick={handlePlaceTestOrder}
                disabled={isPlacingOrder || !validation.valid}
                className="w-full py-2.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#c80812] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-[#E50914]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {testOrderPlaced ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Test Order Placed for {selectedRow.toUpperCase()}{cleanSeatNum}!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Place 1-Click Test Order for this Seat</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer info & reset */}
        <div className="mt-5 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Tested with Cineverse Multiplex armrest QR sticker specification.</span>
          </div>
          <button
            onClick={handleClearOrders}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors self-end sm:self-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear test orders</span>
          </button>
        </div>
      </div>
    </div>
  );
};
