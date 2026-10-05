import React, { createContext, useContext, useState, useEffect } from 'react';
import { MenuItem } from '../types';

const STORAGE_KEY_CART = 'seatserve_customer_cart_v1';
const STORAGE_KEY_NOTES = 'seatserve_customer_notes_v1';

interface CartContextType {
  cart: Record<string, number>;
  customerNotes: string;
  setCustomerNotes: (notes: string) => void;
  addItem: (item: MenuItem) => void;
  decreaseItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  getItemQuantity: (itemId: string) => number;
  totalItemsCount: number;
  calculateTotal: (menuItems: MenuItem[]) => number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CART);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Error reading cart from localStorage', e);
      }
    }
    return {};
  });

  const [customerNotes, setCustomerNotesState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(STORAGE_KEY_NOTES) || '';
      } catch {
        return '';
      }
    }
    return '';
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart));
    } catch (e) {
      console.warn('Error saving cart to localStorage', e);
    }
  }, [cart]);

  // Sync notes to localStorage
  const setCustomerNotes = (notes: string) => {
    setCustomerNotesState(notes);
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, notes);
    } catch (e) {
      console.warn('Error saving notes to localStorage', e);
    }
  };

  const addItem = (item: MenuItem) => {
    if (!item.available) return;
    setCart((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1,
    }));
  };

  // Quantity "-" at 1 removes the item
  const decreaseItem = (itemId: string) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: current - 1,
      };
    });
  };

  // Remove item completely
  const removeItem = (itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  // Clear entire cart
  const clearCart = () => {
    setCart({});
    setCustomerNotesState('');
    try {
      localStorage.removeItem(STORAGE_KEY_CART);
      localStorage.removeItem(STORAGE_KEY_NOTES);
    } catch {
      // ignore
    }
  };

  const getItemQuantity = (itemId: string): number => {
    return cart[itemId] || 0;
  };

  const totalItemsCount = Object.values(cart).reduce((sum, q) => sum + q, 0);

  const calculateTotal = (menuItems: MenuItem[]): number => {
    return Object.entries(cart).reduce((sum, [itemId, qty]) => {
      const item = menuItems.find((m) => m.id === itemId);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  return (
    <CartContext.Provider
      value={{
        cart,
        customerNotes,
        setCustomerNotes,
        addItem,
        decreaseItem,
        removeItem,
        clearCart,
        getItemQuantity,
        totalItemsCount,
        calculateTotal,
        isCartOpen,
        setIsCartOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
