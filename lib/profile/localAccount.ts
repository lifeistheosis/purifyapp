"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny local-only "account" model. Lives entirely in localStorage; no
 * network calls, no Supabase row. The presence of a `LocalAccount`
 * record is what distinguishes "the user explicitly chose to keep
 * things on this device" from "the user just hasn't picked anything
 * yet", important for the dual-choice account surface to behave
 * predictably.
 *
 * Schema:
 *   purify_local_account → JSON { name: string; createdAt: ISO string }
 *
 * Subscribers (e.g. `useLocalAccount()`) re-read on the cross-tab
 * `storage` event AND on a same-tab custom event we dispatch whenever
 * we mutate the value, the storage event only fires in OTHER tabs.
 */

export type LocalAccount = { name: string; createdAt: string };

const KEY = "purify_local_account";
const EVENT = "purify:local-account";

const EMPTY: LocalAccount | null = null;

// Stable snapshot so useSyncExternalStore doesn't tear: cache by the
// raw localStorage string and only re-parse when it actually changes.
let snapRaw: string | null | undefined;
let snapValue: LocalAccount | null = EMPTY;

function readSnapshot(): LocalAccount | null {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === snapRaw) return snapValue;
  snapRaw = raw;
  if (!raw) {
    snapValue = null;
    return snapValue;
  }
  try {
    const parsed = JSON.parse(raw) as LocalAccount;
    if (
      parsed &&
      typeof parsed.name === "string" &&
      typeof parsed.createdAt === "string"
    ) {
      snapValue = parsed;
    } else {
      snapValue = null;
    }
  } catch {
    snapValue = null;
  }
  return snapValue;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Subscribe to the local account. Returns `null` if none is claimed
 * (or during SSR). Re-renders when `claimLocal` / `releaseLocal` are
 * called in this tab, or when localStorage changes in another tab.
 */
export function useLocalAccount(): LocalAccount | null {
  return useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);
}

export function claimLocal(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  const value: LocalAccount = {
    name: trimmed.length > 0 ? trimmed : "Reader",
    createdAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* localStorage unavailable, silently noop */
  }
}

export function releaseLocal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* noop */
  }
}
