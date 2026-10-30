import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Film,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Sliders,
  HelpCircle,
  Maximize2,
  ArrowRightLeft,
  Sparkles,
  Layers,
  History,
  X,
  FileText,
} from 'lucide-react';
import {
  ScreenGridConfig,
  SeatMapConfig,
  SeatMapRow,
  SeatMapSeat,
  SeatType,
  LayoutSummaryItem,
} from '../types';
import { storeService } from '../services/store';
import {
  createDefaultSeatMap,
  createSummaryLayout,
  validateSeatMapJson,
} from '../lib/seatMapDefaults';
import { formatTime, formatDay } from '../lib/dates';

interface SeatPlanBuilderProps {
  screensMap: Record<string, ScreenGridConfig>;
}

export const SeatPlanBuilder: React.FC<SeatPlanBuilderProps> = ({ screensMap }) => {
  const [selectedScreenId, setSelectedScreenId] = useState<string>('1');

  // Active Screen's SeatMap in state
  const currentConfig = screensMap[selectedScreenId];
  const [seatMap, setSeatMap] = useState<SeatMapConfig>(() => {
    return currentConfig?.seatMap || createDefaultSeatMap(selectedScreenId);
  });

  // Track version history (up to last 5 saves)
  const [versionHistory, setVersionHistory] = useState<SeatMapConfig[]>(() => {
    return currentConfig?.seatMapHistory || [];
  });

  // When selected screen changes, reload its seatMap
  useEffect(() => {
    const config = screensMap[selectedScreenId];
    const initialMap = config?.seatMap || createDefaultSeatMap(selectedScreenId);
    setSeatMap(initialMap);
    setVersionHistory(config?.seatMapHistory || []);
    setSelectedSeat(null);
    setSaveMessage('');
  }, [selectedScreenId, screensMap]);

  // UI state
  const [selectedSeat, setSelectedSeat] = useState<{
    rowIndex: number;
    seatIndex: number;
    seat: SeatMapSeat;
  } | null>(null);

  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [importExportTab, setImportExportTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [copiedJson, setCopiedJson] = useState(false);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Background tracing reference image
  const [traceImage, setTraceImage] = useState<string | null>(null);
  const [traceOpacity, setTraceOpacity] = useState<number>(30); // 0 - 100
  const [showTrace, setShowTrace] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Add Row Form State
  const [newRowLetter, setNewRowLetter] = useState('K');
  const [newRowSeatsCount, setNewRowSeatsCount] = useState(20);
  const [newRowStartNum, setNewRowStartNum] = useState(1);
  const [newRowDirection, setNewRowDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [newRowType, setNewRowType] = useState<SeatType>('standard');
  const [newRowAisleGaps, setNewRowAisleGaps] = useState('6, 14');

  // Compute live seat metrics and check for duplicate seat labels
  const metrics = useMemo(() => {
    let totalSeats = 0;
    const typeCounts: Record<SeatType, number> = {
      standard: 0,
      premium: 0,
      recliner: 0,
      wheelchair: 0,
      couple: 0,
    };
    const seen = new Map<string, number>();
    const duplicates: string[] = [];

    seatMap.rows.forEach((r) => {
      r.seats.forEach((s) => {
        totalSeats++;
        typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;

        const count = seen.get(s.label) || 0;
        seen.set(s.label, count + 1);
        if (count === 1) {
          duplicates.push(s.label);
        }
      });
    });

    return {
      totalSeats,
      totalRows: seatMap.rows.length,
      typeCounts,
      duplicates,
    };
  }, [seatMap]);

  // Max X coordinate in map to size the canvas properly
  const maxX = useMemo(() => {
    let max = 22;
    seatMap.rows.forEach((r) => {
      r.seats.forEach((s) => {
        if (s.x > max) max = s.x;
      });
    });
    return max + 2;
  }, [seatMap]);

  // Save Plan to Firestore & localStorage
  const handleSavePlan = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const updatedMap: SeatMapConfig = {
        ...seatMap,
        version: (seatMap.version || 1) + 1,
        updatedAt: Date.now(),
      };

      await storeService.saveSeatMap(selectedScreenId, updatedMap);
      setSeatMap(updatedMap);
      setSaveMessage(`Seat plan for Screen ${selectedScreenId} saved to database!`);
      setTimeout(() => setSaveMessage(''), 4500);
    } catch (err) {
      console.error(err);
      alert('Failed to save seat plan.');
    } finally {
      setIsSaving(false);
    }
  };

  // Restore previous version from history
  const handleRestoreVersion = (historyItem: SeatMapConfig) => {
    if (confirm(`Restore seat plan version saved on ${formatTime(historyItem.updatedAt)}?`)) {
      setSeatMap({
        ...historyItem,
        version: (seatMap.version || 1) + 1,
        updatedAt: Date.now(),
      });
      setIsHistoryModalOpen(false);
      setSaveMessage('Restored previous version. Click "Save Plan" to commit.');
    }
  };

  // Seat Click Handler
  const handleSeatClick = (rIdx: number, sIdx: number, seat: SeatMapSeat) => {
    setSelectedSeat({
      rowIndex: rIdx,
      seatIndex: sIdx,
      seat: { ...seat },
    });
  };

  // Update selected seat type
  const handleUpdateSeatType = (newType: SeatType) => {
    if (!selectedSeat) return;
    const { rowIndex, seatIndex } = selectedSeat;

    const newRows = [...seatMap.rows];
    const targetRow = { ...newRows[rowIndex] };
    const targetSeats = [...targetRow.seats];

    targetSeats[seatIndex] = {
      ...targetSeats[seatIndex],
      type: newType,
    };

    targetRow.seats = targetSeats;
    newRows[rowIndex] = targetRow;

    setSeatMap({ ...seatMap, rows: newRows });
    setSelectedSeat({
      rowIndex,
      seatIndex,
      seat: targetSeats[seatIndex],
    });
  };

  // Update selected seat number/label
  const handleUpdateSeatNumber = (newColNum: number) => {
    if (!selectedSeat || isNaN(newColNum) || newColNum < 0) return;
    const { rowIndex, seatIndex } = selectedSeat;

    const newRows = [...seatMap.rows];
    const targetRow = { ...newRows[rowIndex] };
    const targetSeats = [...targetRow.seats];

    const updatedSeat: SeatMapSeat = {
      ...targetSeats[seatIndex],
      col: newColNum,
      label: `${targetRow.row}${newColNum}`,
    };

    targetSeats[seatIndex] = updatedSeat;
    targetRow.seats = targetSeats;
    newRows[rowIndex] = targetRow;

    setSeatMap({ ...seatMap, rows: newRows });
    setSelectedSeat({
      rowIndex,
      seatIndex,
      seat: updatedSeat,
    });
  };

  // Insert Aisle Gap Before / After this seat
  const handleInsertAisleGap = (position: 'before' | 'after') => {
    if (!selectedSeat) return;
    const { rowIndex, seatIndex } = selectedSeat;

    const newRows = [...seatMap.rows];
    const targetRow = { ...newRows[rowIndex] };
    const targetSeats = targetRow.seats.map((s, idx) => {
      if (position === 'before' && idx >= seatIndex) {
        return { ...s, x: s.x + 2 };
      }
      if (position === 'after' && idx > seatIndex) {
        return { ...s, x: s.x + 2 };
      }
      return s;
    });

    targetRow.seats = targetSeats;
    newRows[rowIndex] = targetRow;

    setSeatMap({ ...seatMap, rows: newRows });
    setSelectedSeat({
      rowIndex,
      seatIndex,
      seat: targetSeats[seatIndex],
    });
  };

  // Remove individual seat
  const handleRemoveSeat = () => {
    if (!selectedSeat) return;
    const { rowIndex, seatIndex } = selectedSeat;

    const newRows = [...seatMap.rows];
    const targetRow = { ...newRows[rowIndex] };
    targetRow.seats = targetRow.seats.filter((_, idx) => idx !== seatIndex);
    newRows[rowIndex] = targetRow;

    setSeatMap({ ...seatMap, rows: newRows });
    setSelectedSeat(null);
  };

  // Shift row offset horizontally (e.g. for staggered or curved hall rows)
  const handleShiftRowOffset = (rowIndex: number, delta: number) => {
    const newRows = [...seatMap.rows];
    const targetRow = { ...newRows[rowIndex] };
    targetRow.seats = targetRow.seats.map((s) => ({
      ...s,
      x: Math.max(0, s.x + delta),
    }));
    newRows[rowIndex] = targetRow;
    setSeatMap({ ...seatMap, rows: newRows });
  };

  // Rename a row letter
  const handleRenameRow = (rowIndex: number) => {
    const currentRow = seatMap.rows[rowIndex];
    const input = prompt(`Enter new row letter for Row ${currentRow.row}:`, currentRow.row);
    if (!input) return;
    const clean = input.trim().toUpperCase();
    if (!clean || clean === currentRow.row) return;

    const newRows = [...seatMap.rows];
    newRows[rowIndex] = {
      ...currentRow,
      row: clean,
      seats: currentRow.seats.map((s) => ({
        ...s,
        label: `${clean}${s.col}`,
      })),
    };
    setSeatMap({ ...seatMap, rows: newRows });
  };

  // Delete an entire row
  const handleDeleteRow = (rowIndex: number) => {
    const targetRow = seatMap.rows[rowIndex];
    if (confirm(`Delete Row ${targetRow.row} and its ${targetRow.seats.length} seats?`)) {
      const newRows = seatMap.rows.filter((_, idx) => idx !== rowIndex);
      setSeatMap({ ...seatMap, rows: newRows });
      setSelectedSeat(null);
    }
  };

  // Add new row submit
  const handleAddRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLetter = newRowLetter.trim().toUpperCase();
    if (!cleanLetter) {
      alert('Please enter a valid row letter');
      return;
    }

    const gaps = newRowAisleGaps
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const seats: SeatMapSeat[] = [];
    let currentX = 0;

    for (let i = 0; i < newRowSeatsCount; i++) {
      const colNum =
        newRowDirection === 'ltr'
          ? newRowStartNum + i
          : newRowStartNum + (newRowSeatsCount - 1 - i);

      seats.push({
        col: colNum,
        label: `${cleanLetter}${colNum}`,
        type: newRowType,
        x: currentX,
      });

      currentX += 1;
      // Add gap if column index matches
      if (gaps.includes(i + 1)) {
        currentX += 2;
      }
    }

    const newRow: SeatMapRow = {
      row: cleanLetter,
      seats,
    };

    setSeatMap({
      ...seatMap,
      rows: [...seatMap.rows, newRow],
    });

    setIsAddRowModalOpen(false);
  };

  // Handle Trace Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setTraceImage(event.target?.result as string);
      setShowTrace(true);
    };
    reader.readAsDataURL(file);
  };

  // Import JSON action
  const handleApplyImport = () => {
    setImportError('');
    setImportSuccess('');

    const res = validateSeatMapJson(importText);
    if (!res.valid || !res.seatMap) {
      setImportError(res.error || 'Invalid seat map JSON format');
      return;
    }

    setSeatMap(res.seatMap);
    setImportSuccess(
      `Successfully loaded ${res.seatMap.rows.length} rows with ${res.totalSeats} seats!`
    );
    setTimeout(() => {
      setIsImportExportModalOpen(false);
      setImportSuccess('');
      setSaveMessage('Imported seat map applied. Click "Save Plan" to commit.');
    }, 1200);
  };

  // Copy JSON action
  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(seatMap, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  // Download JSON file
  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(seatMap, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cineverse-screen-${selectedScreenId}-seatMap.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Screen Selector */}
      <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center">
                <Layers className="w-5 h-5 stroke-[2.2]" />
              </span>
              <div>
                <h2 className="text-xl font-display font-extrabold text-white">
                  Auditorium Seat Plan Builder
                </h2>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Design real architectural cinema hall layouts with precise aisles, skipped numbers, and seat classes
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Add Row, Trace Image, Import/Export, Save Plan */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsAddRowModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-zinc-700 min-h-[40px]"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Add Row</span>
            </button>

            {/* Trace Image Trigger */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload floor plan blueprint image to trace"
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[40px] ${
                  traceImage
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-[#0B0B0F] hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>{traceImage ? 'Replace Trace Image' : 'Trace Blueprint Image'}</span>
              </button>
            </div>

            {/* Import / Export JSON */}
            <button
              onClick={() => {
                setImportText(JSON.stringify(seatMap, null, 2));
                setImportError('');
                setImportSuccess('');
                setIsImportExportModalOpen(true);
              }}
              className="px-3 py-2.5 rounded-xl bg-[#0B0B0F] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-bold text-xs flex items-center gap-1.5 transition-colors min-h-[40px]"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Import / Export JSON</span>
            </button>

            {/* Version History (5) */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              disabled={versionHistory.length === 0}
              title="View last 5 saved snapshots"
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors min-h-[40px] ${
                versionHistory.length > 0
                  ? 'bg-[#0B0B0F] hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                  : 'bg-zinc-900/40 text-zinc-600 border-zinc-900 cursor-not-allowed'
              }`}
            >
              <History className="w-4 h-4 text-purple-400" />
              <span>History ({versionHistory.length})</span>
            </button>

            {/* Primary Save Button */}
            <button
              onClick={handleSavePlan}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] font-bold text-xs text-white shadow-lg shadow-[#E50914]/30 flex items-center gap-2 transition-all active:scale-95 min-h-[40px]"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Plan to Firestore'}</span>
            </button>
          </div>
        </div>

        {/* Screen Selector Pills */}
        <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mr-1">
              Select Screen:
            </span>
            {['1', '2', '3'].map((scr) => {
              const cfg = screensMap[scr];
              const isSelected = selectedScreenId === scr;
              return (
                <button
                  key={scr}
                  onClick={() => setSelectedScreenId(scr)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/30 font-black'
                      : 'bg-[#0B0B0F] text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>{cfg?.name || `Screen ${scr}`}</span>
                </button>
              );
            })}
          </div>

          {/* Reset to Default Screen Map */}
          <button
            onClick={() => {
              if (confirm(`Reset Screen ${selectedScreenId} to standard architectural template?`)) {
                setSeatMap(createDefaultSeatMap(selectedScreenId));
                setSelectedSeat(null);
                setSaveMessage('Reset to cinema template. Click "Save Plan" to write to Firestore.');
              }
            }}
            className="text-[11px] text-zinc-400 hover:text-rose-400 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Cinema Preset</span>
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Duplicate Seats Warning Banner */}
      {metrics.duplicates.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 shadow-lg">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <strong className="block font-bold">Duplicate seat labels detected:</strong>
            <span className="text-rose-200">
              The following seat codes appear more than once: {metrics.duplicates.join(', ')}. Please rename or remove duplicates before printing QR stickers.
            </span>
          </div>
        </div>
      )}

      {/* Live Seat Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-[#15151C] border border-zinc-800 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Total Seats
          </span>
          <span className="text-xl font-display font-black text-white mt-1 block">
            {metrics.totalSeats}
          </span>
        </div>

        <div className="bg-[#15151C] border border-zinc-800 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Rows
          </span>
          <span className="text-xl font-display font-black text-white mt-1 block">
            {metrics.totalRows}
          </span>
        </div>

        <div className="bg-[#15151C] border border-zinc-700/60 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Standard
          </span>
          <span className="text-xl font-display font-black text-zinc-200 mt-1 block">
            {metrics.typeCounts.standard}
          </span>
        </div>

        <div className="bg-[#15151C] border border-[#D4AF37]/30 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider block">
            Premium
          </span>
          <span className="text-xl font-display font-black text-[#D4AF37] mt-1 block">
            {metrics.typeCounts.premium}
          </span>
        </div>

        <div className="bg-[#15151C] border border-purple-500/30 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
            Recliner
          </span>
          <span className="text-xl font-display font-black text-purple-300 mt-1 block">
            {metrics.typeCounts.recliner}
          </span>
        </div>

        <div className="bg-[#15151C] border border-blue-500/30 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
            Wheelchair
          </span>
          <span className="text-xl font-display font-black text-blue-300 mt-1 block">
            {metrics.typeCounts.wheelchair}
          </span>
        </div>

        <div className="bg-[#15151C] border border-rose-500/30 rounded-2xl p-3 shadow-md">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
            Couple
          </span>
          <span className="text-xl font-display font-black text-rose-300 mt-1 block">
            {metrics.typeCounts.couple}
          </span>
        </div>
      </div>

      {/* Tracing Controls Bar if image loaded */}
      {traceImage && (
        <div className="p-3.5 bg-[#15151C] border border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTrace(!showTrace)}
              className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-semibold"
            >
              {showTrace ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-zinc-500" />}
              <span>{showTrace ? 'Blueprint Trace Active' : 'Blueprint Trace Hidden'}</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Opacity:</span>
              <input
                type="range"
                min="5"
                max="80"
                value={traceOpacity}
                onChange={(e) => setTraceOpacity(Number(e.target.value))}
                className="w-24 accent-[#D4AF37] cursor-pointer"
              />
              <span className="text-zinc-400 font-mono text-[11px]">{traceOpacity}%</span>
            </div>
          </div>
          <button
            onClick={() => setTraceImage(null)}
            className="text-zinc-500 hover:text-rose-400 text-xs"
          >
            Clear Blueprint
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISUAL SEATING CANVAS ("SCREEN THIS WAY" at the top) */}
      {/* ============================================================ */}
      <div className="bg-[#15151C] border border-zinc-800 rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Faint Trace Reference Image in Background */}
        {traceImage && showTrace && (
          <div
            className="absolute inset-0 pointer-events-none bg-contain bg-center bg-no-repeat transition-opacity"
            style={{
              backgroundImage: `url(${traceImage})`,
              opacity: traceOpacity / 100,
            }}
          />
        )}

        <div className="relative z-10 space-y-8">
          {/* CURVED CINEMA SCREEN HEADER */}
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <div className="relative">
              {/* Projector beam glow */}
              <div className="h-10 w-full bg-gradient-to-b from-[#D4AF37]/20 via-[#D4AF37]/5 to-transparent rounded-t-[80px] blur-sm pointer-events-none" />
              {/* Curved screen line */}
              <div className="h-2 w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent rounded-full shadow-[0_0_15px_rgba(212,175,55,0.6)]" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] sm:text-xs font-display font-black tracking-[0.3em] text-[#D4AF37] uppercase">
                SCREEN THIS WAY
              </span>
            </div>
          </div>

          {/* Hall Legend Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-zinc-400 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-zinc-800 border border-zinc-700" />
              <span>Standard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-950/60 border border-[#D4AF37] text-[#D4AF37]" />
              <span>Premium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-purple-950/60 border border-purple-500" />
              <span>Recliner</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-blue-950/60 border border-blue-500" />
              <span>Wheelchair</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-3.5 rounded bg-rose-950/60 border border-rose-500" />
              <span>Couple</span>
            </div>
          </div>

          {/* ROWS & SEAT GRID */}
          <div className="overflow-x-auto pb-6">
            <div className="min-w-[780px] space-y-3.5">
              {seatMap.rows.map((rowItem, rIdx) => {
                return (
                  <div key={rowItem.row} className="flex items-center gap-3 group">
                    {/* LEFT ROW CONTROLS & LETTER */}
                    <div className="w-16 shrink-0 flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleRenameRow(rIdx)}
                        title={`Rename Row ${rowItem.row}`}
                        className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-[#D4AF37] text-zinc-300 font-display font-black text-xs flex items-center justify-center transition-colors shadow-sm"
                      >
                        {rowItem.row}
                      </button>
                    </div>

                    {/* SEATS ROW CONTAINER (Positioned by X coordinate) */}
                    <div className="flex-1 bg-black/20 p-2 rounded-2xl border border-zinc-800/60 relative min-h-[46px] flex items-center">
                      <div
                        className="relative w-full flex items-center"
                        style={{ minHeight: '36px' }}
                      >
                        {rowItem.seats.map((seat, sIdx) => {
                          const isSelected =
                            selectedSeat?.rowIndex === rIdx && selectedSeat?.seatIndex === sIdx;

                          // Dynamic styling based on seat type
                          let typeClasses = 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500';
                          if (seat.type === 'premium') {
                            typeClasses = 'bg-amber-950/50 border-[#D4AF37] text-[#D4AF37] shadow-sm shadow-[#D4AF37]/20 hover:bg-amber-900/60';
                          } else if (seat.type === 'recliner') {
                            typeClasses = 'bg-purple-950/60 border-purple-500 text-purple-300 shadow-sm shadow-purple-500/20 hover:bg-purple-900/60';
                          } else if (seat.type === 'wheelchair') {
                            typeClasses = 'bg-blue-950/60 border-blue-400 text-blue-300 shadow-sm shadow-blue-500/20 hover:bg-blue-900/60';
                          } else if (seat.type === 'couple') {
                            typeClasses = 'bg-rose-950/60 border-rose-400 text-rose-300 shadow-sm shadow-rose-500/20 hover:bg-rose-900/60';
                          }

                          return (
                            <button
                              key={seat.label}
                              type="button"
                              onClick={() => handleSeatClick(rIdx, sIdx, seat)}
                              style={{
                                position: 'absolute',
                                left: `${(seat.x / maxX) * 100}%`,
                                width: seat.type === 'couple' ? '46px' : '32px',
                              }}
                              className={`h-8 rounded-lg border font-mono text-[11px] font-bold flex items-center justify-center transition-all ${typeClasses} ${
                                isSelected
                                  ? 'ring-2 ring-white scale-110 z-20 brightness-125'
                                  : 'hover:scale-105'
                              }`}
                              title={`Seat ${seat.label} (${seat.type}) - Click to edit`}
                            >
                              {seat.col}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT ROW CONTROLS */}
                    <div className="w-24 shrink-0 flex items-center gap-1 text-zinc-500 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleShiftRowOffset(rIdx, -1)}
                        title="Shift row left (-1)"
                        className="p-1 rounded hover:bg-zinc-800 hover:text-white"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleShiftRowOffset(rIdx, 1)}
                        title="Shift row right (+1)"
                        className="p-1 rounded hover:bg-zinc-800 hover:text-white"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRow(rIdx)}
                        title={`Delete Row ${rowItem.row}`}
                        className="p-1 rounded hover:bg-rose-950/50 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-display font-black text-xs text-zinc-400 ml-1">
                        {rowItem.row}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SEAT INSPECTOR & EDIT MODAL / DRAWER */}
      {/* ============================================================ */}
      {selectedSeat && (
        <div className="bg-[#15151C] border border-[#D4AF37]/50 rounded-3xl p-5 sm:p-6 shadow-2xl animate-fade-in space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <span className="text-xl font-display font-black text-[#D4AF37]">
                SEAT {selectedSeat.seat.label}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-zinc-800 text-zinc-300">
                {selectedSeat.seat.type}
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                Horizontal Position: x={selectedSeat.seat.x}
              </span>
            </div>
            <button
              onClick={() => setSelectedSeat(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Change Seat Type */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                Seat Classification / Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['standard', 'premium', 'recliner', 'wheelchair', 'couple'] as SeatType[]).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleUpdateSeatType(t)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                        selectedSeat.seat.type === t
                          ? 'bg-[#E50914] text-white border-[#E50914] shadow-md'
                          : 'bg-[#0B0B0F] text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 2. Change Seat Number & Label */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                Seat Number (Chair Label)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={selectedSeat.seat.col}
                  onChange={(e) => handleUpdateSeatNumber(parseInt(e.target.value, 10))}
                  className="w-24 px-3 py-2 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-white font-mono font-bold text-center focus:outline-none focus:border-[#D4AF37]"
                />
                <span className="text-xs text-zinc-400">
                  Label: <strong>{selectedSeat.seat.label}</strong>
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                You can skip numbers (e.g. skip 13) to match physical chair labeling.
              </p>
            </div>

            {/* 3. Aisle Gaps & Actions */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
                Aisles & Row Positioning
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleInsertAisleGap('before')}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700"
                >
                  + Gap Before
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertAisleGap('after')}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700"
                >
                  + Gap After
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSeat}
                  className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Seat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD ROW MODAL */}
      {/* ============================================================ */}
      {isAddRowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#15151C] border border-zinc-800 rounded-3xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-bold">Add Row to Screen {selectedScreenId}</h3>
              <button
                onClick={() => setIsAddRowModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRowSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                  Row Letter
                </label>
                <input
                  type="text"
                  value={newRowLetter}
                  onChange={(e) => setNewRowLetter(e.target.value.toUpperCase())}
                  placeholder="K"
                  required
                  maxLength={3}
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-white font-mono font-bold uppercase focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                    Seats Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newRowSeatsCount}
                    onChange={(e) => setNewRowSeatsCount(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                    Starting Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newRowStartNum}
                    onChange={(e) => setNewRowStartNum(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                  Numbering Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRowDirection('ltr')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      newRowDirection === 'ltr'
                        ? 'bg-[#E50914] text-white border-[#E50914]'
                        : 'bg-[#0B0B0F] text-zinc-400 border-zinc-800'
                    }`}
                  >
                    Left-to-Right (1 → N)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRowDirection('rtl')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      newRowDirection === 'rtl'
                        ? 'bg-[#E50914] text-white border-[#E50914]'
                        : 'bg-[#0B0B0F] text-zinc-400 border-zinc-800'
                    }`}
                  >
                    Right-to-Left (N → 1)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                  Default Seat Type
                </label>
                <select
                  value={newRowType}
                  onChange={(e) => setNewRowType(e.target.value as SeatType)}
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="recliner">Recliner</option>
                  <option value="wheelchair">Wheelchair</option>
                  <option value="couple">Couple</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                  Aisle Gap Columns (after seat numbers)
                </label>
                <input
                  type="text"
                  value={newRowAisleGaps}
                  onChange={(e) => setNewRowAisleGaps(e.target.value)}
                  placeholder="6, 14"
                  className="w-full px-3.5 py-2.5 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRowModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-xs font-bold text-white shadow-md shadow-[#E50914]/25"
                >
                  Add Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* IMPORT / EXPORT JSON MODAL */}
      {/* ============================================================ */}
      {isImportExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-[#15151C] border border-zinc-800 rounded-3xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <h3 className="text-lg font-bold">Seat Plan JSON Configuration</h3>
              </div>
              <button
                onClick={() => setIsImportExportModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs: Export vs Import */}
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <button
                onClick={() => setImportExportTab('export')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  importExportTab === 'export'
                    ? 'bg-[#E50914] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Export JSON
              </button>
              <button
                onClick={() => setImportExportTab('import')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  importExportTab === 'import'
                    ? 'bg-[#E50914] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Import JSON
              </button>
            </div>

            {importExportTab === 'export' ? (
              <div className="space-y-4">
                <p className="text-xs text-[#A1A1AA]">
                  Current real seat map JSON for Screen {selectedScreenId} ({seatMap.rows.length} rows, {metrics.totalSeats} seats).
                </p>
                <textarea
                  readOnly
                  value={JSON.stringify(seatMap, null, 2)}
                  className="w-full h-72 p-3 bg-[#0B0B0F] border border-zinc-800 rounded-xl font-mono text-xs text-emerald-400 focus:outline-none resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center gap-1.5"
                  >
                    {copiedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={handleDownloadJson}
                    className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .json File</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[#A1A1AA]">
                  Paste seatMap JSON below. Schema errors and duplicate seat labels will be verified before applying.
                </p>
                <textarea
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    setImportError('');
                    setImportSuccess('');
                  }}
                  placeholder='{ "rows": [ { "row": "A", "seats": [ { "col": 1, "label": "A1", "type": "standard", "x": 0 } ] } ] }'
                  className="w-full h-72 p-3 bg-[#0B0B0F] border border-zinc-800 rounded-xl font-mono text-xs text-white focus:outline-none focus:border-[#D4AF37] resize-none"
                />

                {importError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {importSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{importSuccess}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportExportModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyImport}
                    className="px-5 py-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-xs font-bold text-white shadow-md shadow-[#E50914]/25 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Validate & Apply Plan</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VERSION HISTORY MODAL (LAST 5 SAVES) */}
      {/* ============================================================ */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#15151C] border border-zinc-800 rounded-3xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold">Version History (Last 5 Saves)</h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#A1A1AA]">
              Restore an earlier version of Screen {selectedScreenId}'s seat plan if you made an unintended change.
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {versionHistory.map((item, idx) => {
                const totalS = item.rows.reduce((sum, r) => sum + r.seats.length, 0);

                return (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#0B0B0F] border border-zinc-800 rounded-2xl flex items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-xs text-white block">
                        Saved: {formatTime(item.updatedAt)} • {formatDay(item.updatedAt, 'short')}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {item.rows.length} rows • {totalS} seats (v{item.version || idx + 1})
                      </span>
                    </div>

                    <button
                      onClick={() => handleRestoreVersion(item)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold text-xs transition-colors"
                    >
                      Restore
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
