import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  QrCode,
  Download,
  Printer,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Copy,
  Layers,
  Film,
  Save,
  Grid3X3,
  Loader2,
  Users,
  BarChart3,
  DollarSign,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Search,
  Eye,
  Utensils,
  Shield,
  Smartphone,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Banknote,
  PackageCheck,
  Ban,
  RefreshCw,
  Filter,
  ArrowUpRight,
} from 'lucide-react';
import {
  MenuItem,
  Category,
  UserProfile,
  ScreenGridConfig,
  StaffAccount,
  Ticket,
  Order,
} from '../types';
import { storeService, getRowLetter } from '../services/store';
import { CineverseLogo } from './CineverseLogo';
import { TicketsManagementView } from './TicketsManagementView';
import {
  startOfDay,
  endOfDay,
  formatTime,
  formatDay,
  getHour,
  isToday,
  isYesterday,
  addDays,
  getISODateString,
  CINEMA_TIMEZONE,
} from '../lib/dates';

interface AdminPanelProps {
  menuItems: MenuItem[];
  currentUser: UserProfile | null;
  onSelectCustomerSeat: (screen: string, row: string, seat: string) => void;
  isDemoMode?: boolean;
}

interface SeatQRItem {
  screen: string;
  row: string;
  seat: number;
  seatLabel: string;
  url: string;
  dataUrl: string;
}

interface RowQRGroup {
  row: string;
  seats: SeatQRItem[];
}

const CATEGORIES: Category[] = ['Popcorn', 'Drinks', 'Snacks', 'Combos', 'Desserts'];

