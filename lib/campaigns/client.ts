"use client";

// Client-side calls for Prayer Campaigns. Public reads and every write go
// through the API via apiFetch (native rewrites to SITE_URL + Bearer); the
// user's own join/activity rows are read straight from Supabase under RLS
// (self-select), the same split the shop uses.

import { apiFetch } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { todayKey } from "@/lib/rhythm/dayKey";
import type { CampaignGroup, GroupMember } from "./groups";
import type { CampaignDay } from "./streak";
import type {
  CampaignIntention,
  ForWhom,
  PrayerCampaign,
} from "./campaigns";

/**
 * Failure kept apart from emptiness, the same shape and for the same reason
 * as PostsResult in lib/community/client.ts.
 *
 * These used to return `[]` and `null` for a 500, a 404 and a dropped
 * connection alike, which the board renders as "No campaigns here yet. Be
 * the first to ask." A reader offline in a church was told the community had
 * asked for nothing. AUDIT-2026-07-27 prescribed exactly this fix.
 */
export type CampaignsResult =
  | { state: "dark" }
  | { state: "ok"; campaigns: PrayerCampaign[] }
  | { state: "error" };

export type CampaignResult =
  | { state: "dark" }
  | { state: "ok"; campaign: PrayerCampaign }
  | { state: "missing" }
  | { state: "error" };

export async function fetchCampaigns(
  intention?: CampaignIntention,
): Promise<CampaignsResult> {
  try {
    const qs = intention ? `?intention=${intention}` : "";
    const res = await apiFetch(`/api/campaigns${qs}`);
    // 404 is the flag guard in app/api/campaigns/route.ts, not a failure.
    if (res.status === 404) return { state: "dark" };
    if (!res.ok) return { state: "error" };
    const json = (await res.json()) as { campaigns?: PrayerCampaign[] };
    return { state: "ok", campaigns: json.campaigns ?? [] };
  } catch {
    return { state: "error" };
  }
}

export async function fetchCampaign(id: string): Promise<CampaignResult> {
  try {
    const res = await apiFetch(`/api/campaigns/${id}`);
    if (res.status === 404) {
      // The route answers 404 both for a dark flag and a missing row. The
      // body distinguishes them: the flag guard sends `{ error: "Not found." }`
      // with no campaign key either way, so treat an unparseable body as
      // missing rather than claiming the feature is off.
      return { state: "missing" };
    }
    if (!res.ok) return { state: "error" };
    const json = (await res.json()) as { campaign?: PrayerCampaign };
    return json.campaign
      ? { state: "ok", campaign: json.campaign }
      : { state: "missing" };
  } catch {
    return { state: "error" };
  }
}

export type CreateCampaignInput = {
  title: string;
  intention: CampaignIntention;
  forWhom: ForWhom;
  subjectName?: string | null;
  note?: string | null;
  /** Chosen preset prayer key; omitted falls back to the intention default. */
  prayerKey?: string | null;
  /** Campaign length: 7, 9, or 40 days; omitted/null = ongoing. */
  durationDays?: 7 | 9 | 40 | null;
  blessing: true;
  /** Public URL returned by uploadCampaignImage, or null for no image. */
  imageUrl?: string | null;
  /** Required by the API whenever imageUrl is set. */
  photoConsent?: true;
};

export type ApiResult = { ok: boolean; error?: string; id?: string };

