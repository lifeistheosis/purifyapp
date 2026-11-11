"use client";

// The paragraphs of the Fathers a reader highlighted, for Saved and the You
// tab (1.8). The You tab counted them as "Paragraphs" from 1.5 and its tile
// opened Saved, which did not list them: the only way back to a highlighted
// paragraph was to remember which work it was in.
//
// Two parts, the way the verses have them (lib/saved/highlights.ts and
// lib/saved/verseWords.ts):
//
//   useSavedPassages   every highlighted paragraph on the device, live, read
//                      from the per-paragraph annotations
//                      (lib/saints/annotations.ts), scanned again only when
//                      an annotation has changed.
//   usePassageWords    a paragraph's words and its work's title, from the
//                      work's own file (/saints-data/<saint>/<work>.json,
//                      app/saints-data), the file the apps' reader opens. It
//                      ships inside the apps, so there it is read from the
//                      phone; on the website it is one request per work, made
//                      when a row of it comes near the screen, and kept for
//                      the visit. The saints' registry (lib/saints/saints.ts,
//                      half a megabyte) never comes into the page.

import { useEffect, useSyncExternalStore } from "react";

import { fetchWorkSection, fetchWorkTitle } from "@/lib/saints/writingClient";

import { passageFrom, passageKey, wordsFrom, type SavedPassage, type SavedWords } from "./feed";

// ── Every highlighted paragraph ──────────────────────────────────────────

const EMPTY: SavedPassage[] = [];
const NO_WORDS: SavedWords[] = [];
let version = 0;
let listening = false;
let cached: { version: number; list: SavedPassage[]; words: SavedWords[] } | null = null;

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const bump = () => {
    version += 1;
  };
  window.addEventListener("purify:annotation", bump);
  window.addEventListener("storage", bump);
}

function scan(): { list: SavedPassage[]; words: SavedWords[] } {
  const list: SavedPassage[] = [];
  const words: SavedWords[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !(key.startsWith("purify:saint:") || key.startsWith("purify:text:"))) continue;
      const raw = window.localStorage.getItem(key);
      const p = passageFrom(key, raw);
      if (p) list.push(p);
      // The words marked inside it, a Father's paragraph or another text's (1.9).
      words.push(...wordsFrom(key, raw));
    }
  } catch {
    return { list: EMPTY, words: NO_WORDS };
  }
  return { list, words: words.length ? words : NO_WORDS };
}

function scanned() {
  listen();
  if (!cached || cached.version !== version) cached = { version, ...scan() };
  return cached;
}

function snapshot(): SavedPassage[] {
  if (typeof window === "undefined") return EMPTY;
  return scanned().list;
}

function wordsSnapshot(): SavedWords[] {
  if (typeof window === "undefined") return NO_WORDS;
  return scanned().words;
}

/** Every run of words a reader marked in a text. Empty on the server and on first paint. */
export function useSavedWords(): SavedWords[] {
  return useSyncExternalStore(subscribe, wordsSnapshot, () => NO_WORDS);
}

function subscribe(cb: () => void): () => void {
  listen();
  window.addEventListener("purify:annotation", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("purify:annotation", cb);
    window.removeEventListener("storage", cb);
  };
}

/** Every highlighted paragraph. Empty on the server and on first paint. */
export function useSavedPassages(): SavedPassage[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

// ── A paragraph's words ──────────────────────────────────────────────────


export type PassageWords = {
  /** The paragraph's words, or null until they are read (or when they cannot be). */
  text: string | null;
  /** The work's title, from its own file. */
  work: string | null;
  status: "loading" | "ready" | "missing";
};

const LOADING: PassageWords = { text: null, work: null, status: "loading" };
const read = new Map<string, PassageWords>();
const listeners = new Set<() => void>();

function ask(p: SavedPassage) {
  const key = passageKey(p);
  if (read.has(key)) return;
  read.set(key, LOADING);
  // The section alone, and the work's title: a work the commentary quotes is
  // written in parts from 1.9, and a saved paragraph reads the one part that
  // holds it (lib/saints/writingClient.ts keeps what it has read).
  void Promise.all([fetchWorkSection(p.saintSlug, p.workSlug, p.sectionN), fetchWorkTitle(p.saintSlug, p.workSlug)]).then(([section, title]) => {
    const text = section?.paragraphs?.[p.paragraphIdx]?.trim() || null;
    read.set(key, { text, work: title, status: text ? "ready" : "missing" });
    listeners.forEach((l) => l());
  });
}

function subscribeWords(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** A paragraph's words and work, as far as they have been read (Saved's search). */
export function passageWordsNow(p: SavedPassage): PassageWords {
  return read.get(passageKey(p)) ?? LOADING;
}

/** A paragraph's words. `visible` asks for them: a row asks once it is near the screen. */
export function usePassageWords(p: SavedPassage, visible: boolean): PassageWords {
  const key = passageKey(p);
  const state = useSyncExternalStore(subscribeWords, () => read.get(key) ?? LOADING, () => LOADING);
  useEffect(() => {
    if (visible) ask(p);
    // The paragraph is named by its key; the object may be a new one each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, key]);
  return state;
}

// ── Whose words ──────────────────────────────────────────────────────────

const SMALL = new Set(["the", "of", "and", "in", "on", "at", "to", "a"]);

/**
 * A saint's name from the address: "athanasius-the-great" is "Athanasius the
 * Great", "gregory-of-nyssa" is "Gregory of Nyssa". The registry's own name is
 * not loaded here, for the reason at the top of this file; the address is
 * written from it, so the two say the same.
 */
export function saintNameOf(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * Where a paragraph opens: its section of the work (#sN), which the reader
 * opens and scrolls to, the paragraph lit inside it.
 */
export function passageHref(p: SavedPassage): string {
  return `/saints/${p.saintSlug}/${p.workSlug}#s${p.sectionN}`;
}
