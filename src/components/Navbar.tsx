import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Lock,
  User,
  LogOut,
  LayoutDashboard,
  ChefHat,
  Settings,
  ShoppingBag,
  Volume2,
  VolumeX,
  AlertTriangle,
  QrCode,
} from 'lucide-react';
import { ActiveTab, UserProfile } from '../types';
import { soundService } from '../services/sound';
import { storeService } from '../services/store';
import { useCart } from '../context/CartContext';
import { CineverseLogo } from './CineverseLogo';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: UserProfile | null;
  onOpenStaffLogin: () => void;
  onOpenReportIssue?: () => void;
  onOpenQRTest?: () => void;
  activeOrderCount?: number;
  openTicketsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenStaffLogin,
  onOpenReportIssue,
  onOpenQRTest,
  activeOrderCount = 0,
  openTicketsCount = 0,
}) => {
  const [soundOn, setSoundOn] = useState(soundService.isSoundEnabled());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { totalItemsCount, openCart } = useCart();

  const toggleSound = () => {
    const next = !soundOn;
    soundService.setSoundEnabled(next);
    setSoundOn(next);
    if (next) {
      soundService.playReadySound();
    }
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await storeService.logout();
    setActiveTab('order');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCustomerPage = activeTab === 'order';

  return (
    <header className="sticky top-0 z-40 bg-[#0B0B0F]/95 backdrop-blur-md border-b border-[#15151C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo */}
          <button
            onClick={() => setActiveTab('order')}
            className="text-left group transition-transform hover:scale-[1.02]"
          >
            <CineverseLogo size="sm" />
          </button>

          {/* ========================================================= */}
          {/* CUSTOMER PAGE: CART ICON + DISCREET STAFF ICON */}
          {/* ========================================================= */}
          {isCustomerPage ? (
            <div className="flex items-center gap-2">
              {/* Report an Issue button */}
              {onOpenReportIssue && (
                <button
                  onClick={onOpenReportIssue}
                  aria-label="Report an issue"
                  title="Report an issue with your seat or order"
                  className="h-10 px-3 rounded-xl bg-[#15151C] border border-zinc-800 text-zinc-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 hover:shadow-[0_0_12px_rgba(212,175,55,0.2)] flex items-center gap-1.5 transition-all text-xs font-semibold min-h-[40px] active:scale-95"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Report Issue</span>
                </button>
              )}

              {/* QR Tester Button */}
              {onOpenQRTest && (
                <button
                  onClick={onOpenQRTest}
                  aria-label="Test QR Code & Seat Tracking"
                  title="Test Armrest QR Scanner & Seat Simulator"
                  className="h-10 px-2.5 sm:px-3 rounded-xl bg-[#15151C] border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:shadow-[0_0_12px_rgba(212,175,55,0.2)] flex items-center gap-1.5 transition-all text-xs font-semibold min-h-[40px] active:scale-95"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden sm:inline">Test QR</span>
                </button>
              )}

              {/* Header Cart Icon Button with Red Item-Count Badge */}
              <button
                onClick={openCart}
                aria-label={`View Cart, ${totalItemsCount} items`}
                title="View Cinema Food Cart"
                className="w-10 h-10 rounded-xl bg-[#15151C] border border-zinc-800 text-zinc-300 hover:text-white hover:border-[#D4AF37]/60 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] flex items-center justify-center transition-all duration-200 min-h-[40px] min-w-[40px] active:scale-95 relative"
              >
                <ShoppingBag className="w-4 h-4" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-[#E50914] text-white flex items-center justify-center shadow-md shadow-[#E50914]/50 border border-[#0B0B0F]">
                    {totalItemsCount}
                  </span>
                )}
              </button>

              {!currentUser ? (
                /* Discreet lock icon button for staff/admin login */
                <button
                  onClick={onOpenStaffLogin}
                  aria-label="Staff Login"
                  title="Staff Portal"
                  className="w-10 h-10 rounded-xl bg-[#15151C] border border-zinc-800 text-zinc-500 hover:text-[#D4AF37] hover:border-[#D4AF37]/60 hover:shadow-[0_0_15px_rgba(212,175,55,0.25)] flex items-center justify-center transition-all duration-200 min-h-[40px] min-w-[40px] active:scale-95"
                >
                  <Lock className="w-4 h-4 stroke-[2]" />
                </button>
              ) : (
                /* Logged-in Staff/Admin Avatar with Dropdown */
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    aria-label="User Menu"
                    className="w-10 h-10 rounded-xl bg-[#15151C] border border-[#D4AF37]/50 text-[#D4AF37] hover:shadow-[0_0_15px_rgba(212,175,55,0.25)] flex items-center justify-center font-display font-bold text-xs transition-all min-h-[40px] min-w-[40px] active:scale-95 relative"
                  >
                    <User className="w-4 h-4" />
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#E50914] ring-2 ring-[#0B0B0F]" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-[#15151C] border border-[#D4AF37]/40 rounded-2xl shadow-2xl overflow-hidden py-1 z-50 animate-fade-in text-xs">
                      <div className="px-3.5 py-2.5 border-b border-zinc-800">
                        <span className="font-bold text-white block truncate">
                          {currentUser.name || currentUser.email}
                        </span>
                        <span className="text-[10px] text-[#D4AF37] uppercase font-mono tracking-wider font-semibold">
                          {currentUser.role === 'admin' ? 'Administrator' : 'Counter Staff'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (currentUser.role === 'admin') {
                            setActiveTab('admin');
                          } else {
                            setActiveTab('counter');
                          }
                        }}
                        className="w-full px-3.5 py-2.5 text-left text-zinc-200 hover:text-white hover:bg-zinc-800 flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#D4AF37]" />
                        <span>Go to Dashboard</span>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full px-3.5 py-2.5 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors font-medium border-t border-zinc-800/80"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* STAFF / ADMIN PAGES: Top controls for back to menu & sign out */
            /* ========================================================= */
            <div className="flex items-center gap-2">
              {/* QR Tester Button */}
              {onOpenQRTest && (
                <button
                  onClick={onOpenQRTest}
                  aria-label="Test QR Code"
                  title="Test Armrest QR Scanner & Seat Simulator"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#15151C] hover:bg-zinc-800 border border-[#D4AF37]/30 text-xs font-semibold text-[#D4AF37] hover:text-white transition-colors min-h-[40px]"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Test QR</span>
                </button>
              )}

              {/* Back to Customer Menu */}
              <button
                onClick={() => setActiveTab('order')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#15151C] hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition-colors min-h-[40px]"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="hidden sm:inline">Customer Menu</span>
              </button>

              {/* Counter / Admin quick toggle for Admin role */}
              {currentUser?.role === 'admin' && (
                <div className="flex items-center bg-[#15151C] p-1 rounded-xl border border-zinc-800 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('counter')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'counter'
                        ? 'bg-[#E50914] text-white font-bold'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Counter</span>
                    {activeOrderCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white text-[#E50914] font-bold">
                        {activeOrderCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'admin'
                        ? 'bg-[#E50914] text-white font-bold'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Admin</span>
                  </button>
                </div>
              )}

              {/* Open tickets indicator for staff */}
              {openTicketsCount > 0 && (
                <div
                  title={`${openTicketsCount} open issue tickets requiring attention`}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#E50914]/20 border border-[#E50914]/50 text-[#E50914] text-xs font-bold animate-pulse"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{openTicketsCount} Ticket{openTicketsCount === 1 ? '' : 's'}</span>
                </div>
              )}

              {/* Sound chime toggle */}
              <button
                onClick={toggleSound}
                title={soundOn ? 'Kitchen chime on' : 'Kitchen chime muted'}
                className="p-2.5 rounded-xl bg-[#15151C] border border-zinc-800 text-[#A1A1AA] hover:text-[#D4AF37] hover:bg-zinc-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                {soundOn ? <Volume2 className="w-4 h-4 text-[#D4AF37]" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
              </button>

              {/* Staff Profile & Logout */}
              {currentUser && (
                <div className="flex items-center gap-2 pl-1">
                  <div className="text-right hidden lg:block">
                    <span className="text-xs font-bold text-white block truncate max-w-[120px]">
                      {currentUser.name || currentUser.email}
                    </span>
                    <span className="text-[9px] text-[#D4AF37] uppercase font-mono">
                      {currentUser.role}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 rounded-xl bg-[#15151C] hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-400 border border-zinc-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
