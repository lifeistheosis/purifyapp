"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The Florilegium (literally "a gathering of flowers"): personal, named
 * collections into which a reader gathers the lines that strike them, a
 * patristic sentence, a verse, a quote from a theology study, with an
 * optional note of their own beneath each.
 *
 * This is the flagship of the Purify Plus feature layer (see
 * lib/entitlements). The DATA layer here is local-first and offline-safe,
 * identical in discipline to lib/bookmarks.ts: a single localStorage
 * array, read through useSyncExternalStore, mutated through a custom
 * event so every mounted surface stays in lockstep without a
 * hydrate-in-effect setState. Entitlement gating lives at the UI and
 * sync layers, never here, so a reader's gathered text is never at risk
 * from a billing state change (the data-safety rule).
 *
 * Storage:
 *   purify:florilegia = Florilegium[]   // JSON, newest collection first
 */

export type FlorilegiumItemBase = {
  /** crypto.randomUUID() */
  id: string;
  /** Date.now() */
  addedAt: number;
  /** The reader's own note beneath the gathered line. Optional. */
  note?: string;
};

/**
 * A gathered line. Three kinds, each carrying enough to render the quote
 * and to deep-link back to where it was gathered from.
 */
export type FlorilegiumItem =
  | (FlorilegiumItemBase & {
      kind: "scripture";
      /** Verbatim verse text at the time of gathering. */
      text: string;
      /** e.g. "John 1:1". */
      reference: string;
      /** Routing book slug, e.g. "john". */
      book: string;
      chapter: number;
      verse: number;
    })
  | (FlorilegiumItemBase & {
      kind: "father";
      /** Verbatim quotation. */
      text: string;
      /** The Father's name as printed. */
      author: string;
      /** Saint profile slug, when linkable. */
      saintSlug?: string;
      /** Work title, when known. */
      work?: string;
      /** A deep link back to the source (saint work or theology topic). */
      href?: string;
    });

export type Florilegium = {
  /** crypto.randomUUID() */
  id: string;
  title: string;
  /** Optional one-line description in the reader's own words. */
  description?: string;
  createdAt: number;
  updatedAt: number;
  /** Newest gathered line first. */
  items: FlorilegiumItem[];
};

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** What a caller hands to addItem: the item minus the generated fields. */
export type FlorilegiumItemInput = DistributiveOmit<
  FlorilegiumItem,
  "id" | "addedAt"
>;

const STORAGE_KEY = "purify:florilegia";
const EVENT = "purify:florilegium";

function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readAll(): Florilegium[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Florilegium[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: Florilegium[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { items } }));
  } catch {
    /* storage may be unavailable */
  }
}

// Stable snapshot for useSyncExternalStore: cache the parsed array keyed
// by the raw string so reads return the same reference until the data
// actually changes.
const EMPTY: Florilegium[] = [];
let snapRaw: string | null | undefined;
let snapVal: Florilegium[] = EMPTY;

function readSnapshot(): Florilegium[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === snapRaw) return snapVal;
  snapRaw = raw;
  if (!raw) {
    snapVal = EMPTY;
    return snapVal;
  }
  try {
    const parsed = JSON.parse(raw);
    snapVal = Array.isArray(parsed) ? (parsed as Florilegium[]) : EMPTY;
  } catch {
    snapVal = EMPTY;
  }
  return snapVal;
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
 * Live florilegia list plus mutators. All mutators read-modify-write the
 * whole array (the data is small, a reader's handful of collections) and
 * fire the event so other surfaces refresh.
 */
export function useFlorilegia() {
  const florilegia = useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);

  const create = useCallback((title: string, description?: string): string => {
    const trimmed = title.trim() || "Untitled gathering";
    const now = Date.now();
    const next: Florilegium = {
      id: uuid(),
      title: trimmed,
      description: description?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      items: [],
    };
    writeAll([next, ...readAll()]);
    return next.id;
  }, []);

  const rename = useCallback(
    (id: string, title: string, description?: string) => {
      const next = readAll().map((f) =>
        f.id === id
          ? {
              ...f,
              title: title.trim() || f.title,
              description: description?.trim() || undefined,
              updatedAt: Date.now(),
            }
          : f,
      );
      writeAll(next);
    },
    [],
  );

  const remove = useCallback((id: string) => {
    writeAll(readAll().filter((f) => f.id !== id));
  }, []);

  const addItem = useCallback(
    (florilegiumId: string, item: FlorilegiumItemInput) => {
      const entry = {
        ...item,
        id: uuid(),
        addedAt: Date.now(),
      } as FlorilegiumItem;
      const next = readAll().map((f) =>
        f.id === florilegiumId
          ? { ...f, items: [entry, ...f.items], updatedAt: Date.now() }
          : f,
      );
      writeAll(next);
    },
    [],
  );

  const removeItem = useCallback(
    (florilegiumId: string, itemId: string) => {
      const next = readAll().map((f) =>
        f.id === florilegiumId
          ? {
              ...f,
              items: f.items.filter((i) => i.id !== itemId),
              updatedAt: Date.now(),
            }
          : f,
      );
      writeAll(next);
    },
    [],
  );

  const setItemNote = useCallback(
    (florilegiumId: string, itemId: string, note: string) => {
      const clean = note.trim();
      const next = readAll().map((f) =>
        f.id === florilegiumId
          ? {
              ...f,
              items: f.items.map((i) =>
                i.id === itemId ? { ...i, note: clean || undefined } : i,
              ),
              updatedAt: Date.now(),
            }
          : f,
      );
      writeAll(next);
    },
    [],
  );

  return {
    florilegia,
    create,
    rename,
    remove,
    addItem,
    removeItem,
    setItemNote,
  };
}

/** Non-hook read for one-off callers (e.g. an "add to florilegium" menu). */
export function listFlorilegia(): Florilegium[] {
  return readAll();
}
