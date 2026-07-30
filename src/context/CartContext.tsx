"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Service } from "@/data/site";

export type CartItem = {
  service: Service;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addToCart: (service: Service) => void;
  upsertService: (service: Service) => void;
  removeFromCart: (serviceId: number) => void;
  clearCart: () => void;
  isInCart: (serviceId: number) => boolean;
  totalCount: number;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "glansbilvatt-cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addToCart = useCallback((service: Service) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.service.id === service.id);
      if (existing) {
        return prev.map((item) =>
          item.service.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { service, quantity: 1 }];
    });
  }, []);

  /** Add service or refresh its data without changing quantity (used for campaigns). */
  const upsertService = useCallback((service: Service) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.service.id === service.id);
      if (existing) {
        return prev.map((item) =>
          item.service.id === service.id ? { ...item, service } : item,
        );
      }
      return [...prev, { service, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((serviceId: number) => {
    setItems((prev) => prev.filter((item) => item.service.id !== serviceId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback(
    (serviceId: number) => items.some((item) => item.service.id === serviceId),
    [items]
  );

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addToCart,
      upsertService,
      removeFromCart,
      clearCart,
      isInCart,
      totalCount,
      hydrated,
    }),
    [
      items,
      addToCart,
      upsertService,
      removeFromCart,
      clearCart,
      isInCart,
      totalCount,
      hydrated,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
