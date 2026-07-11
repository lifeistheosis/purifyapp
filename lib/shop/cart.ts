"use client";

// The shop cart. Client-only and local-first: items live in localStorage
// (guests can fill a cart too), and checkout sends only slugs and
// quantities — the server re-prices everything from the database, so
// nothing here is ever trusted for money.

import { useSyncExternalStore } from "react";

const KEY = "purify:shop.cart";
const EVENT = "purify:cart";
const MAX_QTY = 10;

export type CartItem = {
  slug: string;
  title: string;
  priceCents: number;
  currency: string;
  imageUrl?: string;
  imageAlt?: string;
  quantity: number;
};

function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed.filter((i) => i && i.slug) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full/blocked: the cart simply doesn't persist */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  return read();
}

export function addToCart(item: Omit<CartItem, "quantity">, quantity = 1) {
  const items = read();
  const existing = items.find((i) => i.slug === item.slug);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, MAX_QTY);
  } else {
    items.push({ ...item, quantity: Math.min(quantity, MAX_QTY) });
  }
  write(items);
}

export function setCartQuantity(slug: string, quantity: number) {
  let items = read();
  if (quantity < 1) {
    items = items.filter((i) => i.slug !== slug);
  } else {
    const it = items.find((i) => i.slug === slug);
    if (it) it.quantity = Math.min(quantity, MAX_QTY);
  }
  write(items);
}

export function removeFromCart(slug: string) {
  write(read().filter((i) => i.slug !== slug));
}

export function clearCart() {
  write([]);
}

// ---- React binding ---------------------------------------------------------

let cache: { raw: string; items: CartItem[] } | null = null;

function getSnapshot(): CartItem[] {
  const raw = (() => {
    try {
      return window.localStorage.getItem(KEY) ?? "[]";
    } catch {
      return "[]";
    }
  })();
  if (!cache || cache.raw !== raw) {
    cache = { raw, items: read() };
  }
  return cache.items;
}

const EMPTY: CartItem[] = [];

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb); // other tabs
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Live cart contents; re-renders on every cart change (this tab or others). */
export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

/** Total item count for the badge. */
export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}

/** Subtotal in cents; display only — the server re-prices at checkout. */
export function cartSubtotalCents(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.priceCents * i.quantity, 0);
}
