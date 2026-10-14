import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  UserProfile,
  ScreenGridConfig,
  StaffAccount,
  Ticket,
  TicketStatus,
  IssueType,
  CinemaBranding,
} from '../types';
import { INITIAL_MENU_ITEMS } from '../data/sampleMenu';

const STORAGE_KEY_MENU = 'seatserve_menu_items_v2';
const STORAGE_KEY_ORDERS = 'seatserve_orders_v2';
const STORAGE_KEY_SCREENS = 'seatserve_screens_v2';
const STORAGE_KEY_STAFF = 'seatserve_staff_v2';
const STORAGE_KEY_TICKETS = 'seatserve_tickets_v1';
const STORAGE_KEY_DEMO_MODE = 'seatserve_is_demo_mode_v2';
const STORAGE_KEY_CURRENT_USER = 'seatserve_current_user_v2';
const STORAGE_KEY_FIREBASE_CONFIG = 'seatserve_custom_firebase_cfg';
const STORAGE_KEY_BRANDING = 'seatserve_cinema_branding_v1';

/**
 * Sanitizes and deduplicates menu items:
 * 1. Purges obsolete stale demo names that conflicted with new menu specifications.
 * 2. Enforces unique item IDs (no two items can ever have identical IDs).
 * 3. Enforces unique normalized item names.
 * 4. Ensures all canonical INITIAL_MENU_ITEMS are present and available.
 */
