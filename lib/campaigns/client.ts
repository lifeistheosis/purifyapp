"use client";

// What the screens ask of the campaign routes (1.9, the rework). Every call
// goes through apiFetch, so the apps reach the live website with the reader's
// token and the website uses its own session.
//
// A closed build asks nothing: each call answers "closed" before any request
// is made (./flags.ts). Failure is kept apart from emptiness, as in
// lib/community/client.ts: a reader offline in a church is not told that
// nobody has asked for prayers.
//
// July's client stood here (prayed today, the streak, the groups inside a
// campaign, the picture stored as uploaded). Its routes are retired and it
// went with the pages that called it.

import { apiFetch } from "@/lib/api/client";
import type { PrayPlace } from "@/lib/prayers/commemoration";

import type { CampaignState } from "./carried";
import { campaignsInBuild } from "./flags";
import type { CampaignKind, CampaignModAction, Closing, ConsentKind, ForWhom, PrayerRef, PublicCampaign, ReportReason } from "./model";

const JSON_POST = { method: "POST", headers: { "content-type": "application/json" } } as const;

async function body(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export type BoardResult = { state: "closed" } | { state: "ok"; campaigns: PublicCampaign[] } | { state: "error" };

/** The board, "Newly asked". */
export async function fetchBoard(): Promise<BoardResult> {
  if (!campaignsInBuild()) return { state: "closed" };
  try {
    const res = await apiFetch("/api/campaigns");
    if (res.status === 404) return { state: "closed" };
    if (!res.ok) return { state: "error" };
    return { state: "ok", campaigns: ((await body(res)).campaigns as PublicCampaign[] | undefined) ?? [] };
  } catch {
    return { state: "error" };
  }
}

export type OneResult = { state: "ok"; campaign: PublicCampaign } | { state: "missing" } | { state: "error" };

/** One campaign, for its page. A closed feature and a missing campaign read alike: there is nothing to open. */
export async function fetchCampaign(id: string): Promise<OneResult> {
  if (!campaignsInBuild()) return { state: "missing" };
  try {
    const res = await apiFetch(`/api/campaigns/${encodeURIComponent(id)}`);
    if (res.status === 404) return { state: "missing" };
    if (!res.ok) return { state: "error" };
    const campaign = (await body(res)).campaign as PublicCampaign | undefined;
    return campaign ? { state: "ok", campaign } : { state: "missing" };
  } catch {
    return { state: "error" };
  }
}

export type StartInput = {
  forWhom: ForWhom;
  kind: CampaignKind;
  title: string;
  name: string;
  words: string | null;
  days: number;
  /** The reader's own calendar day. */
  startsOn: string;
  prayer: PrayerRef | null;
  consent: ConsentKind;
  blessing: true;
  rules: true;
  confirmFiltered?: boolean;
};

export type StartResult =
  | { ok: true; id: string }
  | { ok: false; status: number; code: string | null; error: string | null; limit: number | null; preview: { title: string | null; name: string | null; words: string | null } | null };

export async function startCampaign(input: StartInput): Promise<StartResult> {
  if (!campaignsInBuild()) return { ok: false, status: 404, code: null, error: null, limit: null, preview: null };
  try {
    const res = await apiFetch("/api/campaigns", { ...JSON_POST, body: JSON.stringify(input) });
    const json = await body(res);
    if (res.ok && typeof json.id === "string") return { ok: true, id: json.id };
    return {
      ok: false,
      status: res.status,
      code: typeof json.code === "string" ? json.code : null,
      error: typeof json.error === "string" ? json.error : null,
      limit: typeof json.limit === "number" ? json.limit : null,
      preview: (json.preview as { title: string | null; name: string | null; words: string | null } | undefined) ?? null,
    };
  } catch {
    return { ok: false, status: 0, code: null, error: null, limit: null, preview: null };
  }
}

export type MineResult =
  | { state: "closed" }
  | { state: "error" }
  | { state: "ok"; signedIn: boolean; started: PublicCampaign[]; carried: { campaign: PublicCampaign; places: string[]; until_on: string | null }[] };

/** The reader's own: what they started, and what their account carries. */
export async function fetchMine(): Promise<MineResult> {
  if (!campaignsInBuild()) return { state: "closed" };
  try {
    const res = await apiFetch("/api/campaigns/mine");
    if (res.status === 404) return { state: "closed" };
    if (!res.ok) return { state: "error" };
    const json = await body(res);
    return {
      state: "ok",
      signedIn: json.signedIn === true,
      started: (json.started as PublicCampaign[] | undefined) ?? [],
      carried: (json.carried as { campaign: PublicCampaign; places: string[]; until_on: string | null }[] | undefined) ?? [],
    };
  } catch {
    return { state: "error" };
  }
}

/**
 * Keep a signed-in reader's choice with their account, so it follows them to
 * another device. Best effort, and silent: the campaign is carried on this
 * device whether or not this lands, and a reader who is not signed in is
 * simply told nothing (the route answers 401).
 */
export async function keepJoin(id: string, places: readonly PrayPlace[], until: string | null): Promise<void> {
  if (!campaignsInBuild()) return;
  try {
    await apiFetch(`/api/campaigns/${encodeURIComponent(id)}/join`, { ...JSON_POST, body: JSON.stringify({ places, until }) });
  } catch {
    // Offline: the device's own list is the one that is prayed from.
  }
}

/** And take it off the account when the reader takes it out. Best effort, as above. */
export async function dropJoin(id: string): Promise<void> {
  if (!campaignsInBuild()) return;
  try {
    await apiFetch(`/api/campaigns/${encodeURIComponent(id)}/join`, { method: "DELETE" });
  } catch {
    // Offline.
  }
}

export type Sent = { ok: true } | { ok: false; status: number; error: string | null };

/** What a closed build answers, having asked nobody: the same as the server's own 404. */
const CLOSED: Sent = { ok: false, status: 404, error: null };

async function sent(res: Response): Promise<Sent> {
  if (res.ok) return { ok: true };
  const json = await body(res);
  return { ok: false, status: res.status, error: typeof json.error === "string" ? json.error : null };
}

export async function reportCampaign(id: string, reason: ReportReason, words: string | null): Promise<Sent> {
  if (!campaignsInBuild()) return CLOSED;
  try {
    return await sent(await apiFetch(`/api/campaigns/${encodeURIComponent(id)}/report`, { ...JSON_POST, body: JSON.stringify({ reason, words }) }));
  } catch {
    return { ok: false, status: 0, error: null };
  }
}

/** The creator closes it early, with one of the two closings. */
export async function closeCampaign(id: string, status: Closing): Promise<Sent> {
  if (!campaignsInBuild()) return CLOSED;
  try {
    return await sent(
      await apiFetch(`/api/campaigns/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }),
    );
  } catch {
    return { ok: false, status: 0, error: null };
  }
}

/** The creator keeps a campaign for the reposed after its last day, or stops keeping it. */
export async function keepCampaign(id: string, keep: boolean): Promise<Sent> {
  if (!campaignsInBuild()) return CLOSED;
  try {
    return await sent(
      await apiFetch(`/api/campaigns/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ keepAfterEnd: keep }) }),
    );
  } catch {
    return { ok: false, status: 0, error: null };
  }
}

