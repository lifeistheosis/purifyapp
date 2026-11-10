"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { chantMediaUrl, isStreamed, LIVE_LIST_PATH, variantRef } from "./media";
import { isChantSaved, keepOnlyListed, useSavedChants } from "./offline";

/**
 * Which recordings may play now (1.7).
 *
 * /audio/chants/live.json, on the website, lists every streamed
 * recording that may play ("live") and every recording taken down
 * ("pulled", the bundled ones too). It is the takedown path the owner's
 * decision of 2026-10-16 asked for: moving one "<slug>/<id>" from live to
 * pulled and pushing the website stops that recording in every installed
 * app at once, with no store release. From 1.9 the list is the committed
 * one (data/chants-live.json) less every recording switched off in the
 * admin (lib/chants/pulls.ts), so a takedown needs no push at all.
 *
 * It fails closed. A streamed recording plays only once the list has been
 * read and names it, so a reader with no signal sees "Plays with a
 * connection" and never a button that does nothing. A bundled recording
 * plays with no signal at all, unless a list that was read pulls it.
 *
 * 1.7.1: a list that could not be read says why. When the website could not
 * be reached at all (no signal, a request that failed or ran out of time) it
 * is "offline" ("Plays with a connection"). When the website answered, but
 * not with the list (a 404, or something that is not the list), it is
 * "unavailable" ("Not available now"). On 2026-10-17 the 1.7 apps went out
 * before the website carried the list, and every reader with a perfectly
 * good connection was told to find one.
 *
 * 1.9 (item 8): a recording saved on the phone (lib/chants/offline.ts)
 * plays when no list can be read, as a bundled one does, and every list
 * that is read takes off the phone what it does not name as live. While the
 * list is still being read it waits, as a streamed one does, so a recording
 * taken down does not start from its copy in the moment before.
 */
export type Availability = "checking" | "playable" | "offline" | "unavailable" | "pulled";

export type LiveList = { live: string[]; pulled: string[] };

/** Why the list could not be read: no signal, or a signal and no list. */
export type ListFailure = "offline" | "unavailable";

type ListState =
  | { status: "idle" | "loading" }
  | { status: "failed"; reason: ListFailure }
  | { status: "ready"; live: ReadonlySet<string>; pulled: ReadonlySet<string> };

/** live.json, checked. Anything else is no list at all. */
export function readLiveList(value: unknown): LiveList | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { v?: unknown; live?: unknown; pulled?: unknown };
  const strings = (a: unknown): a is string[] => Array.isArray(a) && a.every((s) => typeof s === "string");
  if (v.v !== 1 || !strings(v.live) || !strings(v.pulled)) return null;
  return { live: v.live, pulled: v.pulled };
}

/**
 * Whether one recording may play, given what is known of the list: the list,
 * "unknown" while it is being read, or why it could not be read (null is
 * "offline", as it always was).
 */
export function availabilityOf(
  list: LiveList | null | "unknown" | ListFailure,
  slug: string,
  variant: { id: string; audio: { src: string } },
  saved: boolean = false,
): Availability {
  const ref = variantRef(slug, variant.id);
  const streamed = isStreamed(variant.audio.src);
  if (list && typeof list === "object") {
    if (list.pulled.includes(ref)) return "pulled";
    if (!streamed) return "playable";
    return list.live.includes(ref) ? "playable" : "pulled";
  }
  if (!streamed) return "playable";
  if (list === "unknown") return "checking";
  // Saved on the phone (1.9): no list to be had, and its copy plays.
  if (saved) return "playable";
  return list === "unavailable" ? "unavailable" : "offline";
}

// ---- the list: read when a screen first needs it, and asked for again
// until it is had (1.9)
//
// Until 1.9 a failed read was final for the screen that made it: the list was
// asked for once as a chant's screen opened, and again only if the phone
// itself announced it had come back online. A request that failed for a
// moment (the phone waking, a change of network, the website restarting as a
// new version of it goes out) left every Play on that screen dim under
// "Plays with a connection" or "Not available now" on a phone with a good
// connection, until the reader left the screen and came back. The owner's
// report of 2026-11-09: "the chant player actually doesn't load".
//
// Now, while a screen is asking: a first failure that came quickly is tried
// again at once, before any reason is shown; after that the list is asked
// for again and again, further apart each time, and whenever the app comes
// back to the front or the phone comes back online. The reason on the screen
// stays as it is meanwhile, so nothing flickers. The phone's own word that it
// is offline is not trusted to skip the request: a web view can say so
// wrongly, and a request that fails costs nothing.
//
// A list that was read is read again once it is five minutes old (the time
// the website lets it be kept), when a screen asks or the app comes back to
// the front, so a recording taken down stops in an app that has been open
// for days. If that read fails, the list in hand stands.

