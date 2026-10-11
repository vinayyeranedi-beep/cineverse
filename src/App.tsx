import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CustomerOrderView } from './components/CustomerOrderView';
import { StaffDashboard } from './components/StaffDashboard';
import { AdminPanel } from './components/AdminPanel';
import { StaffLoginModal } from './components/StaffLoginModal';
import { ReportIssueModal } from './components/ReportIssueModal';
import { QRTestModal } from './components/QRTestModal';
import { CineverseSplash } from './components/CineverseSplash';
import { CartProvider } from './context/CartContext';
import { storeService } from './services/store';
import { MenuItem, Order, UserProfile, ActiveTab, Ticket, IssueType } from './types';

const SESSION_STORAGE_SEAT_KEY = 'seatserve_session_seat';

// Helper to detect GitHub Pages repository base (e.g. /cineverse)
const getRepoBase = (): string => {
  if (typeof window === 'undefined') return '';
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length > 0 && !['order', 'counter', 'staff', 'admin'].includes(segments[0])) {
    return '/' + segments[0];
  }
  return '';
};

export default function App() {
  // Handle GitHub Pages SPA 404 redirect (?p=... or ?tab=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const redirectedPath = params.get('p');
    if (redirectedPath) {
      const cleanPath = redirectedPath.startsWith('/') ? redirectedPath : '/' + redirectedPath;
      const repoBase = getRepoBase();
      const newUrl = window.location.origin + repoBase + cleanPath;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Navigation tab: /order, /counter, /admin
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab')?.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const user = storeService.getCurrentUser();

      // Protect /admin: only admin can access
      if (path.includes('admin') || tabParam === 'admin' || hash.includes('admin')) {
        if (user && user.role === 'admin') return 'admin';
        return 'order';
      }

      // Protect /counter or /staff: only staff or admin can access
      if (path.includes('counter') || path.includes('staff') || tabParam === 'counter' || hash.includes('counter')) {
        if (user && (user.role === 'staff' || user.role === 'admin')) return 'counter';
        return 'order';
      }
    }
    return 'order';
  });

  // Automatic Seat Capture (No confirmation modal/step)
  const [screen, setScreen] = useState<string>('1');
  const [row, setRow] = useState<string>('B');
  const [seat, setSeat] = useState<string>('7');

  // Staff Login Modal state
  const [isStaffLoginModalOpen, setIsStaffLoginModalOpen] = useState(false);

  // QR Test & Seat Simulator Modal state
  const [isQRTestModalOpen, setIsQRTestModalOpen] = useState(false);

  // Issue Reporting Modal state
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
  const [reportIssueOrderId, setReportIssueOrderId] = useState<string | undefined>(undefined);
  const [reportIssueInitialType, setReportIssueInitialType] = useState<IssueType | undefined>(undefined);

  // Store data
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>(() => storeService.getTickets());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(storeService.getCurrentUser());
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Enforce strict route protection on load & state updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab')?.toLowerCase();
    const repoBase = getRepoBase();

    // Check Counter access
    if (activeTab === 'counter' || path.includes('counter') || path.includes('staff') || tabParam === 'counter') {
      if (!currentUser || (currentUser.role !== 'staff' && currentUser.role !== 'admin')) {
        setActiveTab('order');
        const url = new URL(window.location.href);
        url.pathname = repoBase ? `${repoBase}/` : '/';
        url.searchParams.delete('tab');
        window.history.replaceState({}, '', url.toString());
      }
    }

    // Check Admin access
    if (activeTab === 'admin' || path.includes('admin') || tabParam === 'admin') {
      if (!currentUser) {
        setActiveTab('order');
        const url = new URL(window.location.href);
        url.pathname = repoBase ? `${repoBase}/` : '/';
        url.searchParams.delete('tab');
        window.history.replaceState({}, '', url.toString());
      } else if (currentUser.role !== 'admin') {
        setActiveTab('counter');
        const url = new URL(window.location.href);
        url.pathname = repoBase ? `${repoBase}/counter` : '/counter';
        url.searchParams.set('tab', 'counter');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [activeTab, currentUser]);

  // Handle browser back/forward buttons with route protection
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab')?.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const user = storeService.getCurrentUser();
      const repoBase = getRepoBase();

      if (path.includes('counter') || path.includes('staff') || tabParam === 'counter' || hash.includes('counter')) {
        if (user && (user.role === 'staff' || user.role === 'admin')) {
          setActiveTab('counter');
        } else {
          setActiveTab('order');
          const url = new URL(window.location.href);
          url.pathname = repoBase ? `${repoBase}/` : '/';
          url.searchParams.delete('tab');
          window.history.replaceState({}, '', url.toString());
        }
      } else if (path.includes('admin') || tabParam === 'admin' || hash.includes('admin')) {
        if (user && user.role === 'admin') {
          setActiveTab('admin');
        } else if (user && user.role === 'staff') {
          setActiveTab('counter');
          const url = new URL(window.location.href);
          url.pathname = repoBase ? `${repoBase}/counter` : '/counter';
          url.searchParams.set('tab', 'counter');
          window.history.replaceState({}, '', url.toString());
        } else {
          setActiveTab('order');
          const url = new URL(window.location.href);
          url.pathname = repoBase ? `${repoBase}/` : '/';
          url.searchParams.delete('tab');
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        setActiveTab('order');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update browser URL query string without reloading page
  const updateUrlParams = (newScreen: string, newRow: string, newSeat: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('screen', newScreen);
    url.searchParams.set('row', newRow);
    url.searchParams.set('seat', newSeat);
    url.searchParams.delete('col');
    window.history.replaceState({}, '', url.toString());
  };

  // Automatic Seat Capture on load:
  // 1. Read screen, row, seat from URL /order?screen=1&row=B&seat=7
  // 2. Save in sessionStorage so refresh keeps it
  // 3. Go straight to menu with NO confirm popup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlScreen = params.get('screen');
    const urlRow = params.get('row');
    const urlSeat = params.get('seat') || params.get('col');

    if (urlRow && urlSeat) {
      // Direct QR URL: /order?screen=1&row=B&seat=7
      const cleanScreen = (urlScreen || '1').trim();
      const cleanRow = urlRow.trim().toUpperCase();
      const rawSeat = urlSeat.trim();
      const cleanSeatNum = rawSeat.replace(/^[A-Za-z]+/, '') || rawSeat;

      setScreen(cleanScreen);
      setRow(cleanRow);
      setSeat(cleanSeatNum);

      // Save in session storage so refresh keeps it
      sessionStorage.setItem(
        SESSION_STORAGE_SEAT_KEY,
        JSON.stringify({ screen: cleanScreen, row: cleanRow, seat: cleanSeatNum })
      );

      updateUrlParams(cleanScreen, cleanRow, cleanSeatNum);
    } else if (urlSeat && !urlRow) {
      // Legacy format e.g. /order?screen=1&seat=B7
      const match = urlSeat.trim().match(/^([A-Za-z]+)(\d+)$/);
      const cleanScreen = (urlScreen || '1').trim();
      if (match) {
        const cleanRow = match[1].toUpperCase();
        const cleanSeatNum = match[2];

        setScreen(cleanScreen);
        setRow(cleanRow);
        setSeat(cleanSeatNum);

        sessionStorage.setItem(
          SESSION_STORAGE_SEAT_KEY,
          JSON.stringify({ screen: cleanScreen, row: cleanRow, seat: cleanSeatNum })
        );

        updateUrlParams(cleanScreen, cleanRow, cleanSeatNum);
      } else {
        setScreen(cleanScreen);
        setRow('B');
        setSeat(urlSeat.trim());
      }
    } else {
      // Check session storage on refresh
      const savedSession = sessionStorage.getItem(SESSION_STORAGE_SEAT_KEY);
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed.screen && parsed.row && parsed.seat) {
            setScreen(parsed.screen);
            setRow(parsed.row);
            setSeat(parsed.seat);
            updateUrlParams(parsed.screen, parsed.row, parsed.seat);
            return;
          }
        } catch {
          // ignore
        }
      }

      // Default fallback if no seat specified: Screen 1, Row B, Seat 7
      const defaultScreen = '1';
      const defaultRow = 'B';
      const defaultSeat = '7';
      setScreen(defaultScreen);
      setRow(defaultRow);
      setSeat(defaultSeat);
      sessionStorage.setItem(
        SESSION_STORAGE_SEAT_KEY,
        JSON.stringify({ screen: defaultScreen, row: defaultRow, seat: defaultSeat })
      );
      updateUrlParams(defaultScreen, defaultRow, defaultSeat);
    }
  }, []);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubMenu = storeService.subscribeMenu((items) => {
      setMenuItems(items);
    });

    const unsubOrders = storeService.subscribeOrders((ord) => {
      setOrders(ord);
    });

    const unsubTickets = storeService.subscribeTickets((t) => {
      setTickets(t);
    });

    const unsubAuth = storeService.subscribeAuth((user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubMenu();
      unsubOrders();
      unsubTickets();
      unsubAuth();
    };
  }, []);

  // Switch tab and sync url path with security checks
  const handleTabChange = (tab: ActiveTab) => {
    if (tab === 'counter') {
      if (!currentUser || (currentUser.role !== 'staff' && currentUser.role !== 'admin')) {
        setIsStaffLoginModalOpen(true);
        return;
      }
    } else if (tab === 'admin') {
      if (!currentUser || currentUser.role !== 'admin') {
        if (!currentUser) {
          setIsStaffLoginModalOpen(true);
        }
        return;
      }
    }

    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const repoBase = getRepoBase();
      if (tab === 'order') {
        url.pathname = repoBase ? `${repoBase}/` : '/';
        url.searchParams.delete('tab');
      } else {
        url.pathname = repoBase ? `${repoBase}/${tab}` : `/${tab}`;
        url.searchParams.set('tab', tab);
      }
      window.history.pushState({}, '', url.toString());
    }
  };

  // After successful staff login: redirect automatically based on role
  const handleStaffLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsStaffLoginModalOpen(false);
    const repoBase = getRepoBase();

    if (user.role === 'admin') {
      setActiveTab('admin');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.pathname = repoBase ? `${repoBase}/admin` : '/admin';
        url.searchParams.set('tab', 'admin');
        window.history.pushState({}, '', url.toString());
      }
    } else {
      setActiveTab('counter');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.pathname = repoBase ? `${repoBase}/counter` : '/counter';
        url.searchParams.set('tab', 'counter');
        window.history.pushState({}, '', url.toString());
      }
    }
  };

  const handleOpenReportIssue = (orderId?: string, initialType?: IssueType) => {
    setReportIssueOrderId(orderId);
    setReportIssueInitialType(initialType);
    setIsReportIssueModalOpen(true);
  };

  const activeOrdersCount = orders.filter((o) => o.status !== 'delivered').length;
  const openTicketsCount = tickets.filter((t) => t.status === 'open').length;

  return (
    <CartProvider>
      {showSplash && <CineverseSplash onComplete={() => setShowSplash(false)} />}
      <div className="min-h-screen bg-[#0B0B0F] text-zinc-100 flex flex-col font-sans selection:bg-[#D4AF37] selection:text-black">
        {/* Top Navigation */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          currentUser={currentUser}
          onOpenStaffLogin={() => setIsStaffLoginModalOpen(true)}
          onOpenReportIssue={() => handleOpenReportIssue()}
          onOpenQRTest={() => setIsQRTestModalOpen(true)}
          activeOrderCount={activeOrdersCount}
          openTicketsCount={openTicketsCount}
        />

        {/* Main View Router */}
        <main className="flex-1">
          {/* 1. CUSTOMER APP (/order) */}
          {activeTab === 'order' && (
            <CustomerOrderView
              screen={screen}
              row={row}
              seat={seat}
              menuItems={menuItems}
              orders={orders}
              onOpenReportIssue={handleOpenReportIssue}
              onOpenQRTest={() => setIsQRTestModalOpen(true)}
            />
          )}

          {/* 2. COUNTER DISPLAY (/counter, staff login required) */}
          {activeTab === 'counter' && currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin') && (
            <StaffDashboard
              orders={orders}
              currentUser={currentUser}
              menuItems={menuItems}
            />
          )}

          {/* 3. ADMIN PANEL (/admin, admin login required) */}
          {activeTab === 'admin' && currentUser && currentUser.role === 'admin' && (
            <AdminPanel
              menuItems={menuItems}
              currentUser={currentUser}
              onSelectCustomerSeat={(sc, r, s) => {
                setScreen(sc);
                setRow(r);
                setSeat(s);
                sessionStorage.setItem(
                  SESSION_STORAGE_SEAT_KEY,
                  JSON.stringify({ screen: sc, row: r, seat: s })
                );
                updateUrlParams(sc, r, s);
                handleTabChange('order');
              }}
            />
          )}
        </main>

        {/* Staff Login Modal */}
        <StaffLoginModal
          isOpen={isStaffLoginModalOpen}
          onClose={() => setIsStaffLoginModalOpen(false)}
          onLoginSuccess={handleStaffLoginSuccess}
        />

        {/* Customer Issue Ticket Modal */}
        <ReportIssueModal
          isOpen={isReportIssueModalOpen}
          onClose={() => setIsReportIssueModalOpen(false)}
          screen={screen}
          row={row}
          seat={seat}
          defaultOrderId={reportIssueOrderId}
          initialIssueType={reportIssueInitialType}
        />

        {/* QR Code Scanner & Seat Tracking Tester Modal */}
        <QRTestModal
          isOpen={isQRTestModalOpen}
          onClose={() => setIsQRTestModalOpen(false)}
          currentScreen={screen}
          currentRow={row}
          currentSeat={seat}
          menuItems={menuItems}
          onSelectSeat={(sc, r, s) => {
            setScreen(sc);
            setRow(r);
            setSeat(s);
            sessionStorage.setItem(
              SESSION_STORAGE_SEAT_KEY,
              JSON.stringify({ screen: sc, row: r, seat: s })
            );
            updateUrlParams(sc, r, s);
            handleTabChange('order');
          }}
        />
      </div>
    </CartProvider>
  );
}