async function readResult(res: Response): Promise<ApiResult> {
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    return { ok: false, error: (json.error as string) || "Something went wrong." };
  }
  return { ok: true, id: json.id as string | undefined };
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<ApiResult> {
  const res = await apiFetch("/api/campaigns", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return readResult(res);
}

export type UploadResult = { ok: boolean; url?: string; error?: string };

/**
 * Upload one campaign image and get its public URL back. The URL is not
 * attached to anything yet; it travels in the create body, where the server
 * re-validates that it is one of ours. Goes through apiFetch so the native
 * shell reaches purifyapp.net with a bearer token instead of https://localhost.
 */
export async function uploadCampaignImage(file: File): Promise<UploadResult> {
  try {
    const body = new FormData();
    body.append("file", file);
    const res = await apiFetch("/api/campaigns/image", { method: "POST", body });
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (res.ok && json.url) return { ok: true, url: json.url };
    return { ok: false, error: json.error ?? `Upload failed (${res.status}).` };
  } catch {
    return { ok: false, error: "Upload failed: network dropped. Try again." };
  }
}

export type PrayResult = ApiResult & {
  alreadyToday?: boolean;
  /** The day the server recorded, echoed back so the client can add it to
   *  the local day set without a refetch. */
  dayKey?: string;
  totalDays?: number;
};

/**
 * Mark this campaign prayed for the reader's own calendar day.
 *
 * The day key is computed HERE and sent up, because the server has no way to
 * know what day it is where the reader is standing. This is the same key
 * every other day-keyed surface in the app uses, so a campaign day and a
 * prayer-rule day mean the same thing on the same device.
 */
export async function prayCampaign(id: string): Promise<PrayResult> {
  try {
    const res = await apiFetch(`/api/campaigns/${id}/pray`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dayKey: todayKey() }),
    });
    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      /* empty */
    }
    if (!res.ok) {
      return {
        ok: false,
        error: (json.error as string) || "Couldn't record it.",
      };
    }
    return {
      ok: true,
      alreadyToday: Boolean(json.alreadyToday),
      dayKey: typeof json.dayKey === "string" ? json.dayKey : undefined,
      totalDays: typeof json.totalDays === "number" ? json.totalDays : undefined,
    };
  } catch {
    return { ok: false, error: "Network dropped. Please try again." };
  }
}

/**
 * The reader's own kept days for one campaign, read direct under RLS.
 *
 * prayer_campaign_days has a self-select policy, so this needs no route. An
 * absent table (before the migration lands) reads as no days rather than an
 * error, so the streak simply does not appear and nothing breaks.
 */
export async function fetchCampaignDays(
  campaignId: string,
): Promise<CampaignDay[]> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("prayer_campaign_days")
      .select("day_key")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .order("day_key", { ascending: false })
      .limit(400);
    if (error || !data) return [];
    return data as CampaignDay[];
  } catch {
    return [];
  }
}

// ── Parish groups ───────────────────────────────────────────────────────────

export type GroupResult = {
  group: CampaignGroup | null;
  members: GroupMember[];
};

/** The caller's own group for this campaign, with its roster, or null. */
export async function fetchMyGroup(campaignId: string): Promise<GroupResult> {
  try {
    const res = await apiFetch(`/api/campaigns/${campaignId}/groups`);
    if (!res.ok) return { group: null, members: [] };
    const json = (await res.json()) as Partial<GroupResult>;
    return {
      group: json.group ?? null,
      members: Array.isArray(json.members) ? json.members : [],
    };
  } catch {
    return { group: null, members: [] };
  }
}

export type CreateGroupResult = ApiResult & { inviteCode?: string };

export async function createGroup(
  campaignId: string,
  name: string,
): Promise<CreateGroupResult> {
  try {
    const res = await apiFetch(`/api/campaigns/${campaignId}/groups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      /* empty */
    }
    if (!res.ok) {
      return {
        ok: false,
        error: (json.error as string) || "Couldn't start that group.",
      };
    }
    return {
      ok: true,
      id: json.id as string | undefined,
      inviteCode: json.inviteCode as string | undefined,
    };
  } catch {
    return { ok: false, error: "Network dropped. Please try again." };
  }
}

export async function joinGroup(inviteCode: string): Promise<ApiResult> {
  try {
    const res = await apiFetch("/api/campaigns/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inviteCode }),
    });
    return readResult(res);
  } catch {
    return { ok: false, error: "Network dropped. Please try again." };
  }
}

export async function leaveGroup(groupId: string): Promise<ApiResult> {
  try {
    const res = await apiFetch("/api/campaigns/groups", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    return readResult(res);
  } catch {
    return { ok: false, error: "Network dropped. Please try again." };
  }
}

/** Turn this campaign's daily reminder on or off. Default is off. */
export async function setCampaignReminder(
  campaignId: string,
  enabled: boolean,
  time?: string,
): Promise<ApiResult> {
  try {
    const res = await apiFetch(`/api/campaigns/${campaignId}/remind`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled, time: enabled ? (time ?? "08:00") : null }),
    });
    return readResult(res);
  } catch {
    return { ok: false, error: "Network dropped. Please try again." };
  }
}

export async function leaveCampaign(id: string): Promise<ApiResult> {
  const res = await apiFetch(`/api/campaigns/${id}/pray`, { method: "DELETE" });
  return readResult(res);
}

export async function reportCampaign(
  id: string,
  reason?: string,
): Promise<ApiResult> {
  const res = await apiFetch(`/api/campaigns/${id}/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: reason || null }),
  });
  return readResult(res);
}

