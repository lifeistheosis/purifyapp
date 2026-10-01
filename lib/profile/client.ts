// The profile routes, from client code. apiFetch so the native app reaches
// purifyapp.net with its bearer token; the web stays same-origin.
//
// Every call answers { ok, ... } instead of throwing, with the server's
// `code` passed through, because the editor turns codes like
// "handle_taken" or "plus_required" into its own words.

import { apiFetch } from "@/lib/api/client";

import type { MyProfile, PublicProfile } from "./publicProfile";

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
