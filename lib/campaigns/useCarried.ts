"use client";

// The campaigns a reader carries, kept on this device (./carried.ts is the
// model). Every read is guarded (private mode, blocked storage) and every
// write tells the page through CARRIED_EVENT, as the names from the prayer
// wall do (lib/prayers/useWallNames.ts).
//
// A closed build (./flags.ts) never reads the list: the prayer reader, Your
// rule and Pray together then stand exactly as they did before campaigns
// were built, whatever a device happens to hold.

import { useSyncExternalStore } from "react";

import { todayKey } from "@/lib/rhythm/dayKey";

import { CARRIED_EVENT, CARRIED_KEY, expireCarried, parseCarried, type CarriedCampaign } from "./carried";
import { campaignsInBuild } from "./flags";

const EMPTY: CarriedCampaign[] = [];
let cache: { raw: string | null; day: string; list: CarriedCampaign[] } | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CARRIED_KEY);
  } catch {
    return null;
  }
}

/**
 * The list as kept, with those whose day has passed marked as left, the same
 * array until it changes (so a store can compare it). Nothing in a closed
 * build, and nothing on the server.
 */
export function readCarried(): CarriedCampaign[] {
  if (typeof window === "undefined" || !campaignsInBuild()) return EMPTY;
  const raw = readRaw();
  const day = todayKey();
  if (cache && cache.raw === raw && cache.day === day) return cache.list;
  const list = expireCarried(parseCarried(raw), day);
  cache = { raw, day, list };
  return list;
}

export function writeCarried(list: readonly CarriedCampaign[]): void {
  if (typeof window === "undefined" || !campaignsInBuild()) return;
  try {
    window.localStorage.setItem(CARRIED_KEY, JSON.stringify(list));
  } catch {
    // Quota or private mode: the list stays as it was.
    return;
  }
  cache = null;
  window.dispatchEvent(new CustomEvent(CARRIED_EVENT));
}

/**
 * Write down what the calendar has changed: those whose day has passed are
 * kept as left, from the day it was noticed, so they are asked about once
 * and forgotten in their time. Reading alone marks them only for the page.
 */
export function keepExpiry(): void {
  if (typeof window === "undefined" || !campaignsInBuild()) return;
  const kept = parseCarried(readRaw());
  const next = expireCarried(kept, todayKey());
  if (next !== kept) writeCarried(next);
}

/** Read the list fresh, change it, keep it. Answers the list as kept. */
export function updateCarried(change: (list: CarriedCampaign[]) => CarriedCampaign[]): CarriedCampaign[] {
  const before = readCarried();
  const next = change(before);
  if (next !== before) writeCarried(next);
  return next;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined" || !campaignsInBuild()) return () => {};
  window.addEventListener(CARRIED_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CARRIED_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The list, live: nothing on the server, before the page has hydrated, and in a closed build. */
export function useCarried(): CarriedCampaign[] {
  return useSyncExternalStore(subscribe, readCarried, () => EMPTY);
}
