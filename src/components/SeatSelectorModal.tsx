import React, { useState, useEffect, useMemo } from 'react';
import { Film, Check, AlertTriangle, X, Sparkles } from 'lucide-react';
import { storeService } from '../services/store';
import { ScreenGridConfig, SeatMapConfig, SeatMapRow, SeatMapSeat, SeatType } from '../types';
import { createDefaultSeatMap } from '../lib/seatMapDefaults';

interface SeatSelectorModalProps {
  isOpen: boolean;
  currentScreen?: string;
  currentRow?: string;
  currentSeat?: string;
  errorMessage?: string;
  onSelectSeat: (screen: string, row: string, seat: string) => void;
  onClose?: () => void;
  canClose?: boolean;
}

export const SeatSelectorModal: React.FC<SeatSelectorModalProps> = ({
  isOpen,
  currentScreen = '1',
  currentRow = 'B',
  currentSeat = '7',
  errorMessage = '',
  onSelectSeat,
  onClose,
  canClose = true,
}) => {
  const [screen, setScreen] = useState(currentScreen || '1');
  const [selectedRow, setSelectedRow] = useState(currentRow || 'B');
  const [selectedCol, setSelectedCol] = useState(String(currentSeat || '7'));
  const [error, setError] = useState(errorMessage || '');

  const [screensMap, setScreensMap] = useState<Record<string, ScreenGridConfig>>(() =>
    storeService.getAllScreens()
  );

  useEffect(() => {
    const unsub = storeService.subscribeScreens((sc) => setScreensMap(sc));
    return () => unsub();
  }, []);

  const screenKeys = useMemo(() => {
    const keys = Object.keys(screensMap);
    return keys.length > 0 ? keys : ['1', '2', '3'];
  }, [screensMap]);

  useEffect(() => {
    if (currentScreen) setScreen(currentScreen);
    if (currentRow) setSelectedRow(currentRow.toUpperCase());
    if (currentSeat) setSelectedCol(String(currentSeat));
    if (errorMessage) setError(errorMessage);
  }, [currentScreen, currentRow, currentSeat, errorMessage]);

  // Current active screen config & seatMap
  const activeScreenConfig = screensMap[screen] || {
    id: `screen-${screen}`,
    name: `Screen ${screen}`,
    screenNumber: screen,
    rowsCount: 10,
    seatsPerRow: 20,
    rowOverrides: {},
    aisleGaps: [6, 14],
    disabledSeats: [],
  };

  const activeSeatMap: SeatMapConfig = useMemo(() => {
    return activeScreenConfig.seatMap || createDefaultSeatMap(screen);
  }, [activeScreenConfig, screen]);

  // Max X coordinate in active seat map for accurate positioning
  const maxX = useMemo(() => {
    let max = 22;
    activeSeatMap.rows.forEach((r) => {
      r.seats.forEach((s) => {
        if (s.x > max) max = s.x;
      });
    });
    return max + 2;
  }, [activeSeatMap]);

  if (!isOpen) return null;

  // Selected seat object
  const activeSelectedSeatObj = useMemo(() => {
    const targetRow = activeSeatMap.rows.find(
      (r) => r.row.toUpperCase() === selectedRow.toUpperCase()
    );
    if (!targetRow) return null;
    return targetRow.seats.find(
      (s) => String(s.col) === String(selectedCol) || s.label === `${selectedRow}${selectedCol}`
    );
  }, [activeSeatMap, selectedRow, selectedCol]);

  const handleSeatClick = (rowLetter: string, seatItem: SeatMapSeat) => {
    setSelectedRow(rowLetter);
    setSelectedCol(String(seatItem.col));
    setError('');
  };

  const handleConfirmSeat = () => {
    const cleanRow = selectedRow.trim().toUpperCase();
    const cleanSeat = selectedCol.trim();

    if (!cleanRow || !cleanSeat) {
      setError('Please tap a seat to select your position.');
      return;
    }

    const validation = storeService.validateSeat(screen, cleanRow, cleanSeat);
    if (!validation.valid) {
      setError(validation.reason || 'Seat not found in this cinema hall.');
      return;
    }

    setError('');
    onSelectSeat(screen, cleanRow, cleanSeat);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#15151C] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-7 text-white space-y-5 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center">
              <Film className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-extrabold text-white">
                Select Your Seat
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Tap your exact seat on the cinema hall plan to order food & drinks
              </p>
            </div>
          </div>

          {canClose && onClose && (
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-2xl bg-[#E50914]/15 border border-[#E50914]/30 text-[#E50914] text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Screen Selection Pills */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 bg-[#0B0B0F] p-2.5 rounded-2xl border border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
              Cinema Screen:
            </span>
            {screenKeys.map((s) => {
              const cfg = screensMap[s];
              const isSelected = screen === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setScreen(s);
                    setError('');
                  }}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? 'bg-[#E50914] text-white border-[#E50914] shadow-md shadow-[#E50914]/30'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  {cfg?.name || `Screen ${s}`}
                </button>
              );
            })}
          </div>

          {/* Seat classification legend */}
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-zinc-800 border border-zinc-700" />
              <span>Standard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-950/60 border border-[#D4AF37]" />
              <span className="text-[#D4AF37]">Premium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-950/60 border border-purple-500" />
              <span className="text-purple-300">Recliner</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-950/60 border border-blue-400" />
              <span className="text-blue-300">Wheelchair</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAPPABLE SEAT MAP CANVAS */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-[300px] max-h-[460px] p-4 bg-[#0B0B0F] border border-zinc-800/80 rounded-2xl relative space-y-6">
          {/* CURVED SCREEN INDICATOR */}
          <div className="max-w-md mx-auto text-center space-y-1 pt-2">
            <div className="relative">
              <div className="h-6 w-full bg-gradient-to-b from-[#D4AF37]/20 via-[#D4AF37]/5 to-transparent rounded-t-[60px] blur-[2px]" />
              <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent rounded-full shadow-[0_0_12px_rgba(212,175,55,0.6)]" />
            </div>
            <span className="text-[10px] font-display font-black tracking-[0.25em] text-[#D4AF37] uppercase">
              SCREEN THIS WAY
            </span>
          </div>

          {/* REAL SEATING ROWS */}
          <div className="min-w-[680px] space-y-2.5 pb-4">
            {activeSeatMap.rows.map((rowItem) => (
              <div key={rowItem.row} className="flex items-center gap-2">
                {/* Left Row Letter */}
                <span className="w-6 text-center font-display font-black text-xs text-[#D4AF37] shrink-0">
                  {rowItem.row}
                </span>

                {/* Seats Row */}
                <div className="flex-1 relative h-9 flex items-center bg-zinc-950/40 rounded-xl px-2 border border-zinc-900">
                  {rowItem.seats.map((seatItem) => {
                    const isChosen =
                      rowItem.row.toUpperCase() === selectedRow.toUpperCase() &&
                      String(seatItem.col) === String(selectedCol);

                    let typeClasses = 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500';
                    if (seatItem.type === 'premium') {
                      typeClasses = 'bg-amber-950/50 border-[#D4AF37] text-[#D4AF37]';
                    } else if (seatItem.type === 'recliner') {
                      typeClasses = 'bg-purple-950/60 border-purple-500 text-purple-300';
                    } else if (seatItem.type === 'wheelchair') {
                      typeClasses = 'bg-blue-950/60 border-blue-400 text-blue-300';
                    } else if (seatItem.type === 'couple') {
                      typeClasses = 'bg-rose-950/60 border-rose-400 text-rose-300';
                    }

                    return (
                      <button
                        key={seatItem.label}
                        type="button"
                        onClick={() => handleSeatClick(rowItem.row, seatItem)}
                        style={{
                          position: 'absolute',
                          left: `${(seatItem.x / maxX) * 100}%`,
                          width: seatItem.type === 'couple' ? '40px' : '28px',
                        }}
                        className={`h-7 rounded-md font-mono text-[10px] font-bold border transition-all flex items-center justify-center ${
                          isChosen
                            ? 'bg-[#D4AF37] text-zinc-950 border-white ring-4 ring-[#D4AF37]/60 scale-125 z-20 shadow-xl shadow-[#D4AF37]/50 font-black'
                            : `${typeClasses} hover:scale-110 active:scale-95`
                        }`}
                        title={`Seat ${seatItem.label} (${seatItem.type})`}
                      >
                        {seatItem.col}
                      </button>
                    );
                  })}
                </div>

                {/* Right Row Letter */}
                <span className="w-6 text-center font-display font-black text-xs text-[#D4AF37] shrink-0">
                  {rowItem.row}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Confirmation Bar */}
        <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">Chosen Seat:</span>
            <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-[#D4AF37]/40 flex items-center gap-2">
              <span className="font-display font-black text-sm text-[#D4AF37]">
                Screen {screen} • {selectedRow}{selectedCol}
              </span>
              {activeSelectedSeatObj && (
                <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded">
                  {activeSelectedSeatObj.type}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmSeat}
            className="py-3 px-6 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-display font-black text-xs tracking-wide shadow-lg shadow-[#E50914]/30 flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & View Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
