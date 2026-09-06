"use client";

// The account half of collection progress: what the device posts after a
// correct answer, and the sign-in handshake.
//
// Posture is lib/profile/preferences.ts's. Local is the source of truth on
// the device; the server copy exists so a reinstall or a second phone does
// not forget what the reader has answered. Every call fails silent: progress
// is a garnish, no part of the app may block on it, and a table that is not
// there yet costs nothing but the sync.
//
// Merge rule: the server unions what the device sends and the device unions
// what the account holds. Neither side ever shrinks, on any path.

import { apiFetch } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { readLocalSessionUser } from "@/lib/supabase/localSession";

import {
  mergeRemoteProgress,
  readCollectionProgress,
  type RemoteProgressRow,
} from "./progressLocal";

export type ProgressEntry = { slug: string; question_ids: string[] };

/**
 * Post what was gained to the reader's own rows. Fire and forget; a failed
 * post changes nothing on the device, and the next sign-in pushes again.
 */
export function postCollectionProgress(entries: readonly ProgressEntry[]): void {
  const send = entries.filter((e) => e.question_ids.length > 0);
  if (send.length === 0 || !readLocalSessionUser()) return;
  void apiFetch("/api/catechism/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries: send }),
    keepalive: true,
  }).catch(() => {});
}

/** Push every set the device holds. The server unions, so this is safe to repeat. */
export async function pushCollectionProgress(): Promise<void> {
  try {
    const entries = Object.entries(readCollectionProgress())
      .filter(([, p]) => p.ids.length > 0)
      .map(([slug, p]) => ({ slug, question_ids: p.ids }));
    if (entries.length === 0) return;
    await apiFetch("/api/catechism/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
  } catch {
    /* offline, signed out, or the table is not there: the device copy stands */
  }
}

/** Pull the account's rows (RLS, self only) and fill what the device lacks. */
export async function pullCollectionProgress(): Promise<void> {
  try {
    const supa = createClient();
    const {
      data: { user },
    } = await supa.auth.getUser();
    if (!user) return;
    const { data, error } = await supa
      .from("collection_progress")
      .select("slug, correct_question_ids, completed_at")
      .eq("user_id", user.id);
    if (error || !data) return;
    mergeRemoteProgress(data as RemoteProgressRow[]);
  } catch {
    /* ignore */
  }
}

/**
 * Sign-in handshake, the same shape as syncProfilePrefsOnSignIn: pull
 * first so the account's completions land on the device, then push so the
 * account has what the device gathered while signed out.
 */
export async function syncCollectionProgressOnSignIn(): Promise<void> {
  await pullCollectionProgress();
  await pushCollectionProgress();
}
