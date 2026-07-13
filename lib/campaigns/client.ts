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
  blessing: true;
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

const CAMPAIGN_COLS =
  "id, creator_id, title, intention, for_whom, subject_name, note, praying_count, prayer_count, status, created_at";

export async function fetchMyPrayers(): Promise<MyPrayers> {
  const empty: MyPrayers = { userId: null, joined: [], created: [], totalPrayerDays: 0 };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const [joinedRes, createdRes] = await Promise.all([
    supabase
      .from("prayer_campaign_prayers")
      .select(`last_prayed_at, prayer_days, campaign:prayer_campaigns(${CAMPAIGN_COLS})`)
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false }),
    supabase
      .from("prayer_campaigns")
      .select(CAMPAIGN_COLS)
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

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
