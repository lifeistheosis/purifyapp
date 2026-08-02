"use client";

// Opt-in server sync for prayer state. Mirrors the existing
// `lib/sync/bookmarks.ts` / `lib/sync/annotations.ts` posture:
//
//   - Local stays the source of truth on the device.
//   - Sign-in pulls server state down and merges into local.
//   - Every local mutation dispatches an event; this module listens to
//     the prayer / intentions / rope events and debounces a push.
//   - All network errors are swallowed silently so the UI never
//     blocks on connectivity.

import { apiFetch } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import {
  readIntentions,
  readPrayedDates,
  readRopeSessions,
  writeIntentions,
  type Intention,
  type RopeSession,
} from "./storage";

const SYNC_DEBOUNCE_MS = 800;

// Every rule that has ever been prayed on this device leaves a
// `purify.prayers.<id>.dates` key behind. Scanning for them is deliberate:
// the previous hardcoded ["morning","evening"] pair silently dropped the
// other 25 rules in lib/prayers/rules.ts, so completing Compline was written
// locally and never left the phone. It also means the `day:*` rhythm strands
// sync with no further work here.
const DATES_KEY = /^purify\.prayers\.(.+)\.dates$/;

function syncedRuleIds(): string[] {
  if (typeof window === "undefined") return [];
  const ids: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      const m = key ? DATES_KEY.exec(key) : null;
      // The schema caps ruleId at 80 chars; a longer one would fail
      // validation for the whole batch, so drop it here instead.
      if (m && m[1].length <= 80) ids.push(m[1]);
    }
  } catch {
    /* ignore */
  }
  return ids;
}

type SyncPayload = {
  completions: { ruleId: string; date: string }[];
  intentions: { living: Intention[]; departed: Intention[] };
  rope: { sessions: RopeSession[] };
};

function gatherLocal(): SyncPayload {
  // Completions: every (ruleId, date) tuple across every rule this device
  // has a record for.
  const completions: { ruleId: string; date: string }[] = [];
  for (const ruleId of syncedRuleIds()) {
    for (const date of readPrayedDates(ruleId)) {
      completions.push({ ruleId, date });
    }
  }
  return {
    completions,
    intentions: {
      living: readIntentions("living"),
      departed: readIntentions("departed"),
    },
    rope: { sessions: readRopeSessions() },
  };
}

/**
 * Push every local item to /api/prayer/sync. Idempotent on the server
 * (primary key / unique-locator constraints absorb duplicates).
 */
export async function pushAllLocalPrayerState(): Promise<void> {
  try {
    const payload = gatherLocal();
    // apiFetch, not fetch: inside the native shell a relative path resolves to
    // https://localhost, where app/api has been stashed out of the export and
    // nothing answers. apiFetch rewrites to SITE_URL and attaches the Bearer
    // token, because cookies do not travel cross-origin.
    const r = await apiFetch("/api/prayer/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return;
  } catch {
    /* ignore */
  }
}

/**
 * Pull server state and merge into local. Called once on sign-in (via
 * PostSignInBridge) and again on any forceSyncPrayers() invocation.
 */
export async function syncPrayersFromServer(): Promise<void> {
  try {
    const r = await apiFetch("/api/prayer/sync", { cache: "no-store" });
    if (!r.ok) return;
    const j = (await r.json()) as {
      completions: { ruleId: string; date: string }[];
      intentions: { living: Intention[]; departed: Intention[] };
      rope: { sessions: RopeSession[] };
    };

    // Merge completions back into the local dates arrays (de-duped, capped 30).
    if (Array.isArray(j.completions)) {
      const byRule = new Map<string, Set<string>>();
      for (const c of j.completions) {
        const set = byRule.get(c.ruleId) ?? new Set<string>();
        set.add(c.date);
        byRule.set(c.ruleId, set);
      }
      for (const [ruleId, dates] of byRule) {
        const merged = new Set([...readPrayedDates(ruleId), ...dates]);
        const sorted = [...merged].sort();
        const next = sorted.slice(-30);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              `purify.prayers.${ruleId}.dates`,
              JSON.stringify(next),
            );
            window.dispatchEvent(new CustomEvent("purify:prayer-completed"));
          } catch {
            /* ignore */
          }
        }
      }
    }

    // Merge intentions by id.
    if (j.intentions) {
      for (const kind of ["living", "departed"] as const) {
        const local = readIntentions(kind);
        const byId = new Map<string, Intention>(local.map((x) => [x.id, x]));
        for (const e of (j.intentions[kind] as Intention[]) ?? []) {
          // Server wins for updated_at; here we just take the server row if it's
          // not in local. Real conflict resolution is rare and not worth the
          // complexity until users complain.
          if (!byId.has(e.id)) byId.set(e.id, e);
        }
        writeIntentions(kind, [...byId.values()]);
      }
    }

    // Merge rope sessions by id.
    if (j.rope?.sessions) {
      const local = readRopeSessions();
      const byId = new Map<string, RopeSession>(local.map((x) => [x.id, x]));
      for (const s of j.rope.sessions) {
        if (!byId.has(s.id)) byId.set(s.id, s);
      }
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            "purify.rope.sessions",
            JSON.stringify([...byId.values()]),
          );
          window.dispatchEvent(new CustomEvent("purify:rope"));
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Called from PostSignInBridge after a fresh sign-in. Pushes whatever the
 * user has locally up to the server, then pulls down to absorb other devices.
 */
export async function pushOnFirstSignIn(): Promise<void> {
  await pushAllLocalPrayerState();
  await syncPrayersFromServer();
}

// ── Background bridge (mounted once in the (app) layout) ────────────────────

let started = false;

/**
 * Idempotent installer: listens for prayer-completion, intention, and
 * rope events and debounces a push to the server when the user is
 * signed in. Called from a mount-once component, same pattern as the
 * SyncBridge for bookmarks/annotations.
 */
export function installPrayerSyncBridge(): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;
  let signedIn: boolean | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function checkAuth() {
    try {
      const supa = createClient();
      const {
        data: { user },
      } = await supa.auth.getUser();
      signedIn = !!user;
    } catch {
      signedIn = false;
    }
  }
  checkAuth();

  function maybePush() {
    if (signedIn !== true) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void pushAllLocalPrayerState();
    }, SYNC_DEBOUNCE_MS);
  }

  window.addEventListener("purify:prayer-completed", maybePush);
  window.addEventListener("purify:intentions", maybePush);
  window.addEventListener("purify:rope", maybePush);

  return () => {
    window.removeEventListener("purify:prayer-completed", maybePush);
    window.removeEventListener("purify:intentions", maybePush);
    window.removeEventListener("purify:rope", maybePush);
    started = false;
  };
}
