import React, { useState } from 'react';
import {
  X,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Film,
  Sparkles,
} from 'lucide-react';
import { storeService } from '../services/store';
import { UserProfile } from '../types';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  isDemoMode?: boolean;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isDemoMode = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your staff email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }
    if (password.length < 4) {
      setErrorMessage('Invalid password. Passwords must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await storeService.login(cleanEmail, password);
      setIsLoading(false);
      onLoginSuccess(user);
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      setErrorMessage(msg);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('staff123');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog: Bottom sheet on mobile, centered card on desktop */}
      <div
        className="relative w-full sm:max-w-md bg-[#15151C] border border-[#D4AF37]/50 rounded-t-3xl sm:rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden z-10 transition-all text-white p-6 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-login-title"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center shadow-lg shadow-[#D4AF37]/10">
              <Lock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 id="staff-login-title" className="text-xl font-bold tracking-tight text-white">
                Staff Login
              </h2>
              <p className="text-[11px] text-[#A1A1AA]">
                Cinema kitchen display & management portal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-zinc-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. staff@seatserve.cinema"
              autoComplete="email"
              required
              disabled={isLoading}
              className="w-full px-3.5 py-3 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37] min-h-[46px] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={isLoading}
                className="w-full px-3.5 py-3 pr-11 bg-[#0B0B0F] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37] min-h-[46px] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Red Login Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] font-bold text-xs sm:text-sm text-white shadow-lg shadow-[#E50914]/25 transition-all flex items-center justify-center gap-2 min-h-[48px] active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </div>
        </form>

        {/* Quick Demo Credentials Helper */}
        {isDemoMode && (
          <div className="mt-5 pt-4 border-t border-zinc-800/80">
            <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider block mb-2 font-semibold">
              Demo Quick-Fill:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleFillDemo('staff@seatserve.cinema')}
                className="px-2.5 py-1.5 rounded-lg bg-[#0B0B0F] hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors text-left"
              >
                <span className="block font-bold text-[#D4AF37]">Counter Staff</span>
                <span className="text-[9px] text-[#A1A1AA] block truncate">staff@seatserve.cinema</span>
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('admin@seatserve.cinema')}
                className="px-2.5 py-1.5 rounded-lg bg-[#0B0B0F] hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors text-left"
              >
                <span className="block font-bold text-rose-400">Admin</span>
                <span className="text-[9px] text-[#A1A1AA] block truncate">admin@seatserve.cinema</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
