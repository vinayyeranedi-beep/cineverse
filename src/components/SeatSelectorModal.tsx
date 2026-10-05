import React, { useState, useEffect } from 'react';
import { Film, Check, AlertTriangle } from 'lucide-react';
import { storeService } from '../services/store';

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
  const [row, setRow] = useState(currentRow || 'B');
  const [seatNum, setSeatNum] = useState(String(currentSeat || '7'));
  const [error, setError] = useState(errorMessage || '');

  const screens = storeService.getAllScreens();
  const screenKeys = Object.keys(screens).length > 0 ? Object.keys(screens) : ['1', '2', '3'];

  useEffect(() => {
    if (currentScreen) setScreen(currentScreen);
    if (currentRow) setRow(currentRow.toUpperCase());
    if (currentSeat) setSeatNum(String(currentSeat));
    if (errorMessage) setError(errorMessage);
  }, [currentScreen, currentRow, currentSeat, errorMessage]);

  if (!isOpen) return null;

  const currentConfig = storeService.getScreenConfig(screen);
  const maxSeatsInRow = currentConfig?.rowOverrides[row.toUpperCase()] || currentConfig?.seatsPerRow || 21;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRow = row.trim().toUpperCase();
    const cleanSeat = seatNum.trim();

    if (!cleanRow) {
      setError('Please enter your row letter (e.g., B)');
      return;
    }
    if (!cleanSeat || isNaN(Number(cleanSeat)) || Number(cleanSeat) < 1) {
      setError('Please enter a valid seat number (e.g., 7)');
      return;
    }

    const validation = storeService.validateSeat(screen, cleanRow, cleanSeat);
    if (!validation.valid) {
      setError(validation.reason || 'Seat not found in this screen.');
      return;
    }

    setError('');
    onSelectSeat(screen, cleanRow, cleanSeat);
  };

  const handlePickSample = (r: string, s: string) => {
    setRow(r);
    setSeatNum(s);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#15151C] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-white">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center">
            <Film className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Enter Your Cinema Seat</h2>
            <p className="text-xs text-[#A1A1AA]">
              Food & beverages are brought directly to this seat
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#E50914]/15 border border-[#E50914]/30 text-[#E50914] text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Screen Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
              Cinema Screen / Audi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {screenKeys.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setScreen(s);
                    setError('');
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all min-h-[48px] border ${
                    screen === s
                      ? 'bg-[#E50914] text-white border-[#E50914] shadow-md shadow-[#E50914]/25'
                      : 'bg-[#0B0B0F] text-[#A1A1AA] border-zinc-800 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  Screen {s}
                </button>
              ))}
            </div>
          </div>

          {/* Row and Seat inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                  Row Letter
                </label>
                <span className="text-[10px] text-[#A1A1AA]">Letter (e.g. B)</span>
              </div>
              <input
                type="text"
                value={row}
                onChange={(e) => {
                  setRow(e.target.value.toUpperCase());
                  if (error) setError('');
                }}
                placeholder="B"
                maxLength={3}
                className="w-full px-4 py-3 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-[#D4AF37] font-mono text-lg font-bold text-center uppercase focus:outline-none focus:border-[#D4AF37] min-h-[48px]"
                autoFocus
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                  Seat Number
                </label>
                <span className="text-[10px] text-[#A1A1AA]">1 to {maxSeatsInRow}</span>
              </div>
              <input
                type="number"
                min={1}
                max={maxSeatsInRow}
                value={seatNum}
                onChange={(e) => {
                  setSeatNum(e.target.value);
                  if (error) setError('');
                }}
                placeholder="7"
                className="w-full px-4 py-3 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-[#D4AF37] font-mono text-lg font-bold text-center focus:outline-none focus:border-[#D4AF37] min-h-[48px]"
              />
            </div>
          </div>

          {/* Confirmation Box */}
          <div className="p-3 rounded-xl bg-[#0B0B0F] border border-zinc-800/80 text-center">
            <span className="text-xs text-[#A1A1AA]">Delivering to: </span>
            <span className="font-mono font-bold text-[#D4AF37] text-base">
              Screen {screen} • Seat {row}{seatNum}
            </span>
          </div>

          {/* Quick Samples */}
          <div className="pt-2 border-t border-zinc-800/80">
            <span className="block text-[11px] text-[#A1A1AA] mb-2 font-medium">
              Quick pick sample seat:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { r: 'B', s: '7' },
                { r: 'F', s: '12' },
                { r: 'H', s: '10' },
                { r: 'C', s: '4' },
                { r: 'D', s: '9' },
                { r: 'E', s: '14' },
              ].map((item) => (
                <button
                  key={`${item.r}${item.s}`}
                  type="button"
                  onClick={() => handlePickSample(item.r, item.s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                    row === item.r && seatNum === item.s
                      ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]'
                      : 'bg-[#0B0B0F] text-[#A1A1AA] border-zinc-800 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {item.r}{item.s}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3">
            {canClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 text-[#A1A1AA] hover:text-white hover:bg-zinc-800 text-sm font-semibold transition-all min-h-[48px]"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-[#E50914] hover:bg-[#c80812] text-white font-bold text-sm shadow-lg shadow-[#E50914]/25 transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Confirm Seat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
