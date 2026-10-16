"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { chantMediaUrl, isStreamed, LIVE_LIST_PATH, variantRef } from "./media";

/**
 * Which recordings may play now (1.7).
 *
 * public/audio/chants/live.json, on the website, lists every streamed
 * recording that may play ("live") and every recording taken down
 * ("pulled", the bundled ones too). It is the takedown path the owner's
 * decision of 2026-10-16 asked for: moving one "<slug>/<id>" from live to
 * pulled and pushing the website stops that recording in every installed
 * app at once, with no store release.
 *
 * It fails closed. A streamed recording plays only once the list has been
 * read and names it, so a reader with no signal sees "Plays with a
 * connection" and never a button that does nothing. A bundled recording
 * plays with no signal at all, unless a list that was read pulls it.
 */
export type Availability = "checking" | "playable" | "offline" | "pulled";

export type LiveList = { live: string[]; pulled: string[] };

type ListState =
  | { status: "idle" | "loading" | "failed" }
  | { status: "ready"; live: ReadonlySet<string>; pulled: ReadonlySet<string> };

/** live.json, checked. Anything else is no list at all. */
export function readLiveList(value: unknown): LiveList | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { v?: unknown; live?: unknown; pulled?: unknown };
  const strings = (a: unknown): a is string[] => Array.isArray(a) && a.every((s) => typeof s === "string");
  if (v.v !== 1 || !strings(v.live) || !strings(v.pulled)) return null;
  return { live: v.live, pulled: v.pulled };
}

/** Whether one recording may play, given what is known of the list. */
export function availabilityOf(
  list: LiveList | null | "unknown",
  slug: string,
  variant: { id: string; audio: { src: string } },
): Availability {
  const ref = variantRef(slug, variant.id);
  const streamed = isStreamed(variant.audio.src);
  if (list && list !== "unknown") {
    if (list.pulled.includes(ref)) return "pulled";
    if (!streamed) return "playable";
    return list.live.includes(ref) ? "playable" : "pulled";
  }
  if (!streamed) return "playable";
  return list === "unknown" ? "checking" : "offline";
}

// ---- the list, read once per session (again when the signal comes back)

const TIMEOUT_MS = 8000;
let state: ListState = { status: "idle" };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: ListState) {
  state = next;
  for (const l of listeners) l();
}

/** Read live.json, unless it is read already or being read. */
export function loadLiveList(): Promise<void> {
  if (state.status === "ready") return Promise.resolve();
  if (inflight) return inflight;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    set({ status: "failed" });
    return Promise.resolve();
  }
  set({ status: "loading" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  inflight = fetch(chantMediaUrl(LIVE_LIST_PATH), { credentials: "omit", cache: "no-cache", signal: controller.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      const list = readLiveList(json);
      set(list ? { status: "ready", live: new Set(list.live), pulled: new Set(list.pulled) } : { status: "failed" });
    })
    .catch(() => set({ status: "failed" }))
    .finally(() => {
      clearTimeout(timer);
      inflight = null;
    });
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const IDLE: ListState = { status: "idle" };

function known(s: ListState): LiveList | null | "unknown" {
  if (s.status === "ready") return { live: [...s.live], pulled: [...s.pulled] };
  return s.status === "failed" ? null : "unknown";
}

/**
 * Whether each recording may play, kept current: the list is asked for when
 * the first screen that needs it appears, and asked again when the phone
 * comes back online after a failure.
 */
export function useChantAvailability(): (slug: string, variant: { id: string; audio: { src: string } }) => Availability {
  const s = useSyncExternalStore(subscribe, () => state, () => IDLE);
  useEffect(() => {
    void loadLiveList();
    const retry = () => {
      if (state.status === "failed") {
        state = { status: "idle" };
        void loadLiveList();
      }
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);
  const list = useMemo(() => known(s), [s]);
  return useCallback((slug, variant) => availabilityOf(list, slug, variant), [list]);
}
