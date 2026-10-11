import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { storeService } from '../services/store';
import { CinemaBranding } from '../types';
import { CineverseLogo } from './CineverseLogo';

interface BrandLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrandLogoModal: React.FC<BrandLogoModalProps> = ({ isOpen, onClose }) => {
  const [branding, setBranding] = useState<CinemaBranding>(() => storeService.getCinemaBranding());
  const [logoPreview, setLogoPreview] = useState<string | null>(branding.logoUrl);
  const [cinemaName, setCinemaName] = useState(branding.name || 'Cineverse');
  const [cinemaSubtitle, setCinemaSubtitle] = useState(branding.subtitle || 'MULTIPLEX');
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const current = storeService.getCinemaBranding();
      setBranding(current);
      setLogoPreview(current.logoUrl);
      setCinemaName(current.name || 'Cineverse');
      setCinemaSubtitle(current.subtitle || 'MULTIPLEX');
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlApply = () => {
    if (!urlInput.trim()) return;
    setLogoPreview(urlInput.trim());
  };

  const handleSave = () => {
    storeService.setCinemaBranding({
      name: cinemaName.trim() || 'Cineverse',
      subtitle: cinemaSubtitle.trim() || 'MULTIPLEX',
      logoUrl: logoPreview,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleResetToDefault = () => {
    storeService.resetCinemaBranding();
    setLogoPreview(null);
    setCinemaName('Cineverse');
    setCinemaSubtitle('MULTIPLEX');
    setUrlInput('');
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#15151C] border border-[#D4AF37]/50 rounded-3xl shadow-2xl p-5 sm:p-7 text-white my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-black text-white flex items-center gap-2">
                Cinema Logo & Brand Customizer
                <span className="text-[10px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                  OFFICIAL
                </span>
              </h2>
              <p className="text-xs text-[#A1A1AA]">
                Apply your authentic cinema logo everywhere across the app in real time.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Banner: Why previous chat file couldn't be auto-saved */}
        <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200/90 leading-relaxed">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">Format Notice: </span>
            Chat uploads in the browser sandbox cannot directly write binary files into the server. You can upload your exact original logo file right here (PNG, JPG, SVG, WebP) to display it with 100% precision!
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
          {/* Left Column: Upload or Link */}
          <div className="space-y-4">
            {/* Mode Tabs */}
            <div className="flex items-center gap-1 bg-[#0B0B0F] p-1 rounded-xl border border-zinc-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'upload'
                    ? 'bg-[#D4AF37] text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'url'
                    ? 'bg-[#D4AF37] text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Image URL</span>
              </button>
            </div>

            {/* Upload Area */}
            {activeTab === 'upload' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-[#D4AF37] rounded-2xl p-6 text-center cursor-pointer transition-all bg-[#0B0B0F]/60 hover:bg-[#0B0B0F] group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 group-hover:bg-[#D4AF37]/20 text-zinc-400 group-hover:text-[#D4AF37] flex items-center justify-center mx-auto mb-3 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-white group-hover:text-[#D4AF37] transition-colors">
                  Click to select logo file
                </div>
                <div className="text-xs text-[#A1A1AA] mt-1">
                  Supports PNG (transparent recommended), JPG, SVG, WebP
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full border border-[#D4AF37]/20">
                  <FileCheck className="w-3 h-3" />
                  <span>Direct Browser Processing</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-[#0B0B0F] p-4 rounded-2xl border border-zinc-800">
                <label className="text-xs font-bold text-zinc-300">Image Web Address / URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    onClick={handleUrlApply}
                    className="px-3 py-2 rounded-xl bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#FFE79A] transition-colors"
                  >
                    Load
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Paste any public direct link to your PNG, JPG, or SVG image.
                </p>
              </div>
            )}

            {/* Cinema Text Names */}
            <div className="space-y-3 bg-[#0B0B0F] p-4 rounded-2xl border border-zinc-800">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Cinema Name</label>
                <input
                  type="text"
                  value={cinemaName}
                  onChange={(e) => setCinemaName(e.target.value)}
                  placeholder="Cineverse"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={cinemaSubtitle}
                  onChange={(e) => setCinemaSubtitle(e.target.value)}
                  placeholder="MULTIPLEX"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Previews */}
          <div className="space-y-4 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Real-Time Live Previews</span>
              </div>

              {/* 1. Header Preview */}
              <div className="bg-[#0B0B0F] p-4 rounded-2xl border border-zinc-800 mb-3">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">
                  Top Navbar Bar View
                </div>
                <div className="h-14 bg-[#15151C] rounded-xl px-4 flex items-center border border-zinc-800">
                  <CineverseLogo
                    size="sm"
                    customLogoUrl={logoPreview}
                    customName={cinemaName}
                    subtitle={cinemaSubtitle}
                  />
                </div>
              </div>

              {/* 2. Splash / Large View */}
              <div className="bg-[#0B0B0F] p-5 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-3">
                  Splash Screen / Welcome View
                </div>
                <CineverseLogo
                  layout="vertical"
                  size="lg"
                  customLogoUrl={logoPreview}
                  customName={cinemaName}
                  subtitle={cinemaSubtitle}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={handleResetToDefault}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>

              <button
                onClick={handleSave}
                disabled={savedSuccess}
                className={`flex-1 w-full py-3 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg min-h-[44px] ${
                  savedSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#D4AF37] hover:bg-[#FFE79A] text-black shadow-[#D4AF37]/25'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Saved & Applied Everywhere!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Apply Logo Everywhere</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
