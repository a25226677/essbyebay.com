// ─────────────────────────────────────────────────────────────
// lib/store.ts — Zustand client stores (cart + wishlist)
// Both persist to localStorage so state survives page reloads.
// ─────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, CartItem } from "./types";

// ─── Cart Store ───────────────────────────────────────────────

interface CartState {
  items: CartItem[];
  addItem: (
    product: Product,
    quantity?: number,
    selectedColor?: string,
    selectedSize?: string
  ) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1, selectedColor, selectedSize) => {
        const { items } = get();
        const existing = items.find(
          (i) =>
            i.product.id === product.id &&
            i.selectedColor === selectedColor &&
            i.selectedSize === selectedSize
        );

        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id &&
              i.selectedColor === selectedColor &&
              i.selectedSize === selectedSize
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                product,
                quantity,
                selectedColor: selectedColor ?? null,
                selectedSize: selectedSize ?? null,
              },
            ],
          });
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.product.id !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    }),
    { name: "seller-store-cart" }
  )
);

// ─── Wishlist Store ───────────────────────────────────────────

interface WishlistState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        if (!get().items.some((i) => i.id === product.id)) {
          set({ items: [...get().items, product] });
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.id !== productId) });
      },

      isInWishlist: (productId) => get().items.some((i) => i.id === productId),

      clearWishlist: () => set({ items: [] }),
    }),
    { name: "seller-store-wishlist" }
  )
);
