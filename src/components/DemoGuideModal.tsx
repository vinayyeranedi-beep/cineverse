import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Film,
  Sparkles,
  Database,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Play,
  RotateCcw,
} from 'lucide-react';
import { storeService } from '../services/store';

interface DemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSeat: (screen: string, seat: string) => void;
  isDemoMode: boolean;
}

export const DemoGuideModal: React.FC<DemoGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectSeat,
  isDemoMode,
}) => {
  const [activeTab, setActiveTab] = useState<'demo' | 'firebase' | 'rules' | 'checklist'>('demo');
  const [copiedRules, setCopiedRules] = useState(false);

  // Firebase Config Form
  const savedCfg = storeService.getSavedFirebaseConfig();
  const [apiKey, setApiKey] = useState(savedCfg?.apiKey || '');
  const [projectId, setProjectId] = useState(savedCfg?.projectId || '');
  const [authDomain, setAuthDomain] = useState(savedCfg?.authDomain || '');
  const [configSavedMsg, setConfigSavedMsg] = useState('');

  if (!isOpen) return null;

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) {
      alert('Please provide at least API Key and Project ID');
      return;
    }
    storeService.saveFirebaseConfig({
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
    });
    setConfigSavedMsg('Firebase configuration saved! App will now connect to your live Firestore.');
    setTimeout(() => setConfigSavedMsg(''), 4000);
  };

  const handleRevertToDemo = () => {
    storeService.saveFirebaseConfig(null);
    setApiKey('');
    setProjectId('');
    setAuthDomain('');
    setConfigSavedMsg('Switched to in-memory Demo Mode with sample cinema data.');
    setTimeout(() => setConfigSavedMsg(''), 4000);
  };

  const firestoreRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isStaffOrAdmin() {
      return isSignedIn() && (
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['staff', 'admin'])
      );
    }

    function isAdmin() {
      return isSignedIn() && (
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
    }

    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$');
    }

    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }

    // Menu Items: Customers browse, Admin edits
    match /menuItems/{menuItemId} {
      allow read: if true;
      allow create, update, delete: if isValidId(menuItemId) && isAdmin();
    }

    // Screens: Layout details for Screen 1, 2, 3
    // Customers can read to validate seat coordinates
    // Only admins can write/save screen layouts
    match /screens/{screenId} {
      allow read: if isValidId(screenId);
      allow write: if isValidId(screenId) && isAdmin();
    }

    // Orders: Cinema seat patrons create, staff advance status
    match /orders/{orderId} {
      allow read: if isValidId(orderId);
      allow create: if isValidId(orderId);
      allow update: if isValidId(orderId) && isStaffOrAdmin() &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt']);
      allow delete: if isValidId(orderId) && isAdmin();
    }

    match /users/{userId} {
      allow read: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow write: if isAdmin();
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(firestoreRulesText);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">SeatBite Guide & Setup</h2>
              <p className="text-xs text-zinc-400">
                Live demo script, pre-flight test checklist & Firebase configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-2 bg-zinc-950/60 border-b border-zinc-800 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('demo')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'demo'
                ? 'bg-amber-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🎬 2-Minute Demo Script
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'checklist'
                ? 'bg-amber-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ✅ Pre-Demo Checklist
          </button>
          <button
            onClick={() => setActiveTab('firebase')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'firebase'
                ? 'bg-amber-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🔥 Firebase Setup
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-amber-500 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🛡️ Security Rules
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm">
          {/* TAB 1: 2-MINUTE DEMO SCRIPT */}
          {activeTab === 'demo' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                <span className="font-bold text-amber-400 block mb-1">
                  How to present this in your live demo:
                </span>
                Open two browser windows side-by-side (or your laptop and mobile phone). Window 1 is the <strong>Customer Phone</strong> and Window 2 is the <strong>Kitchen Staff Counter</strong>.
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      Scan or Open the Seat URL
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Show how the QR code automatically opens with the seat pre-selected: <span className="text-amber-400 font-mono">Screen 2 • Seat F12</span>.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          onSelectSeat('2', 'F12');
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-mono font-medium border border-zinc-700"
                      >
                        Try Screen 2 • F12
                      </button>
                      <button
                        onClick={() => {
                          onSelectSeat('1', 'C4');
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-mono font-medium border border-zinc-700"
                      >
                        Try Screen 1 • C4
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      Browse Food & Add to Floating Cart
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Browse Popcorn, Cold Coke, and Loaded Nachos. Tap Add (+ / -). The floating cart updates with item count and rupee total.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      Place Order with Cinema Delivery Note
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Open cart, type note (e.g. "less salt on popcorn"), and press "Place Order for Seat F12".
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 font-bold flex items-center justify-center shrink-0 text-xs">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      Kitchen Chimes & Giant Seat Badge Highlights
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Switch to the Staff tab. The kitchen double chime rings and <span className="text-amber-400 font-bold">SEAT F12</span> pulses in bold yellow at the top of the counter queue.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 font-bold flex items-center justify-center shrink-0 text-xs">
                    5
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      Live Real-Time Status Updates
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Staff clicks: <strong>Start Preparing</strong> &rarr; <strong>Mark Ready for Delivery</strong> &rarr; <strong>Delivered</strong>. Watch the customer phone progress without any refresh!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRE-DEMO CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm">Pre-Flight Test Checklist</h4>
              <p className="text-xs text-zinc-400">
                Confirm these 6 points before your demonstration:
              </p>

              <div className="space-y-2">
                {[
                  'Test audio output: Click the speaker icon in navbar or "Test Sound" button in staff dashboard.',
                  'Verify seat reading: Ensure "?screen=2&seat=F12" in URL correctly populates the seat header.',
                  'Test manual seat modal: Click "Change" in header and input seat "D7", confirm it updates.',
                  'Test single active order limit: Once an order is placed, verify the banner prevents duplicate overlapping orders for that seat until delivered.',
                  'Test Cross-Tab Sync: Open two browser windows (one customer, one staff) to demonstrate real-time sync.',
                  'Test QR Generator: Go to "QR Studio", generate batch, and verify printable sticker preview.',
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-zinc-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FIREBASE SETUP */}
          {activeTab === 'firebase' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  Connect Real Firebase Project (Optional)
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  The app currently runs in <strong>Demo Mode</strong> with in-memory persistence and cross-tab sync. If you want to connect a live Firebase project, paste your Web App config credentials below:
                </p>

                {configSavedMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                    {configSavedMsg}
                  </div>
                )}

                <form onSubmit={handleSaveFirebaseConfig} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                      API Key
                    </label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Project ID
                      </label>
                      <input
                        type="text"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        placeholder="seatbite-cinema-demo"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        Auth Domain
                      </label>
                      <input
                        type="text"
                        value={authDomain}
                        onChange={(e) => setAuthDomain(e.target.value)}
                        placeholder="seatbite-cinema-demo.firebaseapp.com"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow"
                    >
                      Connect Firebase
                    </button>
                    <button
                      type="button"
                      onClick={handleRevertToDemo}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700 font-semibold"
                    >
                      Reset to Demo
                    </button>
                  </div>
                </form>
              </div>

              {/* Step by Step instructions */}
              <div className="space-y-2 text-xs text-zinc-400">
                <h5 className="font-bold text-zinc-200">How to create a Firebase Project:</h5>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Go to <strong>console.firebase.google.com</strong> and click "Add Project".</li>
                  <li>In Project Overview, add a <strong>Web App (&lt;/&gt;)</strong> and copy the config.</li>
                  <li>Click <strong>Firestore Database</strong> &rarr; "Create Database" in test/production mode.</li>
                  <li>Click <strong>Authentication</strong> &rarr; "Get Started" &rarr; enable <strong>Email/Password</strong>.</li>
                  <li>Add a staff user: <span className="font-mono text-zinc-300">staff@seatbite.cinema</span> with a password.</li>
                  <li>Go to Firestore &rarr; Rules tab and paste the security rules provided in the next tab.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Firestore Security Rules
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Paste these into your Firebase Console &rarr; Firestore &rarr; Rules
                  </p>
                </div>
                <button
                  onClick={copyRules}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center gap-1.5"
                >
                  {copiedRules ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRules ? 'Copied!' : 'Copy Rules'}</span>
                </button>
              </div>

              <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-80 leading-relaxed">
                {firestoreRulesText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <span className="text-xs text-zinc-500">SeatBite v1.0 • Cinema QR Food Ordering</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
          >
            Got it, Let's Demo
          </button>
        </div>
      </div>
    </div>
  );
};
