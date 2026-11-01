"use client";

import { useEffect, useSyncExternalStore } from "react";

import { isNativeClient } from "@/lib/platform/native";
import { SITE_URL } from "@/lib/site";

import { readClearedList, type ClearedWords } from "./cleared";

/**
 * Which chant versions show their cleared words now (build 86 note 78):
 * /api/chants/cleared, read at run time, the website's in the apps (an app
 * has no server of its own) and the page's own on the web. Read when a
 * chant's page first wants it and again once it is five minutes old, so a
 * row the owner switches on in the admin reaches every app within minutes
 * with no new build, and one switched off goes back as quickly.
 *
 * It asks for nothing a reader is: no cookies, no token. With no signal, a
 * website that does not answer, or an answer that does not check out
 * (lib/chants/cleared.ts), the list is empty and every version shows the
 * words it carries, the public-domain wording.
 */
const FRESH_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 8000;
export const CLEARED_PATH = "/api/chants/cleared";

const EMPTY: ClearedWords[] = [];
let list: ClearedWords[] = EMPTY;
let readAt = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Read the list if it is not fresh. A failure keeps what was last read. */
export function refreshCleared(): Promise<void> {
  if (inflight) return inflight;
  if (readAt && Date.now() - readAt < FRESH_MS) return Promise.resolve();
  const url = isNativeClient() ? `${SITE_URL}${CLEARED_PATH}` : CLEARED_PATH;
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
  inflight = fetch(url, { credentials: "omit", signal: ctrl?.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      if (body === null) return;
      readAt = Date.now();
      const next = readClearedList(body);
      // Nothing changed: no reader draws again.
      if (JSON.stringify(next) === JSON.stringify(list)) return;
      list = next.length ? next : EMPTY;
      emit();
    })
    .catch(() => {})
    .finally(() => {
      if (timer) clearTimeout(timer);
      inflight = null;
    });
  return inflight;
}

/** A version's cleared words, if they are on and have been read: for a player handed no words (Pray with chant). */
export function clearedNow(slug: string, variantId: string): ClearedWords | null {
  return list.find((c) => c.slug === slug && c.variant === variantId) ?? null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The cleared words switched on now, read as the page opens and kept fresh while it is shown. */
export function useClearedWords(): ClearedWords[] {
  const value = useSyncExternalStore(
    subscribe,
    () => list,
    () => EMPTY,
  );
  useEffect(() => {
    void refreshCleared();
    const again = () => {
      if (document.visibilityState === "visible") void refreshCleared();
    };
    document.addEventListener("visibilitychange", again);
    const timer = window.setInterval(again, FRESH_MS);
    return () => {
      document.removeEventListener("visibilitychange", again);
      window.clearInterval(timer);
    };
  }, []);
  return value;
}