type AdminTab = 'menu' | 'screens' | 'qr' | 'staff' | 'analytics' | 'tickets';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  menuItems,
  currentUser,
  onSelectCustomerSeat,
  isDemoMode,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('screens');

  // Tickets state & real-time subscription
  const [tickets, setTickets] = useState<Ticket[]>(() => storeService.getTickets());

  useEffect(() => {
    const unsub = storeService.subscribeTickets((t) => setTickets(t));
    return () => unsub();
  }, []);

  const openTicketsCount = tickets.filter((t) => t.status === 'open').length;

  // Menu item modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Popcorn' as Category,
    price: 250,
    imageUrl: '',
    isVeg: true,
    available: true,
    description: '',
  });

  // Admin Verification state - strictly require admin role
  const isAdmin = currentUser?.role === 'admin';

  // Screens Config state
  const [screensMap, setScreensMap] = useState<Record<string, ScreenGridConfig>>(() =>
    storeService.getAllScreens()
  );
  const [selectedScreenId, setSelectedScreenId] = useState<string>('1');

  // Screen Editor state
  const [screenName, setScreenName] = useState('Audi 1 (IMAX)');
  const [rowsCount, setRowsCount] = useState(14);
  const [seatsPerRow, setSeatsPerRow] = useState(21);
  const [aisleGapsInput, setAisleGapsInput] = useState('7, 14');
  const [rowOverridesText, setRowOverridesText] = useState('A: 19, N: 17');
  const [disabledSeats, setDisabledSeats] = useState<string[]>(['A1', 'A19', 'N1']);
  const [isSavingScreen, setIsSavingScreen] = useState(false);
  const [screenSaveSuccess, setScreenSaveSuccess] = useState('');

  // QR Generator Inputs
  const [websiteAddress, setWebsiteAddress] = useState(() => {
    if (typeof window !== 'undefined') {
      const segments = window.location.pathname.split('/').filter(Boolean);
      const repoBase =
        segments.length > 0 && !['order', 'counter', 'staff', 'admin'].includes(segments[0].toLowerCase())
          ? '/' + segments[0]
          : '';
      return `${window.location.origin}${repoBase}`;
    }
    return 'https://vinayyeranedi-beep.github.io/cineverse';
  });
  const [qrRowSearch, setQrRowSearch] = useState('');
  const [rowQRGroups, setRowQRGroups] = useState<RowQRGroup[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [previewQRItem, setPreviewQRItem] = useState<SeatQRItem | null>(null);

  // Staff state
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'staff' | 'admin'>('staff');
  const [staffError, setStaffError] = useState('');

  const [adminToast, setAdminToast] = useState<string | null>(null);

  // Analytics Date & Range state in Asia/Kolkata (IST)
  type AnalyticsPeriod = 'today' | 'yesterday' | '7days' | '30days' | 'custom';
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('today');
  const [analyticsStartDate, setAnalyticsStartDate] = useState<string>(() => getISODateString(new Date()));
  const [analyticsEndDate, setAnalyticsEndDate] = useState<string>(() => getISODateString(new Date()));
  const [analyticsOrders, setAnalyticsOrders] = useState<Order[]>([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState('');
  const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState<
    'all' | 'delivered' | 'preparing' | 'received' | 'ready' | 'cancelled' | 'unpaid'
  >('all');
  const [analyticsRefreshTrigger, setAnalyticsRefreshTrigger] = useState(0);

  // Update dates when preset period changes
  const handleSelectPeriod = (period: AnalyticsPeriod) => {
    setAnalyticsPeriod(period);
    const todayStr = getISODateString(new Date());
    if (period === 'today') {
      setAnalyticsStartDate(todayStr);
      setAnalyticsEndDate(todayStr);
    } else if (period === 'yesterday') {
      const yestStr = getISODateString(addDays(new Date(), -1));
      setAnalyticsStartDate(yestStr);
      setAnalyticsEndDate(yestStr);
    } else if (period === '7days') {
      const past7Str = getISODateString(addDays(new Date(), -6));
      setAnalyticsStartDate(past7Str);
      setAnalyticsEndDate(todayStr);
    } else if (period === '30days') {
      const past30Str = getISODateString(addDays(new Date(), -29));
      setAnalyticsStartDate(past30Str);
      setAnalyticsEndDate(todayStr);
    }
  };

  // Stepper to move 1 day back or forward when single day is selected
  const handleStepDay = (days: number) => {
    const current = new Date(`${analyticsStartDate}T12:00:00+05:30`);
    const next = addDays(current, days);
    const nextStr = getISODateString(next);
    setAnalyticsStartDate(nextStr);
    setAnalyticsEndDate(nextStr);
    setAnalyticsPeriod(isToday(next) ? 'today' : isYesterday(next) ? 'yesterday' : 'custom');
  };

  // Fetch orders from Firestore / local for the selected IST date range
  useEffect(() => {
    if (activeTab !== 'analytics') return;

    let isMounted = true;
    setIsAnalyticsLoading(true);

    const startMs = startOfDay(`${analyticsStartDate}T00:00:00+05:30`);
    const endMs = endOfDay(`${analyticsEndDate}T23:59:59+05:30`);

    storeService
      .fetchOrdersForRange(startMs, endMs)
      .then((ords) => {
        if (isMounted) {
          setAnalyticsOrders(ords);
          setIsAnalyticsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error fetching orders for analytics:', err);
        if (isMounted) setIsAnalyticsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, analyticsStartDate, analyticsEndDate, analyticsRefreshTrigger]);

  // Memoized Order Analytics Calculations in Asia/Kolkata
  const analyticsData = useMemo(() => {
    const isUnpaid = (o: Order) => {
      const s = (o.status || '').toLowerCase();
      const ps = (o.paymentStatus || '').toLowerCase();
      return (
        s === 'awaiting_payment' ||
        s === 'awaiting payment' ||
        ps === 'unpaid' ||
        ps === 'awaiting_payment'
      );
    };

    const isCancelled = (o: Order) => (o.status || '').toLowerCase() === 'cancelled';

    const allCount = analyticsOrders.length;
    const unpaidOrders = analyticsOrders.filter(isUnpaid);
    const cancelledOrders = analyticsOrders.filter(isCancelled);
    const validOrders = analyticsOrders.filter((o) => !isUnpaid(o) && !isCancelled(o));

    const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
    const cancelledRevenue = cancelledOrders.reduce((sum, o) => sum + o.total, 0);
    const aov = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

    // Status counts
    const receivedCount = validOrders.filter((o) => o.status === 'received').length;
    const preparingCount = validOrders.filter((o) => o.status === 'preparing').length;
    const readyCount = validOrders.filter(
      (o) => o.status === 'ready' || o.status === 'on_the_way'
    ).length;
    const deliveredCount = validOrders.filter((o) => o.status === 'delivered').length;

    // Top selling items
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    validOrders.forEach((o) => {
      o.items.forEach((it) => {
        if (!itemMap[it.name]) {
          itemMap[it.name] = { name: it.name, qty: 0, revenue: 0 };
        }
        itemMap[it.name].qty += it.qty;
        itemMap[it.name].revenue += it.price * it.qty;
      });
    });
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);

    // Hourly distribution in Asia/Kolkata (00:00 to 23:00 IST)
    const hourlyBars: { hour: number; label: string; count: number; revenue: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const dispHour = h % 12 === 0 ? 12 : h % 12;
      hourlyBars.push({
        hour: h,
        label: `${String(dispHour).padStart(2, '0')}:00 ${ampm}`,
        count: 0,
        revenue: 0,
      });
    }

    validOrders.forEach((o) => {
      const h = getHour(o.createdAt);
      if (hourlyBars[h]) {
        hourlyBars[h].count += 1;
        hourlyBars[h].revenue += o.total;
      }
    });

    const maxHourlyCount = Math.max(1, ...hourlyBars.map((b) => b.count));

    // Screen sales
    const screenMap: Record<string, { screen: string; count: number; revenue: number }> = {};
    validOrders.forEach((o) => {
      const scr = `Screen ${o.screen || '1'}`;
      if (!screenMap[scr]) {
        screenMap[scr] = { screen: scr, count: 0, revenue: 0 };
      }
      screenMap[scr].count += 1;
      screenMap[scr].revenue += o.total;
    });
    const screenStats = Object.values(screenMap).sort((a, b) => b.revenue - a.revenue);

    // Payment methods
    let onlineCount = 0;
    let onlineRevenue = 0;
    let cashCount = 0;
    let cashRevenue = 0;

    validOrders.forEach((o) => {
      const m = (o.paymentMethod || '').toLowerCase();
      if (m.includes('online') || m.includes('upi') || m.includes('card')) {
        onlineCount += 1;
        onlineRevenue += o.total;
      } else {
        cashCount += 1;
        cashRevenue += o.total;
      }
    });

    return {
      allCount,
      validOrdersCount: validOrders.length,
      unpaidCount: unpaidOrders.length,
      cancelledCount: cancelledOrders.length,
      totalRevenue,
      cancelledRevenue,
      aov,
      receivedCount,
      preparingCount,
      readyCount,
      deliveredCount,
      topItems,
      hourlyBars,
      maxHourlyCount,
      screenStats,
      payment: {
        online: { count: onlineCount, revenue: onlineRevenue },
        cash: { count: cashCount, revenue: cashRevenue },
      },
      unpaidOrders,
      validOrders,
    };
  }, [analyticsOrders]);

  // Filtered orders for the audit log / explorer
  const filteredAnalyticsOrders = useMemo(() => {
    return analyticsOrders.filter((order) => {
      const s = (order.status || '').toLowerCase();
      const ps = (order.paymentStatus || '').toLowerCase();
      const isUnpaid =
        s === 'awaiting_payment' ||
        s === 'awaiting payment' ||
        ps === 'unpaid' ||
        ps === 'awaiting_payment';

      let matchesStatus = true;
      if (analyticsStatusFilter === 'delivered') {
        matchesStatus = order.status === 'delivered';
      } else if (analyticsStatusFilter === 'preparing') {
        matchesStatus = order.status === 'preparing';
      } else if (analyticsStatusFilter === 'received') {
        matchesStatus = order.status === 'received';
      } else if (analyticsStatusFilter === 'ready') {
        matchesStatus = order.status === 'ready' || order.status === 'on_the_way';
      } else if (analyticsStatusFilter === 'cancelled') {
        matchesStatus = order.status === 'cancelled';
      } else if (analyticsStatusFilter === 'unpaid') {
        matchesStatus = isUnpaid;
      }

      const q = analyticsSearchQuery.trim().toLowerCase();
      const targetStr = `${order.row}${order.seat} ${order.seat} ${order.row} Screen ${order.screen} ${order.orderId || ''}`.toLowerCase();
      const matchesSearch = !q || targetStr.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [analyticsOrders, analyticsStatusFilter, analyticsSearchQuery]);

  // CSV Export for the Selected Range
  const handleDownloadAnalyticsCSV = () => {
    if (analyticsOrders.length === 0) {
      alert('No orders in the selected period to export.');
      return;
    }

    const headers = [
      'Time (IST)',
      'Screen',
      'Seat',
      'Items',
      'Quantity',
      'Total (INR)',
      'Payment Method',
      'Payment Status',
      'Status',
    ];

    const rows = analyticsOrders.map((o) => {
      const timeStr = formatTime(o.createdAt);
      const screenStr = `Screen ${o.screen}`;
      const seatStr = `${o.row}${o.seat}`;
      const itemsStr = o.items.map((it) => `${it.name} (x${it.qty})`).join('; ');
      const totalQty = o.items.reduce((sum, it) => sum + it.qty, 0);
      const totalStr = o.total;
      const methodStr = (o.paymentMethod || 'Pay at seat').replace('_', ' ');
      const payStatusStr = o.paymentStatus || 'paid';
      const statusStr = o.status === 'on_the_way' ? 'Ready / Out for delivery' : o.status;

      return [
        `"${timeStr}"`,
        `"${screenStr}"`,
        `"${seatStr}"`,
        `"${itemsStr.replace(/"/g, '""')}"`,
        totalQty,
        totalStr,
        `"${methodStr}"`,
        `"${payStatusStr}"`,
        `"${statusStr}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `cineverse-analytics-${analyticsStartDate}-to-${analyticsEndDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Subscribe to screens & staff
  useEffect(() => {
    const unsubScreens = storeService.subscribeScreens((sc) => {
      setScreensMap(sc);
    });
    const unsubStaff = storeService.subscribeStaff((st) => {
      setStaffList(st);
    });
    return () => {
      unsubScreens();
      unsubStaff();
    };
  }, []);

  // Update editor when selectedScreenId changes
  useEffect(() => {
    const config = screensMap[selectedScreenId];
    if (config) {
      setScreenName(config.name);
      setRowsCount(config.rowsCount);
      setSeatsPerRow(config.seatsPerRow);
      setAisleGapsInput(config.aisleGaps ? config.aisleGaps.join(', ') : '');
      const overridesStr = Object.entries(config.rowOverrides || {})
        .map(([r, s]) => `${r}: ${s}`)
        .join(', ');
      setRowOverridesText(overridesStr);
      setDisabledSeats(config.disabledSeats || []);
    } else {
      setScreenName(`Screen ${selectedScreenId}`);
      setRowsCount(12);
      setSeatsPerRow(18);
      setAisleGapsInput('6, 12');
      setRowOverridesText('');
      setDisabledSeats([]);
    }
    setScreenSaveSuccess('');
  }, [selectedScreenId, screensMap]);

  // Parse row overrides from string "A: 19, N: 17"
  const parsedRowOverrides = useMemo(() => {
    const map: Record<string, number> = {};
    if (!rowOverridesText.trim()) return map;
    const parts = rowOverridesText.split(',');
    for (const part of parts) {
      const [r, s] = part.split(':').map((x) => x.trim().toUpperCase());
      const num = parseInt(s, 10);
      if (r && !isNaN(num) && num > 0) {
        map[r] = num;
      }
    }
    return map;
  }, [rowOverridesText]);

  // Parse aisle gaps from string "7, 14"
  const parsedAisleGaps = useMemo(() => {
    if (!aisleGapsInput.trim()) return [];
    return aisleGapsInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
  }, [aisleGapsInput]);

  // Compute total seats in the configured screen
  const screenStats = useMemo(() => {
    let totalGridSeats = 0;
    let validSeatsCount = 0;
    for (let r = 0; r < rowsCount; r++) {
      const rowLetter = getRowLetter(r);
      const rowSeatCount = parsedRowOverrides[rowLetter] || seatsPerRow;
      totalGridSeats += rowSeatCount;
      for (let s = 1; s <= rowSeatCount; s++) {
        const seatId = `${rowLetter}${s}`;
        if (!disabledSeats.includes(seatId)) {
          validSeatsCount++;
        }
      }
    }
    return {
      totalGridSeats,
      validSeatsCount,
      disabledCount: disabledSeats.length,
    };
  }, [rowsCount, seatsPerRow, parsedRowOverrides, disabledSeats]);

  // Toggle seat disabled status on grid
  const toggleSeatDisabled = (seatId: string) => {
    setDisabledSeats((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    );
  };

  // Save screen config
  const handleSaveScreenSetup = async () => {
    setIsSavingScreen(true);
    setScreenSaveSuccess('');
    try {
      const newConfig: ScreenGridConfig = {
        id: `screen-${selectedScreenId}`,
        name: screenName.trim() || `Screen ${selectedScreenId}`,
        screenNumber: selectedScreenId,
        rowsCount,
        seatsPerRow,
        rowOverrides: parsedRowOverrides,
        aisleGaps: parsedAisleGaps,
        disabledSeats,
        updatedAt: Date.now(),
      };
      await storeService.saveScreenConfig(newConfig);
      setScreenSaveSuccess(`Screen ${selectedScreenId} setup saved successfully!`);
      setTimeout(() => setScreenSaveSuccess(''), 4000);
    } catch (e) {
      console.error(e);
      alert('Could not save screen setup.');
    } finally {
      setIsSavingScreen(false);
    }
  };

  // Generate QR codes for all valid seats of current screen
  const handleGenerateQRs = async () => {
    setIsGenerating(true);
    try {
      const cleanBase = websiteAddress.trim().replace(/\/$/, '');
      const groups: RowQRGroup[] = [];

      for (let r = 0; r < rowsCount; r++) {
        const rowLetter = getRowLetter(r);
        const rowSeatsCount = parsedRowOverrides[rowLetter] || seatsPerRow;
        const rowSeats: SeatQRItem[] = [];

        for (let s = 1; s <= rowSeatsCount; s++) {
          const seatLabel = `${rowLetter}${s}`;
          // Exclude disabled/non-existent seats
          if (disabledSeats.includes(seatLabel)) continue;

          // Format QR: ?screen=1&row=B&seat=7 (loads directly with no 404 redirect)
          const url = `${cleanBase}/?screen=${selectedScreenId}&row=${rowLetter}&seat=${s}`;
          const dataUrl = await QRCode.toDataURL(url, {
            width: 220,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
          });

          rowSeats.push({
            screen: selectedScreenId,
            row: rowLetter,
            seat: s,
            seatLabel,
            url,
            dataUrl,
          });
        }

        if (rowSeats.length > 0) {
          groups.push({
            row: rowLetter,
            seats: rowSeats,
          });
        }
      }

      setRowQRGroups(groups);
    } catch (err) {
      console.error('QR generation error:', err);
      alert('Error generating QR codes.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download single QR as PNG
  const handleDownloadSingleQR = (item: SeatQRItem) => {
    const link = document.createElement('a');
    link.href = item.dataUrl;
    link.download = `screen${item.screen}-${item.seatLabel}.png`;
    link.click();
  };

  // Batch download ZIP of all generated QRs
  const handleDownloadZip = async () => {
    if (rowQRGroups.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`Screen_${selectedScreenId}_Seat_QRs`);

      for (const grp of rowQRGroups) {
        const rowFolder = folder?.folder(`Row_${grp.row}`);
        for (const item of grp.seats) {
          const base64Data = item.dataUrl.split(',')[1];
          rowFolder?.file(`screen${item.screen}-${item.seatLabel}.png`, base64Data, {
            base64: true,
          });
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Screen_${selectedScreenId}_QRs.zip`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      alert('Error creating ZIP archive.');
    } finally {
      setIsZipping(false);
    }
  };

  // Trigger Print View
  const handlePrint = () => {
    window.print();
  };

  // Menu Handlers
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Popcorn',
      price: 250,
      imageUrl:
        'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=600&q=80',
      isVeg: true,
      available: true,
      description: '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price,
      imageUrl: item.imageUrl,
      isVeg: item.isVeg,
      available: item.available,
      description: item.description,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.price <= 0) {
      alert('Please fill out item name and a valid price.');
      return;
    }
    if (editingItem) {
      await storeService.updateMenuItem(editingItem.id, formData);
    } else {
      await storeService.addMenuItem(formData);
    }
    setIsEditModalOpen(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Are you sure you want to remove this menu item?')) {
      await storeService.deleteMenuItem(id);
    }
  };

  const handleToggleStock = async (id: string) => {
    await storeService.toggleAvailability(id);
  };

  // Staff Handlers
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      setStaffError('Please enter both name and email.');
      return;
    }
    setStaffError('');
    await storeService.addStaffAccount(newStaffName, newStaffEmail, newStaffRole);
    setNewStaffName('');
    setNewStaffEmail('');
  };

  const handleDeleteStaff = async (id: string) => {
    if (confirm('Remove this staff account?')) {
      await storeService.deleteStaffAccount(id);
    }
  };



  if (!isAdmin) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-zinc-950 text-white">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#15151C] border border-zinc-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#E50914]/10 text-[#E50914] flex items-center justify-center mx-auto border border-[#E50914]/20">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-black text-white">Admin Access Required</h2>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Please sign in with cinema administrator credentials to access screen setup, menu catalog, and QR management.
          </p>
          <button
            onClick={() => storeService.login('admin@cineverse.com', 'admin123')}
            className="w-full py-3.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] font-bold text-sm text-white shadow-lg shadow-[#E50914]/25 transition-all"
          >
            Sign in as Cinema Admin (admin@cineverse.com)
          </button>
        </div>
      </div>
    );
  }

  // Filter QR rows
  const filteredQRGroups = qrRowSearch.trim()
    ? rowQRGroups.filter((g) => g.row.toUpperCase() === qrRowSearch.trim().toUpperCase())
    : rowQRGroups;

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-4 sm:p-6 pb-24">
      {/* PRINT-ONLY STYLESHEET */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-qr-section, #print-qr-section * {
            visibility: visible;
          }
          #print-qr-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-card {
            page-break-inside: avoid;
            break-inside: avoid;
            border: 1.5px dashed #444 !important;
            background: #fff !important;
            color: #000 !important;
            margin-bottom: 8px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Navigation Tabs */}
        <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CineverseLogo size="sm" showSubtitle={true} subtitle="ADMINISTRATION" />

            </div>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Manage cinema screens, auditorium seat grids, menu inventory, QR stickers, and staff access.
            </p>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap items-center bg-[#0B0B0F] p-1.5 rounded-2xl border border-zinc-800 gap-1">
            <button
              onClick={() => setActiveTab('screens')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                activeTab === 'screens'
                  ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span>Screen Setup</span>
            </button>

            <button
              onClick={() => setActiveTab('qr')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                activeTab === 'qr'
                  ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-zinc-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Seat QRs</span>
            </button>

            <button
              onClick={() => setActiveTab('menu')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                activeTab === 'menu'
                  ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Menu Items ({menuItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                activeTab === 'staff'
                  ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Logins</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                activeTab === 'analytics'
                  ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-zinc-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] relative ${
                activeTab === 'tickets'
                  ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-zinc-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Tickets</span>
              {openTicketsCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#E50914] text-white border border-[#0B0B0F] animate-pulse">
                  {openTicketsCount}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-zinc-800 text-zinc-400">
                  {tickets.length}
                </span>
              )}
            </button>
          </div>
        </div>



        {/* Live Admin Feedback Banner */}
        {adminToast && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-zinc-900 via-[#15151C] to-zinc-900 border border-[#D4AF37]/40 text-white text-xs flex items-center justify-between shadow-xl animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="font-semibold text-zinc-100">{adminToast}</span>
            </div>
            <button
              onClick={() => setAdminToast(null)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: SCREEN SETUP (m x n grid, row overrides, aisle gaps, disabled seats) */}
        {/* ============================================================ */}
        {activeTab === 'screens' && (
          <div className="space-y-6">
            {/* Screen Selector & Overview */}
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center font-display font-black text-xl">
                    {selectedScreenId}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Cinema Screen Configuration</h2>
                    <p className="text-xs text-[#A1A1AA]">
                      Configure auditorium dimensions, aisle breaks, and mark inactive seats.
                    </p>
                  </div>
                </div>

                {/* Screen Selector Buttons */}
                <div className="flex items-center gap-2">
                  {['1', '2', '3'].map((scId) => (
                    <button
                      key={scId}
                      onClick={() => setSelectedScreenId(scId)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                        selectedScreenId === scId
                          ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                          : 'bg-[#0B0B0F] border border-zinc-800 text-[#A1A1AA] hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      Screen {scId}
                    </button>
                  ))}
                </div>
              </div>

              {screenSaveSuccess && (
                <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{screenSaveSuccess}</span>
                </div>
              )}

              {/* Grid Inputs Form */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                    Screen Name / Title
                  </label>
                  <input
                    type="text"
                    value={screenName}
                    onChange={(e) => setScreenName(e.target.value)}
                    placeholder="e.g. Audi 1 (IMAX)"
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                    Number of Rows (m)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={26}
                      value={rowsCount}
                      onChange={(e) => setRowsCount(Math.max(1, Math.min(26, parseInt(e.target.value) || 1)))}
                      className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                    <span className="text-[11px] font-mono text-[#D4AF37] whitespace-nowrap">
                      A to {getRowLetter(rowsCount - 1)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                    Seats Per Row (n)
                  </label>
                  <input
                    type="number"
                    min={4}
                    max={40}
                    value={seatsPerRow}
                    onChange={(e) => setSeatsPerRow(Math.max(4, Math.min(40, parseInt(e.target.value) || 4)))}
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                    Aisle Gaps (After Col #)
                  </label>
                  <input
                    type="text"
                    value={aisleGapsInput}
                    onChange={(e) => setAisleGapsInput(e.target.value)}
                    placeholder="e.g. 7, 14"
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                  Row Overrides (Custom seat counts for specific rows)
                </label>
                <input
                  type="text"
                  value={rowOverridesText}
                  onChange={(e) => setRowOverridesText(e.target.value)}
                  placeholder="e.g. A: 19, N: 17"
                  className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
                <p className="text-[11px] text-[#A1A1AA] mt-1">
                  Format: <code className="text-[#D4AF37]">ROW: SEATS</code> separated by commas. Useful for front rows or back recliners.
                </p>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-zinc-800">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#0B0B0F] border border-zinc-800 text-xs">
                    <span className="text-[#A1A1AA]">Real Valid Seats: </span>
                    <span className="font-bold text-[#D4AF37] font-mono text-sm ml-1">
                      {screenStats.validSeatsCount}
                    </span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#0B0B0F] border border-zinc-800 text-xs">
                    <span className="text-[#A1A1AA]">Disabled / Gaps: </span>
                    <span className="font-bold text-rose-400 font-mono text-sm ml-1">
                      {screenStats.disabledCount}
                    </span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#0B0B0F] border border-zinc-800 text-xs">
                    <span className="text-[#A1A1AA]">Total Layout Rows: </span>
                    <span className="font-bold text-white font-mono text-sm ml-1">
                      {rowsCount} (A - {getRowLetter(rowsCount - 1)})
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSaveScreenSetup}
                  disabled={isSavingScreen}
                  className="px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] font-bold text-xs text-white shadow-lg shadow-[#E50914]/25 transition-all flex items-center gap-2 min-h-[44px]"
                >
                  {isSavingScreen ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Screen Setup</span>
                </button>
              </div>
            </div>

            {/* Interactive Visual Seat Grid */}
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-[#D4AF37]" />
                    Interactive Seat Grid (Click any seat to disable / enable)
                  </h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Disabled seats will not produce QR codes and cannot be ordered from.
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-zinc-800 border border-zinc-700" />
                    <span className="text-[#A1A1AA]">Active Seat</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded bg-rose-950/60 border border-rose-500/50 flex items-center justify-center text-rose-400 text-[9px] font-bold">
                      ✕
                    </span>
                    <span className="text-rose-400">Disabled / Non-existent</span>
                  </div>
                </div>
              </div>

              {/* Cinema Screen Curve Visualizer */}
              <div className="py-4 text-center">
                <div className="max-w-xl mx-auto h-2 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent rounded-full shadow-[0_0_15px_rgba(212,175,55,0.4)] mb-2" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-[#D4AF37] font-bold">
                  CINEMA SCREEN
                </span>
              </div>

              {/* Grid Scroll container */}
              <div className="overflow-x-auto pb-4 pt-2">
                <div className="min-w-max flex flex-col items-center gap-1.5 px-4">
                  {Array.from({ length: rowsCount }).map((_, rIdx) => {
                    const rowLetter = getRowLetter(rIdx);
                    const rowSeatCount = parsedRowOverrides[rowLetter] || seatsPerRow;

                    return (
                      <div key={rowLetter} className="flex items-center gap-2">
                        {/* Row Header */}
                        <span className="w-6 text-center font-mono font-bold text-xs text-[#D4AF37]">
                          {rowLetter}
                        </span>

                        {/* Seats in Row */}
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: rowSeatCount }).map((_, sIdx) => {
                            const seatNumber = sIdx + 1;
                            const seatId = `${rowLetter}${seatNumber}`;
                            const isDisabled = disabledSeats.includes(seatId);
                            const hasAisleGap = parsedAisleGaps.includes(seatNumber);

                            return (
                              <React.Fragment key={seatNumber}>
                                <button
                                  type="button"
                                  onClick={() => toggleSeatDisabled(seatId)}
                                  title={`${seatId}: Click to toggle disabled`}
                                  className={`w-7 h-7 rounded-md text-[10px] font-mono font-bold transition-all flex items-center justify-center border ${
                                    isDisabled
                                      ? 'bg-rose-950/50 border-rose-500/50 text-rose-400 hover:bg-rose-900/60'
                                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-[#D4AF37] hover:text-[#D4AF37]'
                                  }`}
                                >
                                  {isDisabled ? '✕' : seatNumber}
                                </button>

                                {/* Aisle gap passage */}
                                {hasAisleGap && <div className="w-5" />}
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* Row Footer */}
                        <span className="w-6 text-center font-mono font-bold text-xs text-[#D4AF37]">
                          {rowLetter}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: SEAT QR GENERATOR */}
        {/* ============================================================ */}
        {activeTab === 'qr' && (
          <div className="space-y-6">
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#D4AF37]" />
                    Seat QR Sticker Generator
                  </h2>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Generate unique ordering QR codes for all valid seats of Screen {selectedScreenId}.
                  </p>
                </div>

                {/* Actions: Generate, ZIP, Print */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleGenerateQRs}
                    disabled={isGenerating}
                    className="px-4 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] font-bold text-xs text-white shadow-lg shadow-[#E50914]/25 transition-all flex items-center gap-2 min-h-[44px]"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Generate Screen {selectedScreenId} QRs</span>
                  </button>

                  {rowQRGroups.length > 0 && (
                    <>
                      <button
                        onClick={handleDownloadZip}
                        disabled={isZipping}
                        className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-bold text-xs text-zinc-100 transition-all flex items-center gap-2 min-h-[44px]"
                      >
                        {isZipping ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 text-[#D4AF37]" />
                        )}
                        <span>Download ZIP ({screenStats.validSeatsCount} QRs)</span>
                      </button>

                      <button
                        onClick={handlePrint}
                        className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-bold text-xs text-zinc-100 transition-all flex items-center gap-2 min-h-[44px]"
                      >
                        <Printer className="w-4 h-4 text-emerald-400" />
                        <span>Print Sticker Sheets</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Website URL Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                    Website Address (Embedded in QR codes)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={websiteAddress}
                      onChange={(e) => setWebsiteAddress(e.target.value)}
                      placeholder="https://your-cinema.com"
                      className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(websiteAddress);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      title="Copy URL"
                      className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                    >
                      {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA] mt-1">
                    Format: <code className="text-[#D4AF37]">/order?screen={selectedScreenId}&row=B&seat=7</code>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                    Filter by Row Letter
                  </label>
                  <input
                    type="text"
                    value={qrRowSearch}
                    onChange={(e) => setQrRowSearch(e.target.value.toUpperCase())}
                    placeholder="e.g. B (leave empty for all rows)"
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>

            {/* QR Codes Grid by Row */}
            <div id="print-qr-section" className="space-y-6">
              {filteredQRGroups.length === 0 ? (
                <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-12 text-center">
                  <QrCode className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white">No QR codes generated yet</h3>
                  <p className="text-xs text-[#A1A1AA] mt-1 max-w-sm mx-auto">
                    Click "Generate Screen {selectedScreenId} QRs" above to create printable QR stickers for all {screenStats.validSeatsCount} valid seats.
                  </p>
                </div>
              ) : (
                filteredQRGroups.map((group) => (
                  <div key={group.row} className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] font-mono font-bold flex items-center justify-center text-xs">
                          {group.row}
                        </span>
                        <h4 className="text-sm font-bold text-white">
                          Screen {selectedScreenId} • Row {group.row} ({group.seats.length} Seats)
                        </h4>
                      </div>
                      <span className="text-xs text-[#A1A1AA] font-mono">
                        Seats 1 to {group.seats[group.seats.length - 1]?.seat}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {group.seats.map((item) => (
                        <div
                          key={item.seatLabel}
                          className="print-card bg-[#0B0B0F] border border-zinc-800 hover:border-[#D4AF37] p-2.5 rounded-2xl flex flex-col items-center transition-all hover:scale-[1.02] group"
                        >
                          {/* QR Image */}
                          <div
                            onClick={() => setPreviewQRItem(item)}
                            title="Click to zoom & test with mobile camera"
                            className="bg-white p-1 rounded-xl shadow-inner mb-2 w-full aspect-square flex items-center justify-center cursor-pointer relative group-hover:ring-2 group-hover:ring-[#D4AF37]/50"
                          >
                            <img
                              src={item.dataUrl}
                              alt={item.seatLabel}
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-opacity text-white text-[10px] font-bold gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>Zoom</span>
                            </div>
                          </div>

                          {/* Seat Label */}
                          <div className="text-center w-full mb-2">
                            <span className="font-display font-black text-xs text-white group-hover:text-[#D4AF37] block">
                              Screen {item.screen} • {item.seatLabel}
                            </span>
                            <span className="text-[9px] text-[#A1A1AA] block truncate font-mono">
                              Cineverse Multiplex QR
                            </span>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1 w-full pt-1 border-t border-zinc-800/80">
                            <button
                              onClick={() => onSelectCustomerSeat(String(item.screen), item.row, String(item.seat))}
                              title="Test Scan & open customer ordering for this seat"
                              className="flex-1 py-1 px-1.5 rounded-lg bg-zinc-800 hover:bg-[#D4AF37] hover:text-black text-zinc-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                            >
                              <Smartphone className="w-3 h-3" />
                              <span>Test</span>
                            </button>
                            <button
                              onClick={() => handleDownloadSingleQR(item)}
                              title="Download PNG sticker"
                              className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: MENU MANAGEMENT */}
        {/* ============================================================ */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#D4AF37]" />
                  Food & Beverage Menu Inventory
                </h2>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Update snacks, popcorn, combos, prices, and instantly toggle in-stock availability.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">


                <button
                  onClick={handleOpenAdd}
                  className="px-4 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] font-bold text-xs text-white shadow-lg shadow-[#E50914]/25 transition-all flex items-center gap-2 min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Menu Item</span>
                </button>
              </div>
            </div>

            {/* Menu Items Table / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(new Map(menuItems.map((item) => [item.id, item])).values()).map((item) => (
                <div
                  key={item.id}
                  className={`bg-[#15151C] border rounded-2xl overflow-hidden transition-all flex flex-col justify-between ${
                    item.available ? 'border-zinc-800' : 'border-rose-950/60 opacity-60 bg-zinc-950/40'
                  }`}
                >
                  <div className="p-4 flex gap-3.5">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-20 h-20 rounded-xl object-cover bg-zinc-900 shrink-0 border border-zinc-800"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="text-[10px] font-bold text-[#A1A1AA] uppercase">
                          {item.category}
                        </span>
                        {(item.isPopular || item.featured) && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30">
                            Popular
                          </span>
                        )}
                        {item.isDemo && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Demo data
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                      <span className="text-xs font-extrabold text-[#D4AF37] block mt-0.5">
                        ₹{item.price}
                      </span>
                      <p className="text-[11px] text-[#A1A1AA] line-clamp-2 mt-1 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Item Footer: In-Stock Toggle + Edit/Delete */}
                  <div className="bg-[#0B0B0F] px-4 py-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleToggleStock(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
                        item.available
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span>{item.available ? 'In Stock' : 'Sold Out'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: STAFF ACCOUNTS */}
        {/* ============================================================ */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-[#D4AF37]" />
                Staff Access & Kitchen Display Logins
              </h2>
              <p className="text-xs text-[#A1A1AA] mb-6">
                Manage accounts authorized to access the `/counter` display and mark cinema orders.
              </p>

              {/* Add Staff Form */}
              <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] uppercase mb-1">Staff Name</label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Ramesh Runner"
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="staff@cinema.com"
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] uppercase mb-1">Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as 'staff' | 'admin')}
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="staff">Counter Staff / Runner</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 min-h-[42px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Account</span>
                  </button>
                </div>
              </form>

              {staffError && <p className="text-xs text-rose-400 mt-2">{staffError}</p>}
            </div>

            {/* Staff List */}
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4">Active Staff Accounts ({staffList.length})</h3>
              <div className="divide-y divide-zinc-800">
                {staffList.map((st) => (
                  <div key={st.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-sm text-white">{st.name}</span>
                      <span className="text-xs text-[#A1A1AA] block">{st.email}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          st.role === 'admin'
                            ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30'
                            : 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                        }`}
                      >
                        {st.role}
                      </span>
                      <button
                        onClick={() => handleDeleteStaff(st.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete staff"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: ANALYTICS OVERVIEW */}
        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* TAB 5: COMPREHENSIVE ORDER & CONCESSIONS ANALYTICS (IST) */}
        {/* ============================================================ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top Date Range & Filter Toolbar */}
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
                    <h3 className="text-lg font-display font-extrabold text-white">
                      Cinema Order & Sales Analytics
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 tracking-wider">
                      {CINEMA_TIMEZONE} (IST)
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    Concessions performance, peak auditorium rush hours, and order settlements in cinema local time
                  </p>
                </div>

                {/* Actions: Refresh & Download CSV */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAnalyticsRefreshTrigger((prev) => prev + 1)}
                    disabled={isAnalyticsLoading}
                    title="Refresh data from Firestore"
                    className="p-2.5 rounded-xl bg-[#0B0B0F] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors flex items-center gap-1.5 text-xs font-bold min-h-[40px]"
                  >
                    <RefreshCw className={`w-4 h-4 ${isAnalyticsLoading ? 'animate-spin text-[#D4AF37]' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>

                  <button
                    onClick={handleDownloadAnalyticsCSV}
                    title="Export all orders in this period to CSV"
                    className="px-4 py-2.5 rounded-xl bg-[#0B0B0F] hover:bg-zinc-800 text-[#D4AF37] hover:text-white border border-[#D4AF37]/40 hover:border-[#D4AF37] text-xs font-bold flex items-center gap-2 transition-all min-h-[40px] shadow-sm active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Range CSV</span>
                  </button>
                </div>
              </div>

              {/* Date Filters & Presets Bar */}
              <div className="pt-3 border-t border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Period buttons */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {(['today', 'yesterday', '7days', '30days', 'custom'] as const).map((p) => {
                    const label =
                      p === 'today'
                        ? 'Today'
                        : p === 'yesterday'
                        ? 'Yesterday'
                        : p === '7days'
                        ? 'Last 7 Days'
                        : p === '30days'
                        ? 'Last 30 Days'
                        : 'Custom Range';
                    const isSelected = analyticsPeriod === p;
                    return (
                      <button
                        key={p}
                        onClick={() => handleSelectPeriod(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] ${
                          isSelected
                            ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/25'
                            : 'bg-[#0B0B0F] text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}

                  {/* Day stepper if single day */}
                  {(analyticsPeriod === 'today' || analyticsPeriod === 'yesterday') && (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        onClick={() => handleStepDay(-1)}
                        title="Previous Day"
                        className="w-9 h-9 rounded-xl bg-[#0B0B0F] border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStepDay(1)}
                        disabled={isToday(analyticsEndDate)}
                        title={isToday(analyticsEndDate) ? 'Cannot select future date' : 'Next Day'}
                        className={`w-9 h-9 rounded-xl bg-[#0B0B0F] border border-zinc-800 flex items-center justify-center transition-colors ${
                          isToday(analyticsEndDate)
                            ? 'opacity-30 cursor-not-allowed text-zinc-600'
                            : 'text-zinc-300 hover:text-white'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Date Range Pickers & Human Label */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#0B0B0F] border border-zinc-800 rounded-xl px-2.5 py-1 text-xs">
                    <span className="text-zinc-500 font-semibold text-[10px]">FROM:</span>
                    <input
                      type="date"
                      max={getISODateString(new Date())}
                      value={analyticsStartDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setAnalyticsStartDate(e.target.value);
                          setAnalyticsPeriod('custom');
                        }
                      }}
                      className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#0B0B0F] border border-zinc-800 rounded-xl px-2.5 py-1 text-xs">
                    <span className="text-zinc-500 font-semibold text-[10px]">TO:</span>
                    <input
                      type="date"
                      max={getISODateString(new Date())}
                      value={analyticsEndDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setAnalyticsEndDate(e.target.value);
                          setAnalyticsPeriod('custom');
                        }
                      }}
                      className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                    />
                  </div>

                  {/* Range preview text */}
                  <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-[#D4AF37] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>
                      {analyticsStartDate === analyticsEndDate
                        ? formatDay(analyticsStartDate, 'long')
                        : `${formatDay(analyticsStartDate, 'short')} — ${formatDay(analyticsEndDate, 'short')}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Total Gross Revenue */}
              <div className="bg-[#15151C] border border-[#D4AF37]/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Total Revenue (Net)
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-display font-black text-[#D4AF37]">
                    ₹{analyticsData.totalRevenue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-zinc-500 font-bold">INR</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-1">
                  From <strong className="text-white">{analyticsData.validOrdersCount}</strong> completed orders
                </p>
              </div>

              {/* Valid Orders Placed */}
              <div className="bg-[#15151C] border border-blue-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Valid Orders
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-display font-black text-white">
                    {analyticsData.validOrdersCount}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {analyticsData.deliveredCount} delivered
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-2">
                  <span className="text-sky-400 font-bold">{analyticsData.preparingCount} prep</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">{analyticsData.readyCount} ready</span>
                  <span>•</span>
                  <span className="text-[#E50914] font-bold">{analyticsData.receivedCount} new</span>
                </div>
              </div>

              {/* Average Order Value (AOV) */}
              <div className="bg-[#15151C] border border-emerald-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Average Order Value
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-display font-black text-emerald-400">
                    ₹{analyticsData.aov}
                  </span>
                  <span className="text-xs text-zinc-500 font-bold">per seat</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  Gross concession spend per patron
                </p>
              </div>

              {/* Unpaid Online Checkout Attempts */}
              <div className="bg-[#15151C] border border-amber-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Unpaid Attempts
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-display font-black text-amber-300">
                    {analyticsData.unpaidCount}
                  </span>
                  <span className="text-xs text-amber-400/80 font-bold">abandoned</span>
                </div>
                <p className="text-[11px] text-amber-300/70 mt-1.5">
                  Patrons initiated online checkout without completing payment
                </p>
              </div>

              {/* Cancelled Orders */}
              <div className="bg-[#15151C] border border-rose-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Cancelled Orders
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                    <Ban className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-3xl font-display font-black text-rose-400">
                    {analyticsData.cancelledCount}
                  </span>
                  {analyticsData.cancelledRevenue > 0 && (
                    <span className="text-xs text-rose-300/70 font-mono">
                      (₹{analyticsData.cancelledRevenue})
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  Refunded or voided by kitchen staff
                </p>
              </div>
            </div>

            {/* HOURLY SALES & RUSH DISTRIBUTION (Asia/Kolkata IST) */}
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D4AF37]" />
                    Hourly Rush & Sales Distribution (Asia/Kolkata IST)
                  </h3>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Order volume across 24 hours of cinema showtimes. Peak ordering occurs right before showtimes and during intermission.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-[#E50914] to-[#D4AF37]" />
                    <span>Orders Placed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-zinc-800" />
                    <span>Off-peak</span>
                  </div>
                </div>
              </div>

              {/* 24-Hour Bar Chart */}
              <div className="pt-4 pb-2 overflow-x-auto">
                <div className="min-w-[700px] flex items-end gap-1.5 sm:gap-2 h-44 px-2 border-b border-zinc-800 pb-2">
                  {analyticsData.hourlyBars.map((bar) => {
                    const heightPercent = bar.count > 0 ? Math.max(12, Math.round((bar.count / analyticsData.maxHourlyCount) * 100)) : 4;
                    const isRush = bar.count > 0 && bar.count >= analyticsData.maxHourlyCount * 0.7;

                    return (
                      <div
                        key={bar.hour}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center pointer-events-none transition-all">
                          <div className="bg-zinc-900 border border-[#D4AF37] px-2 py-1 rounded-lg text-[10px] text-white shadow-xl whitespace-nowrap">
                            <span className="font-bold text-[#D4AF37] block">{bar.label}</span>
                            <span>{bar.count} orders • ₹{bar.revenue}</span>
                          </div>
                          <div className="w-1.5 h-1.5 bg-[#D4AF37] rotate-45 -mt-0.5" />
                        </div>

                        {/* Top count label if has orders */}
                        {bar.count > 0 && (
                          <span className="text-[10px] font-mono font-bold text-zinc-300 mb-1 group-hover:text-[#D4AF37]">
                            {bar.count}
                          </span>
                        )}

                        {/* Visual Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            bar.count === 0
                              ? 'bg-zinc-900/60 group-hover:bg-zinc-800'
                              : isRush
                              ? 'bg-gradient-to-t from-[#E50914] to-[#D4AF37] shadow-lg shadow-[#E50914]/20'
                              : 'bg-gradient-to-t from-zinc-800 to-amber-500/80 group-hover:from-amber-600 group-hover:to-[#D4AF37]'
                          }`}
                        />

                        {/* Hour Label */}
                        <span className="text-[9px] sm:text-[10px] text-zinc-500 mt-2 font-mono whitespace-nowrap group-hover:text-white">
                          {bar.hour % 3 === 0 || bar.hour === 12 ? bar.label.replace(':00 ', '') : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3-COLUMN METRICS: AUDITORIUMS, PAYMENT CHANNELS & TOP ITEMS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Screen / Auditorium Breakdown */}
              <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#D4AF37]" />
                    Screen Breakdown
                  </h3>
                  <span className="text-xs text-zinc-500">Auditoriums</span>
                </div>

                {analyticsData.screenStats.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">No screen data in this period.</p>
                ) : (
                  <div className="space-y-3.5">
                    {analyticsData.screenStats.map((item, idx) => {
                      const percent =
                        analyticsData.totalRevenue > 0
                          ? Math.round((item.revenue / analyticsData.totalRevenue) * 100)
                          : 0;

                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#E50914]" />
                              {item.screen}
                            </span>
                            <div className="text-right">
                              <span className="font-mono font-bold text-[#D4AF37]">
                                ₹{item.revenue.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-zinc-500 ml-1.5">({item.count} orders)</span>
                            </div>
                          </div>
                          <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#E50914] to-[#D4AF37] rounded-full"
                              style={{ width: `${Math.min(100, Math.max(8, percent))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment Channels & Settlement */}
              <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Payment Settlement
                  </h3>
                  <span className="text-xs text-zinc-500">Channels</span>
                </div>

                <div className="space-y-4 pt-1">
                  {/* Online Payments Card */}
                  <div className="p-4 rounded-2xl bg-[#0B0B0F] border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block">Online (UPI / Card)</span>
                          <span className="text-[10px] text-zinc-500">Paid instantly in advance</span>
                        </div>
                      </div>
                      <span className="text-sm font-mono font-bold text-emerald-400">
                        ₹{analyticsData.payment.online.revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 flex justify-between pt-1 border-t border-zinc-800/50">
                      <span>Orders: {analyticsData.payment.online.count}</span>
                      <span>
                        {analyticsData.totalRevenue > 0
                          ? Math.round((analyticsData.payment.online.revenue / analyticsData.totalRevenue) * 100)
                          : 0}
                        % of sales
                      </span>
                    </div>
                  </div>

                  {/* Cash / Pay at Seat Card */}
                  <div className="p-4 rounded-2xl bg-[#0B0B0F] border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                          <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-white block">Pay at Seat</span>
                          <span className="text-[10px] text-zinc-500">Cash / Runner UPI on delivery</span>
                        </div>
                      </div>
                      <span className="text-sm font-mono font-bold text-amber-400">
                        ₹{analyticsData.payment.cash.revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 flex justify-between pt-1 border-t border-zinc-800/50">
                      <span>Orders: {analyticsData.payment.cash.count}</span>
                      <span>
                        {analyticsData.totalRevenue > 0
                          ? Math.round((analyticsData.payment.cash.revenue / analyticsData.totalRevenue) * 100)
                          : 0}
                        % of sales
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Selling Items & Combos */}
              <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                    Top Concessions
                  </h3>
                  <span className="text-xs text-zinc-500">By Qty Sold</span>
                </div>

                {analyticsData.topItems.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">No items sold in this period.</p>
                ) : (
                  <div className="space-y-2.5">
                    {analyticsData.topItems.slice(0, 6).map((item, idx) => {
                      const maxQty = analyticsData.topItems[0]?.qty || 1;
                      const percent = Math.min(100, Math.round((item.qty / maxQty) * 100));

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-white truncate max-w-[180px]">
                              {idx + 1}. {item.name}
                            </span>
                            <span className="text-[#D4AF37] font-mono shrink-0 ml-2">
                              {item.qty} sold (₹{item.revenue})
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E50914] rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ORDERS AUDIT LOG & EXPLORER FOR THE SELECTED RANGE */}
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-[#D4AF37]" />
                    Orders Explorer ({filteredAnalyticsOrders.length} orders)
                  </h3>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Full audit log for selected period. Filter by status or search by seat number.
                  </p>
                </div>

                {/* Search Box */}
                <div className="relative sm:w-64">
                  <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={analyticsSearchQuery}
                    onChange={(e) => setAnalyticsSearchQuery(e.target.value)}
                    placeholder="Search seat e.g. F12, Screen 2..."
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 border-b border-zinc-800/80 pb-3">
                {[
                  { id: 'all', label: `All (${analyticsOrders.length})` },
                  { id: 'delivered', label: `Delivered (${analyticsData.deliveredCount})` },
                  { id: 'ready', label: `Ready / Out (${analyticsData.readyCount})` },
                  { id: 'preparing', label: `Preparing (${analyticsData.preparingCount})` },
                  { id: 'received', label: `Received (${analyticsData.receivedCount})` },
                  { id: 'cancelled', label: `Cancelled (${analyticsData.cancelledCount})` },
                  { id: 'unpaid', label: `Unpaid (${analyticsData.unpaidCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAnalyticsStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      analyticsStatusFilter === tab.id
                        ? 'bg-zinc-800 text-white border border-zinc-700'
                        : 'text-zinc-400 hover:text-white bg-[#0B0B0F]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Orders Table */}
              {isAnalyticsLoading ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mb-3" />
                  <p className="text-xs text-zinc-400">Loading orders for selected range...</p>
                </div>
              ) : filteredAnalyticsOrders.length === 0 ? (
                <div className="py-10 text-center">
                  <PackageCheck className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 font-semibold">No orders matching this filter</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Time (IST)</th>
                        <th className="py-2.5 px-3">Screen & Seat</th>
                        <th className="py-2.5 px-3">Items Ordered</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3">Payment</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {filteredAnalyticsOrders.slice(0, 50).map((order) => {
                        const isUnpaid =
                          (order.status || '').toLowerCase().includes('awaiting') ||
                          (order.paymentStatus || '').toLowerCase() === 'unpaid';

                        return (
                          <tr key={order.id} className="hover:bg-zinc-900/40 transition-colors">
                            {/* Time */}
                            <td className="py-3 px-3 font-mono text-zinc-400 whitespace-nowrap">
                              <span className="block font-bold text-white">{formatTime(order.createdAt)}</span>
                              <span className="text-[10px] text-zinc-500">{formatDay(order.createdAt, 'short')}</span>
                            </td>

                            {/* Screen & Seat */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="text-sm font-display font-extrabold text-[#D4AF37] block">
                                Screen {order.screen} • {order.row}{order.seat}
                              </span>
                              {order.orderId && (
                                <span className="text-[10px] font-mono text-zinc-500">#{order.orderId}</span>
                              )}
                            </td>

                            {/* Items */}
                            <td className="py-3 px-3 max-w-xs">
                              <div className="space-y-0.5">
                                {order.items.map((it, idx) => (
                                  <div key={idx} className="text-zinc-300 truncate">
                                    <span className="text-[#D4AF37] font-bold mr-1">x{it.qty}</span>
                                    {it.name}
                                  </div>
                                ))}
                              </div>
                            </td>

                            {/* Total */}
                            <td className="py-3 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                              ₹{order.total}
                            </td>

                            {/* Payment */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {isUnpaid ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  Unpaid Online
                                </span>
                              ) : order.paymentMethod?.toLowerCase().includes('seat') ||
                                order.paymentMethod?.toLowerCase().includes('cash') ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                                  <Banknote className="w-3 h-3" />
                                  Pay at Seat
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Paid Online
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                  order.status === 'received'
                                    ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30'
                                    : order.status === 'preparing'
                                    ? 'bg-[#2563EB]/20 text-[#2563EB] border border-[#2563EB]/30'
                                    : order.status === 'ready' || order.status === 'on_the_way'
                                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                                    : order.status === 'cancelled'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {order.status === 'on_the_way' ? 'Ready / Out' : order.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredAnalyticsOrders.length > 50 && (
                    <p className="text-center text-[11px] text-zinc-500 py-3">
                      Showing first 50 orders of {filteredAnalyticsOrders.length}. Use "Download Range CSV" for complete export.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Live Testing & Data Controls (Preserved from existing) */}
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                Live Testing & Data Controls
              </h3>
              <p className="text-xs text-[#A1A1AA] mb-4">
                Reset live testing orders and tickets to perform clean order flow validation.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    await storeService.clearAllOrders();
                    setAnalyticsRefreshTrigger((prev) => prev + 1);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 hover:text-white font-bold text-xs flex items-center gap-2 transition-all min-h-[40px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Test Orders</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await storeService.clearAllTickets();
                    setAnalyticsRefreshTrigger((prev) => prev + 1);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white font-bold text-xs flex items-center gap-2 transition-all min-h-[40px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Issue Tickets</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: AUDITORIUM ISSUE TICKETS */}
        {/* ============================================================ */}
        {activeTab === 'tickets' && (
          <TicketsManagementView
            onSelectSeat={(screen, row, seat) => {
              onSelectCustomerSeat(screen, row, seat);
            }}
          />
        )}


      </div>

      {/* Edit/Add Menu Item Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#15151C] border border-zinc-800 rounded-3xl shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-bold">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#A1A1AA] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">Item Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g. Caramel Popcorn (Tub)"
                  className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                    className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Freshly popped corn tossed with sweet golden caramel glaze..."
                  className="w-full bg-[#0B0B0F] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVeg}
                    onChange={(e) => setFormData({ ...formData, isVeg: e.target.checked })}
                    className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-zinc-300">Vegetarian Item</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    className="rounded border-zinc-700 text-[#D4AF37] focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-zinc-300">Available / In Stock</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E50914] text-xs font-bold text-white hover:bg-[#b80710] shadow-md shadow-[#E50914]/25"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zoomed QR Preview Modal for Mobile Camera Scanning */}
      {previewQRItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#15151C] border border-[#D4AF37]/50 rounded-3xl shadow-2xl p-6 text-white text-center space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="text-left">
                <h3 className="text-base font-bold text-white">
                  Screen {previewQRItem.screen} • Seat {previewQRItem.seatLabel}
                </h3>
                <span className="text-[11px] text-[#D4AF37] font-semibold">Seat Armrest QR Code</span>
              </div>
              <button
                onClick={() => setPreviewQRItem(null)}
                className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-3 rounded-2xl shadow-xl w-60 h-60 mx-auto flex items-center justify-center">
              <img
                src={previewQRItem.dataUrl}
                alt={previewQRItem.seatLabel}
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Aim your smartphone camera at this QR code to test mobile scanning and automatic seat capture.
            </p>

            <div className="bg-[#0B0B0F] p-2.5 rounded-xl border border-zinc-800 text-[11px] font-mono text-[#D4AF37] truncate">
              {previewQRItem.url}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  onSelectCustomerSeat(String(previewQRItem.screen), previewQRItem.row, String(previewQRItem.seat));
                  setPreviewQRItem(null);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-black font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20"
              >
                <Smartphone className="w-4 h-4" />
                <span>Simulate Scan on This Device</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewQRItem.url);
                    alert('Copied QR link to clipboard!');
                  }}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
                <button
                  onClick={() => handleDownloadSingleQR(previewQRItem)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
