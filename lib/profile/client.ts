// The profile routes, from client code. apiFetch so the native app reaches
// purifyapp.net with its bearer token; the web stays same-origin.
//
// Every call answers { ok, ... } instead of throwing, with the server's
// `code` passed through, because the editor turns codes like
// "handle_taken" or "plus_required" into its own words.

import { apiFetch } from "@/lib/api/client";
import { readCalendarStyleDefault } from "@/lib/calendar/styleDefault";

import type { MyClergy } from "./clergy";
import type { MyProfile, ProfileRelation, PublicProfile } from "./publicProfile";

export type ProfileError = { ok: false; status: number; code: string | null; error: string };

async function fail(r: Response): Promise<ProfileError> {
  const body = (await r.json().catch(() => null)) as { error?: string; code?: string } | null;
  return { ok: false, status: r.status, code: body?.code ?? null, error: body?.error ?? "" };
}

const OFFLINE: ProfileError = { ok: false, status: 0, code: "offline", error: "" };

/** Anyone's profile, by @handle. */
export async function fetchProfile(handle: string): Promise<{ ok: true; profile: PublicProfile } | ProfileError> {
  try {
    const r = await apiFetch(`/api/community/profile?h=${encodeURIComponent(handle)}`);
    if (!r.ok) return fail(r);
    const { profile } = (await r.json()) as { profile: PublicProfile };
    return { ok: true, profile };
  } catch {
    return OFFLINE;
  }
}

/** The signed-in reader's own profile, with what the editor needs. */
export async function fetchMyProfile(): Promise<{ ok: true; profile: MyProfile } | ProfileError> {
  try {
    const r = await apiFetch("/api/profile/me", { cache: "no-store" });
    if (!r.ok) return fail(r);
    const { profile } = (await r.json()) as { profile: MyProfile };
    return { ok: true, profile };
  } catch {
    return OFFLINE;
  }
}

export type ProfilePatch = {
  handle?: string;
  parish?: string | null;
  private?: boolean;
  hidePosts?: boolean;
  hideJoined?: boolean;
  showNowReading?: boolean;
  prayerRequest?: boolean;
  calendar?: "new" | "old";
  bio?: string | null;
  status?: string | null;
  favoriteVerse?: string | null;
  patronSaint?: string | null;
  bannerColor?: string | null;
  bannerUrl?: null;
  themePrimary?: string | null;
  themeAccent?: string | null;
  decoration?: string | null;
  effect?: string | null;
  // 20261005_community_three.sql
  socialLinks?: { k: string; v: string }[];
  nameColor?: string | null;
  bannerMotion?: string | null;
  hiddenBadges?: string[];
  pushCommunity?: boolean;
};

export async function saveMyProfile(patch: ProfilePatch): Promise<{ ok: true; profile: MyProfile } | ProfileError> {
  try {
    const r = await apiFetch("/api/profile/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) return fail(r);
    const { profile } = (await r.json()) as { profile: MyProfile };
    return { ok: true, profile };
  } catch {
    return OFFLINE;
  }
}

/**
 * Name days are counted on the server, and the calendar a reader keeps lives
 * on their device (lib/calendar/styleDefault.ts). When the two differ, the
 * device wins and the account is told, so an Old Calendar reader's name day
 * is not thirteen days early. Answers the updated profile, or null when
 * nothing changed or the save did not land (it is tried again next visit).
 */
export async function syncCalendar(profile: MyProfile): Promise<MyProfile | null> {
  const device = readCalendarStyleDefault();
  if (profile.settings.calendar === device) return null;
  const res = await saveMyProfile({ calendar: device });
  return res.ok ? res.profile : null;
}

export async function uploadBanner(file: File): Promise<{ ok: true; profile: MyProfile | null } | ProfileError> {
  try {
    const form = new FormData();
    form.set("file", file);
    const r = await apiFetch("/api/profile/banner", { method: "POST", body: form });
    if (!r.ok) return fail(r);
    const body = (await r.json()) as { profile?: MyProfile };
    return { ok: true, profile: body.profile ?? null };
  } catch {
    return OFFLINE;
  }
}

export async function removeBanner(): Promise<{ ok: true; profile: MyProfile | null } | ProfileError> {
  try {
    const r = await apiFetch("/api/profile/banner", { method: "DELETE" });
    if (!r.ok) return fail(r);
    const body = (await r.json()) as { profile?: MyProfile };
    return { ok: true, profile: body.profile ?? null };
  } catch {
    return OFFLINE;
  }
}

/** Report a profile to the team. The reason is optional, as for posts. */
export async function reportProfile(handle: string, reason: string | null): Promise<{ ok: true } | ProfileError> {
  try {
    const r = await apiFetch("/api/community/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileHandle: handle, reason: reason?.trim() || undefined }),
    });
    if (!r.ok) return fail(r);
    return { ok: true };
  } catch {
    return OFFLINE;
  }
}

