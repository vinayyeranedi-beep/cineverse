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
} from 'lucide-react';
import {
  MenuItem,
  Category,
  UserProfile,
  ScreenGridConfig,
  StaffAccount,
  Ticket,
} from '../types';
import { storeService, getRowLetter } from '../services/store';
import { TicketsManagementView } from './TicketsManagementView';

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

const CATEGORIES: Category[] = ['Popcorn', 'Drinks', 'Snacks', 'Combos'];

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

  // Analytics
  const [analytics, setAnalytics] = useState(() => storeService.getSalesSummary());

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

  // Refresh analytics periodically or on tab open
  useEffect(() => {
    if (activeTab === 'analytics') {
      setAnalytics(storeService.getSalesSummary());
    }
  }, [activeTab]);

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
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Cinema Administration
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white mt-1">
              Cineverse Multiplex Admin
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-0.5">
              Manage cinema screens, m x n seat grids, menu inventory, QR sticker exports, and staff access.
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
                              SeatServe QR
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

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] font-bold text-xs text-white shadow-lg shadow-[#E50914]/25 transition-all flex items-center gap-2 self-start sm:self-center min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Menu Item</span>
              </button>
            </div>

            {/* Menu Items Table / Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((item) => (
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
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="text-[10px] font-bold text-[#A1A1AA] uppercase">
                          {item.category}
                        </span>
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
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 shadow-xl">
                <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">
                  Total Session Orders
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-display font-black text-white">{analytics.allOrdersCount}</span>
                  <span className="text-xs text-emerald-400 font-semibold">{analytics.totalOrdersToday} today</span>
                </div>
              </div>

              <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 shadow-xl">
                <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">
                  Total Gross Revenue
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-display font-black text-[#D4AF37]">₹{analytics.allRevenue}</span>
                  <span className="text-xs text-[#A1A1AA]">INR</span>
                </div>
              </div>

              <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 shadow-xl">
                <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">
                  Average Order Value (AOV)
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-display font-black text-sky-400">
                    ₹{analytics.allOrdersCount > 0 ? Math.round(analytics.allRevenue / analytics.allOrdersCount) : 0}
                  </span>
                  <span className="text-xs text-[#A1A1AA]">per seat</span>
                </div>
              </div>
            </div>

            {/* Top Selling Items */}
            <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                Top-Selling Cinema Snacks & Combos
              </h3>

              <div className="space-y-3">
                {analytics.topSellingItems.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-white">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="text-[#D4AF37] font-mono">
                        {item.qty} sold (₹{item.revenue})
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E50914] rounded-full"
                        style={{
                          width: `${Math.min(100, (item.qty / (analytics.topSellingItems[0]?.qty || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testing & Reset Controls */}
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
