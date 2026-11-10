"use client";

import { useSyncExternalStore } from "react";

/**
 * What this reader has read to its end (1.9, rec 79: the earned palettes).
 *
 * A council's page counts once its foot has come into view
 * (app/(app)/councils/[slug]/page.tsx, components/reading/ReadToEndMark.tsx),
 * a work once the foot of its last chapter has (components/saints/
 * WritingReader.tsx). Nothing else is kept: no time, no count, no place, and
 * nothing leaves the device. lib/reader/earned.ts reads it to say how far a
 * reader is towards the Councils and Cappadocian palettes.
 *
 * Storage, per device: purify:read-to-end = { councils: [slug], works: ["saint/work"] }.
 * Never pruned: it is at most the 19 councils and the works a reader finishes.
 */

export type ReadToEnd = { councils: readonly string[]; works: readonly string[] };
export type ReadToEndKind = "council" | "work";

const KEY = "purify:read-to-end";
const EVENT = "purify:read-to-end";
const EMPTY: ReadToEnd = { councils: [], works: [] };
const ID = /^[a-z0-9-]{1,80}(\/[a-z0-9-]{1,80})?$/;

/** A stored value read strictly: anything off its shape is nothing. Pure, for its test. */
export function parseReadToEnd(raw: string | null): ReadToEnd {
  if (!raw) return EMPTY;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object" || Array.isArray(v)) return EMPTY;
    const list = (x: unknown) => (Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === "string" && ID.test(s)))] : []);
    const o = v as Record<string, unknown>;
    return { councils: list(o.councils), works: list(o.works) };
  } catch {
    return EMPTY;
  }
}

/** The store with one more thing read to its end. Pure, for its test. */
export function withReadToEnd(store: ReadToEnd, kind: ReadToEndKind, id: string): ReadToEnd {
  if (!ID.test(id)) return store;
  const field = kind === "council" ? "councils" : "works";
  if (store[field].includes(id)) return store;
  return { ...store, [field]: [...store[field], id] };
}

let cache: { raw: string | null; value: ReadToEnd } | null = null;

function read(): ReadToEnd {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (cache && cache.raw === raw) return cache.value;
  const value = parseReadToEnd(raw);
  cache = { raw, value };
  return value;
}

/** Record that a council's page or a work has been read to its end. */
export function markReadToEnd(kind: ReadToEndKind, id: string): void {
  if (typeof window === "undefined") return;
  const before = read();
  const next = withReadToEnd(before, kind, id);
  if (next === before) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return;
  }
  cache = null;
  window.dispatchEvent(new CustomEvent(EVENT));
}

function subscribe(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** What has been read to its end, for a screen; nothing on the server and in the first draw. */
export function useReadToEnd(): ReadToEnd {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