/** Creator takes their own campaign down for good, image included. */
export async function deleteCampaign(id: string): Promise<ApiResult> {
  const res = await apiFetch(`/api/campaigns/${id}`, { method: "DELETE" });
  return readResult(res);
}

export async function closeCampaign(
  id: string,
  status: "answered" | "memory_eternal",
): Promise<ApiResult> {
  const res = await apiFetch(`/api/campaigns/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return readResult(res);
}

// ── The signed-in user's own prayer life (self-select RLS, read direct) ──────

export type MyJoinedCampaign = {
  campaign: PrayerCampaign;
  last_prayed_at: string | null;
  prayer_days: number;
};

export type MyPrayers = {
  userId: string | null;
  joined: MyJoinedCampaign[];
  created: PrayerCampaign[];
};

const BASE_COLS =
  "id, creator_id, title, intention, for_whom, subject_name, note, prayer_key, ends_at, praying_count, prayer_count, status, created_at";

/** Same not-yet-migrated guard as lib/campaigns/catalog.ts: My Prayers reads
 *  Supabase directly, so naming image_url before the migration lands would
 *  blank the page for everyone. */
const campaignCols = (withImage: boolean) =>
  withImage ? `${BASE_COLS}, image_url` : BASE_COLS;

const missingImageColumn = (message: string | undefined) =>
  Boolean(message && /image_url/i.test(message));

export async function fetchMyPrayers(): Promise<MyPrayers> {
  const empty: MyPrayers = { userId: null, joined: [], created: [] };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const fetchBoth = (withImage: boolean) => {
    const cols = campaignCols(withImage);
    return Promise.all([
      supabase
        .from("prayer_campaign_prayers")
        .select(`last_prayed_at, prayer_days, campaign:prayer_campaigns(${cols})`)
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false }),
      supabase
        .from("prayer_campaigns")
        .select(cols)
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
  };

  let [joinedRes, createdRes] = await fetchBoth(true);
  if (
    missingImageColumn(joinedRes.error?.message) ||
    missingImageColumn(createdRes.error?.message)
  ) {
    [joinedRes, createdRes] = await fetchBoth(false);
  }

  const joined: MyJoinedCampaign[] = ((joinedRes.data ?? []) as unknown as {
    last_prayed_at: string | null;
    prayer_days: number;
    campaign: PrayerCampaign | null;
  }[])
    .filter((r) => r.campaign)
    .map((r) => ({
      campaign: r.campaign as PrayerCampaign,
      last_prayed_at: r.last_prayed_at,
      prayer_days: r.prayer_days ?? 0,
    }));

  // totalPrayerDays summed j.prayer_days across every campaign, for a tile
  // on /campaigns/mine reading "Prayers offered". The tile is gone and this
  // was its only consumer, so the sum goes with it rather than remaining as a
  // lifetime total of one reader's praying that nothing displays. The
  // per-campaign prayer_days still arrives on each row; nothing aggregates it.
  const created = (createdRes.data ?? []) as unknown as PrayerCampaign[];

  return { userId: user.id, joined, created };
}