/** The creator takes it down for good. */
export async function takeDownCampaign(id: string): Promise<Sent> {
  if (!campaignsInBuild()) return CLOSED;
  try {
    return await sent(await apiFetch(`/api/campaigns/${encodeURIComponent(id)}`, { method: "DELETE" }));
  } catch {
    return { ok: false, status: 0, error: null };
  }
}

/** Where the campaigns this device carries stand, or null when that could not be asked. */
export async function fetchStates(ids: readonly string[]): Promise<Record<string, CampaignState> | null> {
  if (!campaignsInBuild() || ids.length === 0) return null;
  try {
    const res = await apiFetch("/api/campaigns/state", { ...JSON_POST, body: JSON.stringify({ ids: ids.slice(0, 24) }) });
    if (!res.ok) return null;
    return ((await body(res)).states as Record<string, CampaignState> | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * One decision of a moderator on a campaign (lib/campaigns/model.ts,
 * CAMPAIGN_MOD_ACTIONS), sent where every moderation action goes
 * (app/api/community/moderation), which asks who the moderator is as it does
 * for a post. `id` is the campaign's, or the report's for a dismissal.
 */
export async function moderateCampaign(action: CampaignModAction, id: string, reason?: string | null): Promise<Sent> {
  if (!campaignsInBuild()) return CLOSED;
  try {
    return await sent(await apiFetch("/api/community/moderation", { ...JSON_POST, body: JSON.stringify({ action, id, reason: reason ?? null }) }));
  } catch {
    return { ok: false, status: 0, error: null };
  }
}