// ── Community, part two ─────────────────────────────────────────────────

/** How the signed-in reader stands with a profile. */
export async function fetchRelation(handle: string): Promise<{ ok: true; relation: ProfileRelation } | ProfileError> {
  try {
    const r = await apiFetch(`/api/community/relation?h=${encodeURIComponent(handle)}`, { cache: "no-store" });
    if (!r.ok) return fail(r);
    const { relation } = (await r.json()) as { relation: ProfileRelation };
    return { ok: true, relation };
  } catch {
    return OFFLINE;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<({ ok: true } & T) | ProfileError> {
  try {
    const r = await apiFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return fail(r);
    return { ok: true, ...((await r.json()) as T) };
  } catch {
    return OFFLINE;
  }
}

export function setFollow(handle: string, follow: boolean) {
  return postJson<{ following: boolean }>("/api/community/follow", { handle, follow });
}

/** "Many years!" on someone's name day. Answers with the day's count. */
export function greetNameDay(handle: string) {
  return postJson<{ count: number }>("/api/community/greet", { handle });
}

/** "I prayed", in answer to "pray for me". Answers with the count. */
export function sayPrayed(handle: string) {
  return postJson<{ count: number }>("/api/community/pray", { handle });
}

/** Handles starting with what is being typed after "@". */
export async function searchHandles(q: string): Promise<string[]> {
  try {
    const r = await apiFetch(`/api/community/handles?q=${encodeURIComponent(q)}`);
    if (!r.ok) return [];
    const { hits } = (await r.json()) as { hits: { handle: string }[] };
    return hits.map((h) => h.handle);
  } catch {
    return [];
  }
}

/** Ask for the verified clergy seal. The team decides; this only asks. */
export function requestClergy(input: { rank: string; jurisdiction: string; parish: string | null; evidence: string }) {
  return postJson<{ clergy: MyClergy }>("/api/profile/clergy", input);
}

/** Open Stripe's checkout for a Plus gift. Website only. */
export function startGiftCheckout(handle: string) {
  return postJson<{ url: string }>("/api/gifts/checkout", { handle });
}

/**
 * Where "now reading" is switched on, on this device, so the Bible reader
 * knows whether to send anything at all. The server checks the real switch.
 */
export const NOW_READING_KEY = "purify.profile.nowReading";

export function nowReadingOn(): boolean {
  try {
    return window.localStorage.getItem(NOW_READING_KEY) === "1";
  } catch {
    return false;
  }
}

export function setNowReadingOn(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(NOW_READING_KEY, "1");
    else window.localStorage.removeItem(NOW_READING_KEY);
  } catch {
    /* storage blocked: the reader simply does not report */
  }
}

let lastReported: string | null = null;

/** Tell the server which chapter is open, once per chapter. Best effort. */
export function reportNowReading(ref: string): void {
  if (ref === lastReported || !nowReadingOn()) return;
  lastReported = ref;
  void apiFetch("/api/profile/now-reading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref }),
  }).catch(() => {});
}
