"use client";

import { useSyncExternalStore } from "react";

import { addTombstone, dropTombstone } from "@/lib/sync/tombstones";

import type { Mark } from "./anchor";
import { TEXT_KINDS, type TextKind } from "./placeAttr";

/**
 * Highlights and notes on the paragraphs of the texts that are not a
 * Father's work: a saint's short life, a council's documents, the theology
 * essays and history (1.9, the owner's word of 2026-11-10: "the same features
 * that the Bible section has, ensure that the other works also has").
 *
 * The same value a Father's paragraph keeps (lib/saints/annotations.ts) under
 * a key of its own:
 *
 *   purify:text:{text}:{slug}:{doc}:{sectionN}:{paragraphIdx}
 *
 *   text   which kind of page: "life", "council", "theology", "history"
 *   slug   the saint, the council, the topic, the event
 *   doc    the document within it (a council's), or "-" where there is one
 *   sectionN, paragraphIdx   the part and the paragraph in it
 *
 * These pages are edited more often than a Father's printed text, so what a
 * reader marks here is mostly marks on words (lib/marks/anchor.ts), which
 * find their place again after an edit.
 */

export { TEXT_KINDS, type TextKind } from "./placeAttr";

export type TextPlace = { text: TextKind; slug: string; doc: string; sectionN: number; paragraphIdx: number };

export type TextAnnotation = {
  highlighted?: boolean;
  color?: string;
  note?: string;
  marks?: Mark[];
  at?: string;
};

export const TEXT_PREFIX = "purify:text:";

export function textKey(p: TextPlace): string {
  return `${TEXT_PREFIX}${p.text}:${p.slug}:${p.doc || "-"}:${p.sectionN}:${p.paragraphIdx}`;
}

/** The place a key names, or null when it is not one of these. */
export function parseTextKey(key: string): TextPlace | null {
  if (!key.startsWith(TEXT_PREFIX)) return null;
  const [text, slug, doc, section, paragraph, ...rest] = key.slice(TEXT_PREFIX.length).split(":");
  const sectionN = Number(section);
  const paragraphIdx = Number(paragraph);
  if (rest.length || !slug || !doc || !(TEXT_KINDS as readonly string[]).includes(text)) return null;
  if (!Number.isInteger(sectionN) || !Number.isInteger(paragraphIdx) || section === "" || paragraph === "") return null;
  return { text: text as TextKind, slug, doc, sectionN, paragraphIdx };
}

const EMPTY: TextAnnotation = {};
const bare = (v: TextAnnotation) => !v.highlighted && !v.note && !v.marks?.length;

const snapCache = new Map<string, { raw: string | null; val: TextAnnotation }>();

function readSnapshot(k: string): TextAnnotation {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(k);
  } catch {
    return EMPTY;
  }
  const cached = snapCache.get(k);
  if (cached && cached.raw === raw) return cached.val;
  let val: TextAnnotation = EMPTY;
  if (raw) {
    try {
      val = JSON.parse(raw) as TextAnnotation;
    } catch {
      val = EMPTY;
    }
  }
  snapCache.set(k, { raw, val });
  return val;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("purify:annotation", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("purify:annotation", cb);
    window.removeEventListener("storage", cb);
  };
}

export function readTextAnnotation(place: TextPlace): TextAnnotation {
  return readSnapshot(textKey(place));
}

/**
 * Write what is on a paragraph. Empty removes it and leaves a tombstone, so
 * the sync deletes the server's copy instead of pulling it back; anything
 * else drops one. Dated now, unless `at` is given to put a value back exactly.
 */
export function writeTextAnnotation(place: TextPlace, next: TextAnnotation): void {
  const k = textKey(place);
  const locator = { text: place.text, slug: place.slug, doc: place.doc || "-", sectionN: place.sectionN, paragraphIdx: place.paragraphIdx };
  try {
    const empty = bare(next);
    const value: TextAnnotation = empty ? {} : { ...next, at: next.at ?? new Date().toISOString() };
    if (!empty) {
      window.localStorage.setItem(k, JSON.stringify(value));
      dropTombstone("annotations", "text-paragraph", locator);
    } else {
      const had = window.localStorage.getItem(k) !== null;
      window.localStorage.removeItem(k);
      if (had) addTombstone("annotations", "text-paragraph", locator);
    }
    snapCache.delete(k);
    window.dispatchEvent(new CustomEvent("purify:annotation", { detail: { kind: "text-paragraph", ...locator, data: value } }));
  } catch {
    /* storage may be unavailable */
  }
}

/** What is on a paragraph, live. */
export function useTextAnnotation(place: TextPlace): TextAnnotation {
  const k = textKey(place);
  return useSyncExternalStore(
    subscribe,
    () => readSnapshot(k),
    () => EMPTY,
  );
}
