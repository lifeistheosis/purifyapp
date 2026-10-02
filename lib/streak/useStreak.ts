"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { apiFetch } from "@/lib/api/client";
import { PRAYER_EVENT, readPrayedDates } from "@/lib/prayers/storage";
import { useMyPicture } from "@/lib/profile/myPicture";
import { todayKey } from "@/lib/rhythm/dayKey";
import { useMounted } from "@/lib/useMounted";
import { computeStreak, dayNumber, weekStrip, type StripDay } from "./compute";
import type { StreakPayload } from "./types";

/**
 * The reader's streak as Today, You and the profile show it. One store for
 * every surface, so the top bar, the sheet and the You card always agree.
 *
 * Signed out, it is worked out on the device from the ledger
 * (`purify.prayers.*.dates`), which holds about the last month.
 *
 * Signed in, the server's answer is the truth, because it holds every
 * device's marks and the whole history (/api/streak). Between a mark and the
 * server hearing of it (the ledger syncs after 800 ms), the device adds
 * today itself, so the flame lights the moment the reader keeps the day.
 *
 * The saves are never known here. The server says only that one was used
 * and not yet told (`saved`), and `acknowledgeSave` tells it.
 */

export type StreakView = {
  /** False on the server and the hydration render: draw nothing yet. */
  ready: boolean;
  signedIn: boolean;
  current: number;
  best: number;
  keptToday: boolean;
  /** From 6 pm, a streak going and today not kept yet. */
  atRisk: boolean;
  /** A save just covered a missed day and the reader has not been told. */
  saved: boolean;
  /** The last seven days, oldest first. */
  strip: StripDay[];
};

type ServerAnswer = Extract<StreakPayload, { state: "ok" }>;

const SERVER_KEY = "purify.streak.server";
const SEEN_KEY = "purify.streak.seenSave";
const DATES_KEY = /^purify\.prayers\.(.+)\.dates$/;
/** How long an answer stands before a focus or a mount asks again. */
const STALE_MS = 60_000;
/** The ledger's sync waits 800 ms before it pushes; ask after it has landed. */
const AFTER_MARK_MS = 2_500;
/** A save is news for this many days after the day it covered. */
const SAVE_NEWS_DAYS = 3;
const RISK_HOUR = 18;

let server: ServerAnswer | null = null;
let fetchedAt = 0;
let inflight: Promise<void> | null = null;
let acked = false;
let version = 0;
let started = false;
let markTimer: ReturnType<typeof setTimeout> | null = null;
let signedIn = false;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  for (const l of listeners) l();
}

function readServerCache(): ServerAnswer | null {
  try {
    const raw = window.localStorage.getItem(SERVER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ServerAnswer;
    return parsed && parsed.state === "ok" && Array.isArray(parsed.strip) ? parsed : null;
  } catch {
    return null;
  }
}

function writeServerCache(answer: ServerAnswer | null) {
  try {
    if (answer) window.localStorage.setItem(SERVER_KEY, JSON.stringify(answer));
    else window.localStorage.removeItem(SERVER_KEY);
  } catch {
    // A private window: the streak still shows, it is just asked for again.
  }
}

/** Every day the device holds a mark for, across every rule and strand. */
function localDays(): string[] {
  const out = new Set<string>();
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      const m = key ? DATES_KEY.exec(key) : null;
      if (m) for (const d of readPrayedDates(m[1])) out.add(d);
    }
  } catch {
    // Blocked storage: no history on this device.
  }
  return [...out];
}

function zone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

async function fetchServer(force = false): Promise<void> {
  if (!signedIn) return;
  if (!force && Date.now() - fetchedAt < STALE_MS) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await apiFetch(`/api/streak?tz=${encodeURIComponent(zone())}`, { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as StreakPayload;
      if (body.state !== "ok") return;
      server = acked ? { ...body, saved: false } : body;
      fetchedAt = Date.now();
      writeServerCache(server);
      emit();
    } catch {
      // Offline: the device's own count stands until the next answer.
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  server = readServerCache();
  window.addEventListener(PRAYER_EVENT, () => {
    emit();
    if (markTimer) clearTimeout(markTimer);
    markTimer = setTimeout(() => void fetchServer(true), AFTER_MARK_MS);
  });
  window.addEventListener("storage", (e) => {
    if (e.key && DATES_KEY.test(e.key)) emit();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    emit();
    void fetchServer();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

function setSignedIn(next: boolean) {
  if (signedIn === next) return;
  signedIn = next;
  if (!next) {
    server = null;
    fetchedAt = 0;
    acked = false;
    writeServerCache(null);
  }
  emit();
}

function readSeen(): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function compose(ready: boolean, isIn: boolean): StreakView {
  const empty: StreakView = {
    ready: false,
    signedIn: isIn,
    current: 0,
    best: 0,
    keptToday: false,
    atRisk: false,
    saved: false,
    strip: [],
  };
  if (!ready) return empty;

  const today = todayKey();
  const days = localDays();
  const local = computeStreak(days, today);
  const evening = new Date().getHours() >= RISK_HOUR;

  if (isIn && server && server.today === today) {
    const keptToday = server.keptToday || local.keptToday;
    // The server has not heard of today's mark yet: add it, as it will.
    const current =
      server.keptToday || !local.keptToday ? server.current : server.current > 0 ? server.current + 1 : 1;
    const strip = server.strip.map((d) => (d.date === today && local.keptToday ? { ...d, state: "kept" as const } : d));
    return {
      ready: true,
      signedIn: true,
      current,
      best: Math.max(server.best, current),
      keptToday,
      atRisk: evening && !keptToday && current > 0,
      saved: server.saved && !acked,
      strip,
    };
  }

  const seen = readSeen();
  const recent = local.lastSave !== null && dayNumber(today) - dayNumber(local.lastSave) <= SAVE_NEWS_DAYS;
  return {
    ready: true,
    signedIn: isIn,
    current: local.current,
    best: local.best,
    keptToday: local.keptToday,
    atRisk: evening && !local.keptToday && local.current > 0,
    // Signed in, the device cannot know the saves; it waits for the server.
    saved: !isIn && recent && local.lastSave !== null && (seen === null || local.lastSave > seen),
    strip: weekStrip(days, today),
  };
}

/** The reader's streak. Re-reads on every mark, focus and sign-in change. */
export function useStreak(): StreakView {
  const mounted = useMounted();
  const me = useMyPicture();
  const v = useSyncExternalStore(subscribe, () => version, () => 0);
  const isIn = me.state === "in";

  useEffect(() => {
    if (me.state === "unknown") return;
    setSignedIn(isIn);
    if (isIn) void fetchServer();
  }, [me.state, isIn]);

  return useMemo(() => {
    void v;
    return compose(mounted, isIn);
  }, [mounted, isIn, v]);
}

/** The reader has seen "We got you this time." Never shown again for that save. */
export function acknowledgeSave(): void {
  acked = true;
  if (server) server = { ...server, saved: false };
  if (signedIn) {
    void apiFetch("/api/streak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seen: true }),
    })
      .then((res) => {
        // The server remembers now, so a later save in a long session is news again.
        if (res.ok) acked = false;
      })
      .catch(() => {
        // Offline: quiet for this session; the server tells again next time.
      });
  } else {
    const local = computeStreak(localDays(), todayKey());
    try {
      if (local.lastSave) window.localStorage.setItem(SEEN_KEY, local.lastSave);
    } catch {
      // Blocked storage: the sheet may show once more.
    }
  }
  emit();
}