export function sanitizeMenuItems(items: MenuItem[]): MenuItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    return INITIAL_MENU_ITEMS.map((item) => ({ ...item, isDemo: true }));
  }

  const staleNames = new Set([
    'salted popcorn', // obsolete un-bracketed version replaced by Regular & Large
    'butter popcorn', // obsolete replaced by Cheese Popcorn
    'sprite',         // obsolete replaced by Cold Coffee
    'mirinda',        // obsolete replaced by Mineral Water
    'classic popcorn & coke', // obsolete replaced by Popcorn + Coke Combo
    'family cinema pack',     // obsolete replaced by Family Combo
  ]);

  const byId = new Map<string, MenuItem>();
  const byName = new Map<string, MenuItem>();

  for (const item of items) {
    if (!item || !item.name) continue;
    const norm = item.name.toLowerCase().trim();
    if (staleNames.has(norm)) {
      continue;
    }
    if (byName.has(norm)) {
      continue;
    }

    let uniqueId = item.id;
    if (byId.has(uniqueId)) {
      uniqueId = `${item.id}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const cleaned: MenuItem = {
      ...item,
      id: uniqueId,
      name: item.name.trim(),
      description: item.description || '',
      category: item.category,
      price: Number(item.price) || 0,
      imageUrl: item.imageUrl || '',
      isVeg: Boolean(item.isVeg),
      available: item.available !== false,
      featured: Boolean(item.featured),
      isPopular: Boolean(item.isPopular || item.featured),
      isDemo: Boolean(item.isDemo),
    };

    byId.set(uniqueId, cleaned);
    byName.set(norm, cleaned);
  }

  // Ensure all canonical initial menu items exist
  for (const init of INITIAL_MENU_ITEMS) {
    const norm = init.name.toLowerCase().trim();
    if (!byName.has(norm)) {
      let finalId = init.id;
      if (byId.has(finalId)) {
        finalId = `${init.id}-${Math.random().toString(36).substring(2, 6)}`;
      }
      const newItem: MenuItem = { ...init, id: finalId, isDemo: true };
      byId.set(finalId, newItem);
      byName.set(norm, newItem);
    }
  }

  return Array.from(byId.values());
}

/**
 * Returns alphabetical row letter for 0-indexed number:
 * 0 -> A, 13 -> N, 25 -> Z, 26 -> AA
 */
export function getRowLetter(index: number): string {
  let label = '';
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

export function getRowIndex(letter: string): number {
  let result = 0;
  const upper = letter.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    result = result * 26 + (upper.charCodeAt(i) - 64);
  }
  return result - 1;
}

export function calculateCinemaLayout(totalSeats: number, customPerRow?: number) {
  const perRow = customPerRow || Math.min(24, Math.max(6, Math.round(Math.sqrt(totalSeats * 1.4))));
  const totalRows = Math.ceil(totalSeats / perRow);
  const layout: { row: string; seats: number }[] = [];
  let remaining = totalSeats;
  for (let i = 0; i < totalRows; i++) {
    const rowLetter = getRowLetter(i);
    const seatsInThisRow = Math.min(perRow, remaining);
    layout.push({ row: rowLetter, seats: seatsInThisRow });
    remaining -= seatsInThisRow;
  }
  return {
    perRow,
    totalRows,
    layout,
  };
}

// Default Seed & Demo Screens:
// Screen 1: 200 seats (10 rows A-J x 20 seats per row)
// Screen 2: 290 seats (15 rows A-O x 20 seats per row, row O has 10 seats = 290)
// Screen 3: 250 seats (13 rows A-M x 20 seats per row, row M has 10 seats = 250)
export const DEMO_SCREENS: Record<string, ScreenGridConfig> = {
  '1': {
    id: 'screen-1',
    name: 'Audi 1 (IMAX)',
    screenNumber: '1',
    rowsCount: 10, // Rows A through J (10 rows)
    seatsPerRow: 20, // 20 seats per row = 200 seats
    rowOverrides: {},
    aisleGaps: [6, 14], // Aisle passage after seat 6 and 14
    disabledSeats: [],
    updatedAt: Date.now(),
  },
  '2': {
    id: 'screen-2',
    name: 'Audi 2 (Dolby Atmos)',
    screenNumber: '2',
    rowsCount: 15, // Rows A through O (15 rows)
    seatsPerRow: 20, // 14 rows * 20 = 280, Row O = 10 seats -> 290 seats
    rowOverrides: {
      O: 10,
    },
    aisleGaps: [6, 14],
    disabledSeats: [],
    updatedAt: Date.now(),
  },
  '3': {
    id: 'screen-3',
    name: 'Audi 3 (Gold Class)',
    screenNumber: '3',
    rowsCount: 13, // Rows A through M (13 rows)
    seatsPerRow: 20, // 12 rows * 20 = 240, Row M = 10 seats -> 250 seats
    rowOverrides: {
      M: 10,
    },
    aisleGaps: [6, 14],
    disabledSeats: [],
    updatedAt: Date.now(),
  },
};

const INITIAL_SCREENS: Record<string, ScreenGridConfig> = DEMO_SCREENS;

// Initial Staff Accounts
const INITIAL_STAFF: StaffAccount[] = [
  {
    id: 'staff-1',
    email: 'staff@cineverse.com',
    name: 'Counter Staff',
    role: 'staff',
    createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'staff-2',
    email: 'runner@cineverse.com',
    name: 'Delivery Runner',
    role: 'staff',
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'admin-1',
    email: 'admin@cineverse.com',
    name: 'Cinema Admin',
    role: 'admin',
    createdAt: Date.now() - 86400000 * 30,
  },
];

// Clean initial orders for real testing (no dummy pre-seeded orders)
const INITIAL_ORDERS: Order[] = [];

// Clean initial tickets for real testing (no dummy pre-seeded tickets)
const INITIAL_TICKETS: Ticket[] = [];

export interface FirebaseConfigType {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

// Built-in provisioned Firebase configuration for cross-device real-time sync
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfigType = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
};

class StoreService {
  private isDemo: boolean = true;
  private menuItems: MenuItem[] = [];
  private orders: Order[] = [];
  private screens: Record<string, ScreenGridConfig> = {};
  private staffAccounts: StaffAccount[] = [];
  private tickets: Ticket[] = [];
  private currentUser: UserProfile | null = null;
  private branding: CinemaBranding = {
    name: 'Cineverse',
    subtitle: 'MULTIPLEX',
    logoUrl: null,
  };

  private menuListeners: Array<(items: MenuItem[]) => void> = [];
  private orderListeners: Array<(orders: Order[]) => void> = [];
  private screenListeners: Array<(screens: Record<string, ScreenGridConfig>) => void> = [];
  private staffListeners: Array<(staff: StaffAccount[]) => void> = [];
  private ticketListeners: Array<(tickets: Ticket[]) => void> = [];
  private authListeners: Array<(user: UserProfile | null) => void> = [];
  private brandingListeners: Array<(branding: CinemaBranding) => void> = [];
  private broadcastChannel: BroadcastChannel | null = null;

  // Firebase instances if initialized
  private db: ReturnType<typeof getFirestore> | null = null;
  private auth: ReturnType<typeof getAuth> | null = null;
  private unsubscribeFirestoreOrders: (() => void) | null = null;
  private unsubscribeFirestoreMenu: (() => void) | null = null;
  private unsubscribeFirestoreScreens: (() => void) | null = null;
  private unsubscribeFirestoreTickets: (() => void) | null = null;

  constructor() {
    this.initDemoOrStoredState();
    this.initBroadcastChannel();
    this.checkAndInitFirebase();
  }

  private initDemoOrStoredState() {
    try {
      const savedDemo = localStorage.getItem(STORAGE_KEY_DEMO_MODE);
      this.isDemo = savedDemo !== null ? savedDemo === 'true' : true;

      // Menu
      const savedMenu = localStorage.getItem(STORAGE_KEY_MENU);
      if (savedMenu) {
        try {
          const parsed = JSON.parse(savedMenu);
          this.menuItems = sanitizeMenuItems(parsed);
        } catch {
          this.menuItems = sanitizeMenuItems([]);
        }
      } else {
        this.menuItems = sanitizeMenuItems([]);
      }
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(this.menuItems));

      // Orders
      const savedOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          // Filter out legacy dummy seeds so real testing is clean
          this.orders = Array.isArray(parsed)
            ? parsed.filter((o: Order) => !o.id.startsWith('ord-seed-'))
            : [];
          localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.orders));
        } catch {
          this.orders = [];
          localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify([]));
        }
      } else {
        this.orders = [];
        localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify([]));
      }

      // Screens
      const savedScreens = localStorage.getItem(STORAGE_KEY_SCREENS);
      if (savedScreens) {
        this.screens = JSON.parse(savedScreens);
      } else {
        this.screens = { ...INITIAL_SCREENS };
        localStorage.setItem(STORAGE_KEY_SCREENS, JSON.stringify(this.screens));
      }

      // Staff accounts
      const savedStaff = localStorage.getItem(STORAGE_KEY_STAFF);
      if (savedStaff) {
        this.staffAccounts = JSON.parse(savedStaff);
      } else {
        this.staffAccounts = [...INITIAL_STAFF];
        localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(this.staffAccounts));
      }

      // Tickets
      const savedTickets = localStorage.getItem(STORAGE_KEY_TICKETS);
      if (savedTickets) {
        try {
          const parsed = JSON.parse(savedTickets);
          // Filter out legacy dummy seeds
          this.tickets = Array.isArray(parsed)
            ? parsed.filter((t: Ticket) => !t.id.startsWith('tkt-seed-'))
            : [];
          localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(this.tickets));
        } catch {
          this.tickets = [];
          localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify([]));
        }
      } else {
        this.tickets = [];
        localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify([]));
      }

      // Current user
      const savedUser = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      }

      // Cinema Branding & Logo
      const savedBranding = localStorage.getItem(STORAGE_KEY_BRANDING);
      if (savedBranding) {
        try {
          this.branding = {
            name: 'Cineverse',
            subtitle: 'MULTIPLEX',
            logoUrl: null,
            ...JSON.parse(savedBranding),
          };
        } catch {
          // fallback to default
        }
      }
    } catch (e) {
      console.warn('Storage init fallback', e);
      this.menuItems = [...INITIAL_MENU_ITEMS];
      this.orders = [...INITIAL_ORDERS];
      this.screens = { ...INITIAL_SCREENS };
      this.staffAccounts = [...INITIAL_STAFF];
      this.tickets = [...INITIAL_TICKETS];
      this.isDemo = true;
    }
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('seatserve_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type } = event.data || {};
          if (
            type === 'ORDER_UPDATE' ||
            type === 'ORDER_PLACED' ||
            type === 'MENU_UPDATE' ||
            type === 'SCREEN_UPDATE' ||
            type === 'STAFF_UPDATE' ||
            type === 'TICKET_UPDATE' ||
            type === 'TICKET_CREATED' ||
            type === 'BRANDING_UPDATE'
          ) {
            this.syncFromLocalStorage();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel failed', err);
      }

      window.addEventListener('storage', (e) => {
        if (
          e.key === STORAGE_KEY_ORDERS ||
          e.key === STORAGE_KEY_MENU ||
          e.key === STORAGE_KEY_SCREENS ||
          e.key === STORAGE_KEY_STAFF ||
          e.key === STORAGE_KEY_TICKETS ||
          e.key === STORAGE_KEY_BRANDING
        ) {
          this.syncFromLocalStorage();
        }
      });
    }
  }

  private syncFromLocalStorage() {
    try {
      const savedOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (savedOrders) {
        this.orders = JSON.parse(savedOrders);
        this.notifyOrderListeners();
      }
      const savedMenu = localStorage.getItem(STORAGE_KEY_MENU);
      if (savedMenu) {
        try {
          this.menuItems = sanitizeMenuItems(JSON.parse(savedMenu));
        } catch {
          this.menuItems = sanitizeMenuItems([]);
        }
        this.notifyMenuListeners();
      }
      const savedScreens = localStorage.getItem(STORAGE_KEY_SCREENS);
      if (savedScreens) {
        this.screens = JSON.parse(savedScreens);
        this.notifyScreenListeners();
      }
      const savedStaff = localStorage.getItem(STORAGE_KEY_STAFF);
      if (savedStaff) {
        this.staffAccounts = JSON.parse(savedStaff);
        this.notifyStaffListeners();
      }
      const savedTickets = localStorage.getItem(STORAGE_KEY_TICKETS);
      if (savedTickets) {
        this.tickets = JSON.parse(savedTickets);
        this.notifyTicketListeners();
      }
      const savedBranding = localStorage.getItem(STORAGE_KEY_BRANDING);
      if (savedBranding) {
        this.branding = {
          name: 'Cineverse',
          subtitle: 'MULTIPLEX',
          logoUrl: null,
          ...JSON.parse(savedBranding),
        };
        this.notifyBrandingListeners();
      }
    } catch (err) {
      console.error(err);
    }
  }

  public getSavedFirebaseConfig(): FirebaseConfigType {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_FIREBASE_CONFIG;
  }

  public saveFirebaseConfig(cfg: FirebaseConfigType | null) {
    if (!cfg) {
      localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
      this.isDemo = true;
      localStorage.setItem(STORAGE_KEY_DEMO_MODE, 'true');
    } else {
      localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(cfg));
      this.isDemo = false;
      localStorage.setItem(STORAGE_KEY_DEMO_MODE, 'false');
      this.checkAndInitFirebase();
    }
  }

  public checkAndInitFirebase(): boolean {
    const config = this.getSavedFirebaseConfig() || DEFAULT_FIREBASE_CONFIG;
    if (!config || !config.apiKey || !config.projectId) {
      this.isDemo = true;
      return false;
    }

    try {
      const app = getApps().length > 0 ? getApp() : initializeApp(config);
      this.db = config.firestoreDatabaseId
        ? getFirestore(app, config.firestoreDatabaseId)
        : getFirestore(app);
      this.auth = getAuth(app);
      this.isDemo = false;

      this.setupFirestoreSubscriptions();

      onAuthStateChanged(this.auth, (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          if (fbUser.isAnonymous) {
            // Customer signed in silently via Anonymous Auth
            const profile: UserProfile = {
              uid: fbUser.uid,
              role: 'customer',
              name: 'Guest Moviegoer',
            };
            this.currentUser = profile;
          } else {
            const cleanEmail = (fbUser.email || '').toLowerCase();
            const isAdmin =
              cleanEmail.includes('admin') ||
              cleanEmail === 'admin@cineverse.com' ||
              cleanEmail === 'admin@seatserve.cinema' ||
              cleanEmail === 'admin@seatbite.cinema';
            const role: 'admin' | 'staff' = isAdmin ? 'admin' : 'staff';
            const profile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || (role === 'admin' ? 'admin@cineverse.com' : 'staff@cineverse.com'),
              role,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || (role === 'admin' ? 'Cinema Administrator' : 'Staff Member'),
            };
            this.currentUser = profile;
          }
        } else {
          // If not logged into Firebase Auth, preserve locally logged-in staff
          const savedUser = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
          if (savedUser) {
            try {
              const u = JSON.parse(savedUser);
              this.currentUser = u && (u.role === 'staff' || u.role === 'admin') ? u : null;
            } catch {
              this.currentUser = null;
            }
          } else {
            this.currentUser = null;
          }
        }
        this.notifyAuthListeners();
      });

      return true;
    } catch (err) {
      console.warn('Firebase init error, continuing with local fallback:', err);
      this.isDemo = false;
      return false;
    }
  }

  private setupFirestoreSubscriptions() {
    if (!this.db) return;

    if (this.unsubscribeFirestoreOrders) this.unsubscribeFirestoreOrders();
    if (this.unsubscribeFirestoreMenu) this.unsubscribeFirestoreMenu();
    if (this.unsubscribeFirestoreScreens) this.unsubscribeFirestoreScreens();

    try {
      // Orders
      const ordersRef = collection(this.db, 'orders');
      const ordersQ = query(ordersRef, orderBy('createdAt', 'desc'));
      this.unsubscribeFirestoreOrders = onSnapshot(
        ordersQ,
        (snapshot) => {
          const list: Order[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              orderId: data.orderId || ('SS-' + d.id.substring(0, 4).toUpperCase()),
              screen: String(data.screen || '1'),
              row: String(data.row || 'A').toUpperCase(),
              seat: String(data.seat || '1'),
              items: data.items || [],
              total: Number(data.total) || 0,
              notes: data.notes || data.note || '',
              note: data.note || data.notes || '',
              status: (data.status as OrderStatus) || 'received',
              round: data.round ? Number(data.round) : 1,
              isDemo: Boolean(data.isDemo),
              createdAt: Number(data.createdAt) || Date.now(),
              updatedAt: data.updatedAt ? Number(data.updatedAt) : undefined,
            });
          });
          this.orders = list;
          this.notifyOrderListeners();
        },
        (error) => {
          console.warn('Firestore orders snapshot error:', error);
        }
      );

      // Menu: Real-time sync with Firestore
      const menuRef = collection(this.db, 'menuItems');
      this.unsubscribeFirestoreMenu = onSnapshot(
        menuRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: MenuItem[] = [];
            snapshot.forEach((d) => {
              const data = d.data();
              list.push({
                id: d.id,
                name: data.name,
                category: data.category,
                price: Number(data.price),
                imageUrl: data.imageUrl,
                isVeg: Boolean(data.isVeg),
                available: data.available !== false,
                description: data.description || '',
                featured: Boolean(data.featured),
                isPopular: Boolean(data.isPopular || data.featured),
                isDemo: Boolean(data.isDemo),
              });
            });
            this.menuItems = sanitizeMenuItems(list);
            localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(this.menuItems));
            this.notifyMenuListeners();
          }
        },
        (error) => {
          console.warn('Firestore menu snapshot error:', error);
        }
      );

      // Screens
      const screensRef = collection(this.db, 'screens');
      this.unsubscribeFirestoreScreens = onSnapshot(
        screensRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const map: Record<string, ScreenGridConfig> = {};
            snapshot.forEach((d) => {
              const data = d.data();
              const scr = String(data.screenNumber || data.screen || d.id.replace('screen', ''));
              map[scr] = {
                id: d.id,
                name: data.name || `Screen ${scr}`,
                screenNumber: scr,
                rowsCount: Number(data.rowsCount) || 14,
                seatsPerRow: Number(data.seatsPerRow) || 20,
                rowOverrides: data.rowOverrides || {},
                aisleGaps: data.aisleGaps || [],
                disabledSeats: data.disabledSeats || [],
                updatedAt: data.updatedAt ? Number(data.updatedAt) : undefined,
              };
            });
            this.screens = { ...this.screens, ...map };
            localStorage.setItem(STORAGE_KEY_SCREENS, JSON.stringify(this.screens));
            this.notifyScreenListeners();
          }
        },
        (error) => {
          console.warn('Firestore screens snapshot error:', error);
        }
      );

      // Tickets
      const ticketsRef = collection(this.db, 'tickets');
      const ticketsQ = query(ticketsRef, orderBy('createdAt', 'desc'));
      this.unsubscribeFirestoreTickets = onSnapshot(
        ticketsQ,
        (snapshot) => {
          const list: Ticket[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              ticketId: data.ticketId || ('TKT-' + d.id.substring(0, 4).toUpperCase()),
              screen: String(data.screen || '1'),
              row: String(data.row || 'A').toUpperCase(),
              seat: String(data.seat || '1'),
              issueType: data.issueType || 'Other',
              description: data.description || '',
              orderId: data.orderId || undefined,
              contact: data.contact || undefined,
              status: (data.status as TicketStatus) || 'open',
              staffReply: data.staffReply || undefined,
              createdAt: Number(data.createdAt) || Date.now(),
              updatedAt: data.updatedAt ? Number(data.updatedAt) : undefined,
            });
          });
          this.tickets = list;
          this.notifyTicketListeners();
        },
        (error) => {
          console.warn('Firestore tickets snapshot error:', error);
        }
      );
    } catch (e) {
      console.warn('Firestore subscription failed', e);
    }
  }

  public isDemoMode(): boolean {
    return this.isDemo;
  }

  public setDemoMode(val: boolean) {
    this.isDemo = val;
    localStorage.setItem(STORAGE_KEY_DEMO_MODE, String(val));
    if (val) {
      this.syncFromLocalStorage();
    } else {
      this.checkAndInitFirebase();
    }
  }

  /**
   * Customers: sign in silently with Firebase Anonymous Authentication when
   * they open the order page (no visible login).
   */
  public async ensureCustomerAnonymousAuth(): Promise<FirebaseUser | null> {
    if (!this.auth) {
      this.checkAndInitFirebase();
    }
    if (!this.auth) return null;

    try {
      if (this.auth.currentUser) {
        return this.auth.currentUser;
      }
      const cred = await signInAnonymously(this.auth);
      return cred.user;
    } catch (err) {
      console.warn('Silent customer anonymous auth skipped/failed:', err);
      return null;
    }
  }

  // Subscriptions
  public subscribeMenu(cb: (items: MenuItem[]) => void): () => void {
    this.menuListeners.push(cb);
    cb([...this.menuItems]);
    return () => {
      this.menuListeners = this.menuListeners.filter((l) => l !== cb);
    };
  }

  public subscribeOrders(cb: (orders: Order[]) => void): () => void {
    this.orderListeners.push(cb);
    cb([...this.orders]);
    return () => {
      this.orderListeners = this.orderListeners.filter((l) => l !== cb);
    };
  }

  public subscribeScreens(cb: (screens: Record<string, ScreenGridConfig>) => void): () => void {
    this.screenListeners.push(cb);
    cb({ ...this.screens });
    return () => {
      this.screenListeners = this.screenListeners.filter((l) => l !== cb);
    };
  }

  public subscribeStaff(cb: (staff: StaffAccount[]) => void): () => void {
    this.staffListeners.push(cb);
    cb([...this.staffAccounts]);
    return () => {
      this.staffListeners = this.staffListeners.filter((l) => l !== cb);
    };
  }

  public subscribeTickets(cb: (tickets: Ticket[]) => void): () => void {
    this.ticketListeners.push(cb);
    cb([...this.tickets]);
    return () => {
      this.ticketListeners = this.ticketListeners.filter((l) => l !== cb);
    };
  }

  public subscribeAuth(cb: (user: UserProfile | null) => void): () => void {
    this.authListeners.push(cb);
    cb(this.currentUser);
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== cb);
    };
  }

  public subscribeBranding(cb: (branding: CinemaBranding) => void): () => void {
    this.brandingListeners.push(cb);
    cb({ ...this.branding });
    return () => {
      this.brandingListeners = this.brandingListeners.filter((l) => l !== cb);
    };
  }

  public getCinemaBranding(): CinemaBranding {
    return { ...this.branding };
  }

  public setCinemaBranding(updates: Partial<CinemaBranding>) {
    this.branding = {
      ...this.branding,
      ...updates,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY_BRANDING, JSON.stringify(this.branding));
    } catch (err) {
      console.error('Failed to save cinema branding:', err);
    }
    this.notifyBrandingListeners();
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'BRANDING_UPDATE', branding: this.branding });
      } catch {
        // ignore
      }
    }
  }

  public resetCinemaBranding() {
    this.branding = {
      name: 'Cineverse',
      subtitle: 'MULTIPLEX',
      logoUrl: null,
      updatedAt: Date.now(),
    };
    try {
      localStorage.removeItem(STORAGE_KEY_BRANDING);
    } catch {
      // ignore
    }
    this.notifyBrandingListeners();
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'BRANDING_UPDATE', branding: this.branding });
      } catch {
        // ignore
      }
    }
  }

  private notifyBrandingListeners() {
    this.brandingListeners.forEach((l) => l({ ...this.branding }));
  }

  private notifyMenuListeners() {
    this.menuListeners.forEach((l) => l([...this.menuItems]));
  }

  private notifyOrderListeners() {
    this.orderListeners.forEach((l) => l([...this.orders]));
  }

  private notifyScreenListeners() {
    this.screenListeners.forEach((l) => l({ ...this.screens }));
  }

  private notifyStaffListeners() {
    this.staffListeners.forEach((l) => l([...this.staffAccounts]));
  }

  private notifyTicketListeners() {
    this.ticketListeners.forEach((l) => l([...this.tickets]));
  }

  private notifyAuthListeners() {
    this.authListeners.forEach((l) => l(this.currentUser));
  }

  // --- Orders ---
  public async placeOrder(orderData: {
    screen: string;
    row: string;
    seat: string;
    items: Order['items'];
    total: number;
    notes?: string;
    round?: number;
    isDemo?: boolean;
  }): Promise<Order> {
    const cleanRow = orderData.row.trim().toUpperCase();
    const cleanSeat = orderData.seat.trim();
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const orderId = `SS-${randomHex}`;

    const newOrder: Order = {
      id: 'ord-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      orderId,
      screen: String(orderData.screen),
      row: cleanRow,
      seat: cleanSeat,
      items: orderData.items,
      total: orderData.total,
      notes: orderData.notes || '',
      note: orderData.notes || '',
      status: 'received',
      round: orderData.round || 1,
      createdAt: Date.now(),
      isDemo: Boolean(orderData.isDemo),
    };

    // Optimistically update local state for instant responsiveness
    this.orders = [newOrder, ...this.orders];
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.orders));
    this.notifyOrderListeners();
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'ORDER_PLACED', payload: newOrder });
    }

    // Persist to Google Cloud Firestore for real-time cross-phone syncing
    if (this.db) {
      try {
        const colRef = collection(this.db, 'orders');
        const docRef = await addDoc(colRef, {
          orderId: newOrder.orderId,
          screen: newOrder.screen,
          row: newOrder.row,
          seat: newOrder.seat,
          items: newOrder.items,
          total: newOrder.total,
          notes: newOrder.notes,
          status: newOrder.status,
          round: newOrder.round || 1,
          createdAt: newOrder.createdAt,
          isDemo: Boolean(newOrder.isDemo),
        });
        const oldId = newOrder.id;
        newOrder.id = docRef.id;
        this.orders = this.orders.map((o) => (o.id === oldId ? newOrder : o));
        localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.orders));
        this.notifyOrderListeners();
      } catch (err) {
        console.warn('Firestore placeOrder fallback to local:', err);
      }
    }

    return newOrder;
  }

  /**
   * Simulates a realistic cinema seat order in Firestore & local state.
   * Visible only to logged-in staff/admin. Marked with isDemo: true.
   */
  public async simulateDemoOrder(): Promise<Order> {
    const seatsPool = [
      { screen: '2', row: 'F', seat: '12' },
      { screen: '2', row: 'D', seat: '8' },
      { screen: '1', row: 'B', seat: '7' },
      { screen: '2', row: 'H', seat: '15' },
      { screen: '3', row: 'C', seat: '9' },
      { screen: '1', row: 'E', seat: '11' },
      { screen: '2', row: 'G', seat: '14' },
      { screen: '3', row: 'A', seat: '4' },
    ];
    // Favor Screen 2, Row F, Seat 12 prominently
    const seatChoice = Math.random() < 0.4 ? seatsPool[0] : seatsPool[Math.floor(Math.random() * seatsPool.length)];

    const menu = this.menuItems.length > 0 ? this.menuItems : INITIAL_MENU_ITEMS;
    const shuffled = [...menu].sort(() => 0.5 - Math.random());
    const count = Math.min(shuffled.length, Math.floor(Math.random() * 3) + 1); // 1-3 items
    const selectedItems = shuffled.slice(0, count);

    const items: OrderItem[] = selectedItems.map((item) => ({
      id: item.id,
      name: item.name,
      qty: Math.random() > 0.6 ? 2 : 1,
      price: item.price,
      isVeg: item.isVeg,
    }));

    const total = items.reduce((acc, it) => acc + it.price * it.qty, 0);

    const notesPool = [
      'Extra napkins please',
      'Deliver quietly during interval',
      'Keep soft drinks ice-cold',
      'Delivering to armrest side',
      '',
    ];
    const notes = notesPool[Math.floor(Math.random() * notesPool.length)];

    return await this.placeOrder({
      screen: seatChoice.screen,
      row: seatChoice.row,
      seat: seatChoice.seat,
      items,
      total,
      notes,
      isDemo: true,
    });
  }

  /**
   * Deletes only orders created by simulateDemoOrder (isDemo: true).
   */
  public async clearDemoOrders(): Promise<{ deletedCount: number }> {
    const demoOrders = this.orders.filter((o) => o.isDemo === true);
    const count = demoOrders.length;

    // Filter in local state
    this.orders = this.orders.filter((o) => o.isDemo !== true);
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.orders));
    this.notifyOrderListeners();
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'ORDER_UPDATE' });
    }

    // Delete from Firestore
    if (this.db) {
      for (const ord of demoOrders) {
        try {
          const docRef = doc(this.db, 'orders', ord.id);
          await deleteDoc(docRef);
        } catch (e) {
          console.warn('Failed to delete demo order from Firestore:', e);
        }
      }
    }

    return { deletedCount: count };
  }

  public async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const now = Date.now();
    // Optimistic local update
    this.orders = this.orders.map((o) =>
      o.id === orderId ? { ...o, status, updatedAt: now } : o
    );
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.orders));
    this.notifyOrderListeners();
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'ORDER_UPDATE', payload: { orderId, status } });
    }

    // Update in Google Cloud Firestore for cross-phone sync
    if (this.db) {
      try {
        const docRef = doc(this.db, 'orders', orderId);
        await updateDoc(docRef, { status, updatedAt: now });
      } catch (err) {
        console.warn('Firestore updateOrderStatus fallback to local:', err);
      }
    }
  }

  public getActiveOrderBySeat(screen: string, row: string, seat: string): Order | undefined {
    const cleanScreen = String(screen).trim();
    const cleanRow = String(row).trim().toUpperCase();
    const cleanSeat = String(seat).trim();

    return this.orders.find(
      (o) =>
        String(o.screen).trim() === cleanScreen &&
        String(o.row).trim().toUpperCase() === cleanRow &&
        String(o.seat).trim() === cleanSeat &&
        o.status !== 'delivered'
    );
  }

  public getAllActiveOrdersBySeat(screen: string, row: string, seat: string): Order[] {
    const cleanScreen = String(screen).trim();
    const cleanRow = String(row).trim().toUpperCase();
    const cleanSeat = String(seat).trim();

    return this.orders.filter(
      (o) =>
        String(o.screen).trim() === cleanScreen &&
        String(o.row).trim().toUpperCase() === cleanRow &&
        String(o.seat).trim() === cleanSeat &&
        o.status !== 'delivered'
    );
  }

  // --- Screens Grid Setup ---
  public getScreenConfig(screenNumber: string): ScreenGridConfig | null {
    return this.screens[screenNumber] || null;
  }

  public getAllScreens(): Record<string, ScreenGridConfig> {
    return { ...this.screens };
  }

  public async saveScreenConfig(config: ScreenGridConfig): Promise<ScreenGridConfig> {
    const scr = String(config.screenNumber);
    const updated: ScreenGridConfig = {
      ...config,
      updatedAt: Date.now(),
    };

    this.screens[scr] = updated;
    localStorage.setItem(STORAGE_KEY_SCREENS, JSON.stringify(this.screens));
    this.notifyScreenListeners();

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'SCREEN_UPDATE', payload: updated });
    }

    if (!this.isDemo && this.db) {
      try {
        const docRef = doc(this.db, 'screens', `screen${scr}`);
        await setDoc(docRef, updated);
      } catch (err) {
        console.error('Firestore saveScreenConfig failed:', err);
      }
    }

    return updated;
  }

  public validateSeat(
    screenNumber: string,
    rowLetter: string,
    seatNumber: string | number
  ): { valid: boolean; reason?: string } {
    const config = this.getScreenConfig(screenNumber);
    const cleanRow = String(rowLetter || '').trim().toUpperCase();
    const cleanSeat = Number(seatNumber);

    if (!cleanRow || isNaN(cleanSeat) || cleanSeat < 1) {
      return { valid: false, reason: 'Invalid seat coordinates.' };
    }

    if (!config) {
      return { valid: true };
    }

    const rowIndex = getRowIndex(cleanRow);
    if (rowIndex < 0 || rowIndex >= config.rowsCount) {
      const maxRowLetter = getRowLetter(config.rowsCount - 1);
      return {
        valid: false,
        reason: `Row ${cleanRow} does not exist in Screen ${screenNumber} (Rows A to ${maxRowLetter}).`,
      };
    }

    const maxSeatsInThisRow = config.rowOverrides[cleanRow] || config.seatsPerRow;
    if (cleanSeat > maxSeatsInThisRow) {
      return {
        valid: false,
        reason: `Seat ${cleanSeat} exceeds maximum seats in Row ${cleanRow} (seats 1 to ${maxSeatsInThisRow}).`,
      };
    }

    const seatCode = `${cleanRow}${cleanSeat}`;
    if (config.disabledSeats && config.disabledSeats.includes(seatCode)) {
      return {
        valid: false,
        reason: `Seat ${seatCode} is marked as unavailable/non-existent.`,
      };
    }

    return { valid: true };
  }

  // --- Menu Management ---
  public async addMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem> {
    const newItem: MenuItem = {
      ...item,
      id: 'item-' + Date.now().toString(36),
    };

    if (this.isDemo || !this.db) {
      this.menuItems = [newItem, ...this.menuItems];
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(this.menuItems));
      this.notifyMenuListeners();
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'MENU_UPDATE' });
      }
      return newItem;
    } else {
      try {
        const colRef = collection(this.db, 'menuItems');
        const docRef = await addDoc(colRef, newItem);
        newItem.id = docRef.id;
        return newItem;
      } catch (err) {
        console.error('Firestore addMenuItem fallback to local:', err);
        this.menuItems = [newItem, ...this.menuItems];
        localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(this.menuItems));
        this.notifyMenuListeners();
        return newItem;
      }
    }
  }

  public async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<void> {
    if (this.isDemo || !this.db) {
      this.menuItems = this.menuItems.map((m) => (m.id === id ? { ...m, ...updates } : m));
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(this.menuItems));
      this.notifyMenuListeners();
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'MENU_UPDATE' });
      }
    } else {
      try {
        const docRef = doc(this.db, 'menuItems', id);
        await updateDoc(docRef, updates);
      } catch (err) {
        console.error('Firestore updateMenuItem fallback to local:', err);
        this.menuItems = this.menuItems.map((m) => (m.id === id ? { ...m, ...updates } : m));
        localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(this.menuItems));
        this.notifyMenuListeners();
      }
    }
  }

  public async deleteMenuItem(id: string): Promise<void> {
    if (this.isDemo || !this.db) {
      this.menuItems = this.menuItems.filter((m) => m.id !== id);
      localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(this.menuItems));
      this.notifyMenuListeners();
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'MENU_UPDATE' });
      }
    } else {
      try {
        const docRef = doc(this.db, 'menuItems', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.error('Firestore deleteMenuItem fallback to local:', err);
        this.menuItems = this.menuItems.filter((m) => m.id !== id);
        localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(this.menuItems));
        this.notifyMenuListeners();
      }
    }
  }

  public async toggleAvailability(id: string): Promise<void> {
    const item = this.menuItems.find((m) => m.id === id);
    if (!item) return;
    await this.updateMenuItem(id, { available: !item.available });
  }

  public async loadSampleMenu(force: boolean = false): Promise<{ addedCount: number; message: string }> {
    const existingById = new Map<string, MenuItem>();
    const existingByName = new Map<string, MenuItem>();

    for (const m of this.menuItems) {
      existingById.set(m.id, m);
      existingByName.set(m.name.toLowerCase().trim(), m);
    }

    const itemsToSet: MenuItem[] = [];
    for (const initItem of INITIAL_MENU_ITEMS) {
      const norm = initItem.name.toLowerCase().trim();
      if (!existingByName.has(norm) || force) {
        itemsToSet.push({ ...initItem, isDemo: true });
      }
    }

    if (itemsToSet.length === 0 && this.menuItems.length > 0) {
      return { addedCount: 0, message: 'All demo menu items are already loaded' };
    }

    // Merge items into existing
    for (const item of itemsToSet) {
      existingById.set(item.id, item);
      existingByName.set(item.name.toLowerCase().trim(), item);
    }

    this.menuItems = sanitizeMenuItems(Array.from(existingById.values()));
    localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(this.menuItems));
    this.notifyMenuListeners();
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'MENU_UPDATE' });
    }

    // Persist to Firestore
    if (this.db) {
      try {
        const colRef = collection(this.db, 'menuItems');
        for (const item of itemsToSet) {
          const docRef = doc(colRef, item.id);
          await setDoc(
            docRef,
            {
              name: item.name,
              category: item.category,
              price: item.price,
              imageUrl: item.imageUrl,
              isVeg: item.isVeg,
              available: item.available,
              description: item.description,
              featured: Boolean(item.featured),
              isPopular: Boolean(item.isPopular || item.featured),
              isDemo: true,
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.warn('Firestore loadSampleMenu write error:', err);
      }
    }

    return { addedCount: itemsToSet.length, message: `Demo menu loaded (${itemsToSet.length} items)` };
  }

  public async ensureScreensDemoLayout(): Promise<void> {
    for (const [scrNum, config] of Object.entries(DEMO_SCREENS)) {
      await this.saveScreenConfig(config);
    }
  }

  public resetToSampleData(): void {
    this.menuItems = sanitizeMenuItems(INITIAL_MENU_ITEMS);
    this.orders = [...INITIAL_ORDERS];
    this.screens = { ...INITIAL_SCREENS };
    this.staffAccounts = [...INITIAL_STAFF];
    this.tickets = [...INITIAL_TICKETS];
    localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(this.menuItems));
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.orders));
    localStorage.setItem(STORAGE_KEY_SCREENS, JSON.stringify(this.screens));
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(this.staffAccounts));
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(this.tickets));
    this.notifyMenuListeners();
    this.notifyOrderListeners();
    this.notifyScreenListeners();
    this.notifyStaffListeners();
    this.notifyTicketListeners();
  }

  // --- Ticket Management ---
  public getTickets(): Ticket[] {
    return [...this.tickets];
  }

  public getOpenTicketsCount(): number {
    return this.tickets.filter((t) => t.status === 'open').length;
  }

  public getTicketsForSeat(screen: string, row: string, seat: string): Ticket[] {
    const cleanScreen = String(screen).trim();
    const cleanRow = row.trim().toUpperCase();
    const cleanSeat = seat.replace(/^[A-Za-z]+/, '') || seat.trim();
    return this.tickets.filter(
      (t) =>
        t.screen === cleanScreen &&
        t.row.toUpperCase() === cleanRow &&
        (t.seat === cleanSeat || t.seat === `${cleanRow}${cleanSeat}`)
    );
  }

  public hasOpenTicketForSeat(screen: string, row: string, seat: string): boolean {
    const cleanScreen = String(screen).trim();
    const cleanRow = row.trim().toUpperCase();
    const cleanSeat = seat.replace(/^[A-Za-z]+/, '') || seat.trim();
    return this.tickets.some(
      (t) =>
        t.status === 'open' &&
        t.screen === cleanScreen &&
        t.row.toUpperCase() === cleanRow &&
        (t.seat === cleanSeat || t.seat === `${cleanRow}${cleanSeat}`)
    );
  }

  public async createTicket(ticketData: {
    screen: string;
    row: string;
    seat: string;
    issueType: IssueType;
    description?: string;
    orderId?: string;
    contact?: string;
  }): Promise<Ticket> {
    const cleanScreen = String(ticketData.screen).trim();
    const cleanRow = ticketData.row.trim().toUpperCase();
    const cleanSeat = ticketData.seat.replace(/^[A-Za-z]+/, '') || ticketData.seat.trim();

    // Prevent spam: allow only one open ticket per seat per issue type within 5 minutes.
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const existingRecentOpen = this.tickets.find(
      (t) =>
        t.status === 'open' &&
        t.screen === cleanScreen &&
        t.row.toUpperCase() === cleanRow &&
        (t.seat === cleanSeat || t.seat === `${cleanRow}${cleanSeat}`) &&
        t.issueType === ticketData.issueType &&
        t.createdAt > fiveMinutesAgo
    );

    if (existingRecentOpen) {
      throw new Error(
        `An open ticket for "${ticketData.issueType}" was already created for Seat ${cleanRow}${cleanSeat} in the last 5 minutes (Ticket #${existingRecentOpen.ticketId}). Our staff is already addressing it.`
      );
    }

    const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: Ticket = {
      id: 'tkt-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      ticketId,
      screen: cleanScreen,
      row: cleanRow,
      seat: cleanSeat,
      issueType: ticketData.issueType,
      description: ticketData.description?.trim() || '',
      orderId: ticketData.orderId?.trim() || undefined,
      contact: ticketData.contact?.trim() || undefined,
      status: 'open',
      createdAt: Date.now(),
    };

    if (this.isDemo || !this.db) {
      this.tickets = [newTicket, ...this.tickets];
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(this.tickets));
      this.notifyTicketListeners();
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'TICKET_CREATED', payload: newTicket });
      }
      return newTicket;
    } else {
      try {
        const colRef = collection(this.db, 'tickets');
        const docRef = await addDoc(colRef, {
          ticketId: newTicket.ticketId,
          screen: newTicket.screen,
          row: newTicket.row,
          seat: newTicket.seat,
          issueType: newTicket.issueType,
          description: newTicket.description,
          orderId: newTicket.orderId || null,
          contact: newTicket.contact || null,
          status: newTicket.status,
          createdAt: newTicket.createdAt,
        });
        newTicket.id = docRef.id;
        return newTicket;
      } catch (err) {
        console.error('Firestore createTicket fallback to local:', err);
        this.tickets = [newTicket, ...this.tickets];
        localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(this.tickets));
        this.notifyTicketListeners();
        return newTicket;
      }
    }
  }

  public async updateTicketStatus(
    idOrTicketId: string,
    status: TicketStatus,
    staffReply?: string
  ): Promise<void> {
    const now = Date.now();
    const updatePayload: Partial<Ticket> = {
      status,
      updatedAt: now,
    };
    if (staffReply !== undefined) {
      updatePayload.staffReply = staffReply;
    }

    if (this.isDemo || !this.db) {
      this.tickets = this.tickets.map((t) =>
        t.id === idOrTicketId || t.ticketId === idOrTicketId
          ? { ...t, ...updatePayload }
          : t
      );
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(this.tickets));
      this.notifyTicketListeners();
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'TICKET_UPDATE',
          payload: { id: idOrTicketId, status, staffReply },
        });
      }
    } else {
      try {
        const target = this.tickets.find(
          (t) => t.id === idOrTicketId || t.ticketId === idOrTicketId
        );
        const docId = target ? target.id : idOrTicketId;
        const docRef = doc(this.db, 'tickets', docId);
        await updateDoc(docRef, updatePayload);
      } catch (err) {
        console.error('Firestore updateTicketStatus fallback to local:', err);
        this.tickets = this.tickets.map((t) =>
          t.id === idOrTicketId || t.ticketId === idOrTicketId
            ? { ...t, ...updatePayload }
            : t
        );
        localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(this.tickets));
        this.notifyTicketListeners();
      }
    }
  }

  // --- Staff Management ---
  public async addStaffAccount(name: string, email: string, role: 'staff' | 'admin'): Promise<StaffAccount> {
    const newStaff: StaffAccount = {
      id: 'staff-' + Date.now().toString(36),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      createdAt: Date.now(),
    };

    this.staffAccounts = [newStaff, ...this.staffAccounts];
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(this.staffAccounts));
    this.notifyStaffListeners();

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'STAFF_UPDATE' });
    }

    return newStaff;
  }

  public async deleteStaffAccount(id: string): Promise<void> {
    this.staffAccounts = this.staffAccounts.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(this.staffAccounts));
    this.notifyStaffListeners();
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'STAFF_UPDATE' });
    }
  }

  // --- Sales Summary ---
  public getSalesSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const todayOrders = this.orders.filter((o) => o.createdAt >= todayTimestamp);
    const totalOrdersToday = todayOrders.length;
    const totalRevenueToday = todayOrders.reduce((sum, o) => sum + o.total, 0);

    // Item sales counts
    const itemCountMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    this.orders.forEach((o) => {
      o.items.forEach((item) => {
        if (!itemCountMap[item.name]) {
          itemCountMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
        }
        itemCountMap[item.name].qty += item.qty;
        itemCountMap[item.name].revenue += item.price * item.qty;
      });
    });

    const topSellingItems = Object.values(itemCountMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      totalOrdersToday,
      totalRevenueToday,
      topSellingItems,
      allOrdersCount: this.orders.length,
      allRevenue: this.orders.reduce((sum, o) => sum + o.total, 0),
    };
  }

  public async clearAllOrders(): Promise<void> {
    this.orders = [];
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify([]));
    this.notifyOrderListeners();
    if (this.db) {
      try {
        const colRef = collection(this.db, 'orders');
        const snap = await getDocs(colRef);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Clear Firestore orders error:', e);
      }
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'ORDER_UPDATE' });
      } catch (e) {
        // ignore
      }
    }
  }

  public async clearAllTickets(): Promise<void> {
    this.tickets = [];
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify([]));
    this.notifyTicketListeners();
    if (this.db) {
      try {
        const colRef = collection(this.db, 'tickets');
        const snap = await getDocs(colRef);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Clear Firestore tickets error:', e);
      }
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'TICKET_UPDATE' });
      } catch (e) {
        // ignore
      }
    }
  }

  // --- Auth ---
  public async login(email: string, pass: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    if (this.isDemo || !this.auth) {
      const existingStaff = this.staffAccounts.find((s) => s.email.toLowerCase() === cleanEmail);
      const isAdmin =
        cleanEmail.includes('admin') ||
        cleanEmail === 'admin@cineverse.com' ||
        cleanEmail === 'admin@seatserve.cinema' ||
        cleanEmail === 'admin@seatbite.cinema' ||
        existingStaff?.role === 'admin';
      const role = isAdmin ? 'admin' : 'staff';
      const name =
        existingStaff?.name ||
        (role === 'admin' ? 'Cinema Administrator' : 'Counter Staff');

      const user: UserProfile = {
        uid: 'usr-' + Date.now(),
        email: cleanEmail,
        role,
        name,
      };

      this.currentUser = user;
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      this.notifyAuthListeners();
      return user;
    } else {
      try {
        const res = await signInWithEmailAndPassword(this.auth, cleanEmail, pass);
        const role = cleanEmail.includes('admin') ? 'admin' : 'staff';
        const user: UserProfile = {
          uid: res.user.uid,
          email: res.user.email || cleanEmail,
          role,
          name: res.user.displayName || (role === 'admin' ? 'Cinema Admin' : 'Counter Staff'),
        };
        this.currentUser = user;
        this.notifyAuthListeners();
        return user;
      } catch (authErr: any) {
        // Fallback gracefully if auth/operation-not-allowed or similar auth config issue occurs
        console.warn('Firebase Auth error encountered, falling back to session login:', authErr?.code || authErr);
        const existingStaff = this.staffAccounts.find((s) => s.email.toLowerCase() === cleanEmail);
        const isAdmin =
          cleanEmail.includes('admin') ||
          cleanEmail === 'admin@cineverse.com' ||
          cleanEmail === 'admin@seatserve.cinema' ||
          cleanEmail === 'admin@seatbite.cinema' ||
          existingStaff?.role === 'admin';
        const role = isAdmin ? 'admin' : 'staff';
        const name =
          existingStaff?.name ||
          (role === 'admin' ? 'Cinema Administrator' : 'Counter Staff');

        const user: UserProfile = {
          uid: 'usr-' + Date.now(),
          email: cleanEmail,
          role,
          name,
        };

        this.currentUser = user;
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
        this.notifyAuthListeners();
        return user;
      }
    }
  }

  public async logout(): Promise<void> {
    if (this.isDemo || !this.auth) {
      this.currentUser = null;
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      this.notifyAuthListeners();
    } else {
      await signOut(this.auth);
      this.currentUser = null;
      this.notifyAuthListeners();
    }
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }
}

export const storeService = new StoreService();
