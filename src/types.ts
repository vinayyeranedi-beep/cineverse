export type Category = 'Popcorn' | 'Drinks' | 'Snacks' | 'Combos';

export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  price: number; // In INR
  imageUrl: string;
  isVeg: boolean;
  available: boolean;
  description: string;
  featured?: boolean;
}

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  isVeg?: boolean;
}

export type OrderStatus = 'received' | 'preparing' | 'on_the_way' | 'delivered';

export interface Order {
  id: string;
  orderId?: string;
  screen: string;
  row: string;
  seat: string;
  items: OrderItem[];
  total: number;
  notes?: string;
  note?: string; // fallback
  status: OrderStatus;
  createdAt: number;
  updatedAt?: number;
}

export interface ScreenGridConfig {
  id: string;
  name: string;
  screenNumber: string;
  rowsCount: number; // m
  seatsPerRow: number; // n
  rowOverrides: Record<string, number>; // row letter -> seats count
  aisleGaps: number[]; // column indices after which an aisle gap exists (e.g. [7, 14])
  disabledSeats: string[]; // non-existent seats e.g. ["A1", "N21"]
  updatedAt?: number;
}

export interface StaffAccount {
  id: string;
  email: string;
  name: string;
  role: 'staff' | 'admin';
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'staff' | 'admin';
  name?: string;
}

export type ActiveTab = 'order' | 'counter' | 'admin';

export type IssueType =
  | 'Wrong seat'
  | 'QR not working'
  | 'Order delayed'
  | 'Wrong or missing item'
  | 'Payment problem'
  | 'Other';

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface Ticket {
  id: string;
  ticketId: string; // e.g. "TKT-8291"
  screen: string;
  row: string;
  seat: string;
  issueType: IssueType;
  description?: string;
  orderId?: string;
  contact?: string;
  status: TicketStatus;
  staffReply?: string;
  createdAt: number;
  updatedAt?: number;
}