const TIMEOUT_MS = 8000;
/** A list this old is read again, quietly: as long as the website lets it be kept. */
export const FRESH_MS = 5 * 60 * 1000;
/** How long after each failure the list is asked for again; the last, from then on. */
export const RETRY_AFTER_MS = [1000, 3000, 8000, 20000, 30000] as const;
/** A first failure quicker than this is tried again before a reason is shown. */
const QUICK_MS = 3000;

let state: ListState = { status: "idle" };
let inflight: Promise<void> | null = null;
/** When the list in hand was read. */
let readAt = 0;
/** Failures since the list was last read. */
let failures = 0;
/** The screens asking now. */
let askers = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function set(next: ListState) {
  state = next;
  for (const l of listeners) l();
}

function clearRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
}

/** Ask again later, while a screen is still asking. */
function retryLater() {
  clearRetry();
  if (askers <= 0) return;
  const after = RETRY_AFTER_MS[Math.min(failures, RETRY_AFTER_MS.length) - 1] ?? RETRY_AFTER_MS[0];
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void loadLiveList();
  }, after);
}

function failed(reason: ListFailure, startedAt: number) {
  // The list in hand stands: a read that only meant to freshen it has failed.
  if (state.status === "ready") return;
  failures += 1;
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  // The first failure, come quickly on a phone that says it is online, is
  // tried again before the reader is told anything.
  const quiet = failures === 1 && !offline && Date.now() - startedAt < QUICK_MS && askers > 0;
  if (!quiet) set({ status: "failed", reason });
  retryLater();
}

/**
 * Read live.json, unless it is being read, or was read less than five
 * minutes ago. A failure keeps what is on the screen and is tried again
 * (above).
 */
export function loadLiveList(): Promise<void> {
  if (inflight) return inflight;
  if (state.status === "ready" && Date.now() - readAt < FRESH_MS) return Promise.resolve();
  clearRetry();
  // A reason already shown, or a list in hand, stays while it is asked for again.
  if (state.status === "idle") set({ status: "loading" });
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  inflight = fetch(chantMediaUrl(LIVE_LIST_PATH), { credentials: "omit", cache: "no-cache", signal: controller.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      const list = readLiveList(json);
      // An answer that is not the list came over a working connection.
      if (!list) return failed("unavailable", startedAt);
      failures = 0;
      readAt = Date.now();
      set({ status: "ready", live: new Set(list.live), pulled: new Set(list.pulled) });
      // A recording the list no longer names is taken off the phone (1.9).
      void keepOnlyListed(list);
    })
    // Nothing came back: no signal, a dropped request, or no answer in time.
    .catch(() => failed("offline", startedAt))
    .finally(() => {
      clearTimeout(timer);
      inflight = null;
    });
  return inflight;
}

/** The app is at the front again, or the phone online again: ask now. */
function askNow() {
  if (askers <= 0) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  void loadLiveList();
}

/**
 * A screen that needs the list: it is read now, and kept asked for while the
 * screen is there. Returns the way to stop asking.
 */
export function askForLiveList(): () => void {
  askers += 1;
  if (askers === 1 && typeof window !== "undefined") {
    window.addEventListener("online", askNow);
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", askNow);
  }
  // A failure waiting for its next try is tried now: a screen has just opened.
  void loadLiveList();
  let asking = true;
  return () => {
    if (!asking) return;
    asking = false;
    askers -= 1;
    if (askers > 0) return;
    clearRetry();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", askNow);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", askNow);
    }
  };
}

/** What is known of the list now, outside React (and for the tests). */
export function liveListNow(): LiveList | "unknown" | ListFailure {
  return known(state);
}

/** Test seam: the list as if the app had just been opened. */
export function forgetLiveList(): void {
  clearRetry();
  state = { status: "idle" };
  inflight = null;
  readAt = 0;
  failures = 0;
  askers = 0;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const IDLE: ListState = { status: "idle" };

function known(s: ListState): LiveList | "unknown" | ListFailure {
  if (s.status === "ready") return { live: [...s.live], pulled: [...s.pulled] };
  return s.status === "failed" ? s.reason : "unknown";
}

/**
 * Whether each recording may play, kept current: the list is asked for when
 * the first screen that needs it appears, and asked for again until it is
 * had (askForLiveList). `ask` false (1.8, the player, which is always
 * mounted) reads what is known without asking: the player asks only while a
 * chant is playing.
 */
export function useChantAvailability(ask: boolean = true): (slug: string, variant: { id: string; audio: { src: string } }) => Availability {
  const s = useSyncExternalStore(subscribe, () => state, () => IDLE);
  const saved = useSavedChants();
  useEffect(() => {
    if (!ask) return;
    return askForLiveList();
  }, [ask]);
  const list = useMemo(() => known(s), [s]);
  return useCallback(
    (slug, variant) => availabilityOf(list, slug, variant, saved.has(variantRef(slug, variant.id)) && isChantSaved(slug, variant)),
    [list, saved],
  );
}
