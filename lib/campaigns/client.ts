"use client";

// Client-side calls for Prayer Campaigns. Public reads and every write go
// through the API via apiFetch (native rewrites to SITE_URL + Bearer); the
// user's own join/activity rows are read straight from Supabase under RLS
// (self-select), the same split the shop uses.

import { apiFetch } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import type {
  CampaignIntention,
  ForWhom,
  PrayerCampaign,
} from "./campaigns";

export async function fetchCampaigns(
  intention?: CampaignIntention,
): Promise<PrayerCampaign[]> {
  const qs = intention ? `?intention=${intention}` : "";
  const res = await apiFetch(`/api/campaigns${qs}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { campaigns?: PrayerCampaign[] };
  return json.campaigns ?? [];
}

export async function fetchCampaign(id: string): Promise<PrayerCampaign | null> {
  const res = await apiFetch(`/api/campaigns/${id}`);
  if (!res.ok) return null;
  const json = (await res.json()) as { campaign?: PrayerCampaign };
  return json.campaign ?? null;
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

export type PrayResult = ApiResult & { alreadyToday?: boolean };

export async function prayCampaign(id: string): Promise<PrayResult> {
  const res = await apiFetch(`/api/campaigns/${id}/pray`, { method: "POST" });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty */
  }
  if (!res.ok) {
    return { ok: false, error: (json.error as string) || "Couldn't record it." };
  }
  return { ok: true, alreadyToday: Boolean(json.alreadyToday) };
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
  totalPrayerDays: number;
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
  const empty: MyPrayers = { userId: null, joined: [], created: [], totalPrayerDays: 0 };
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

  const totalPrayerDays = joined.reduce((n, j) => n + j.prayer_days, 0);
  const created = (createdRes.data ?? []) as unknown as PrayerCampaign[];

  return { userId: user.id, joined, created, totalPrayerDays };
}
