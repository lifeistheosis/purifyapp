"use client";

// The clergy's answers sent as a request for the clergy seal (1.8.x, the
// owner's note 54). Answering priest or deacon in the welcome questions never
// shows a mark: it files a request into the queue the team already works
// (app/api/profile/clergy, the clergy_verifications table, the admin's Users
// "Waiting on you" with Verify and Decline), and the seal appears only once
// the team has verified it.
//
// Sent once the questions end, so an answer changed on the way back is the
// one sent. Signed out, it waits on the device and goes at the next sign-in
// (components/profile/ProfilePrefsBridge.tsx). It never overwrites a request
// already with the team or a verified seal: the team's side is read first.
// Never in Testers mode (./testing.ts), where the device holds a test.

import { apiFetch } from "@/lib/api/client";
import type { MyClergy } from "@/lib/profile/clergy";
import { requestClergy } from "@/lib/profile/client";
import { createClient } from "@/lib/supabase/client";

import { asksClergy, clergyComplete, clergyRequestBody, countryName, isClergyRole } from "./clergy";
import { readClergy, readClergyRequest, readLevel, readRole, writeClergyRequest } from "./state";
import { isTesting } from "./testing";

/** A send that failed is tried again after this long, at a sign-in or a page load. */
export const RETRY_MS = 6 * 60 * 60 * 1000;

/**
 *   sent      filed now
 *   already   filed before, or the team already has a request or a seal
 *   pending   kept on the device: signed out, or the send failed
 *   nothing   no complete priest's or deacon's answers to send, or Testers mode
 *   refused   the request was turned back as it stands (a filtered word):
 *             not tried again; the profile's own card can ask
 */
export type FileOutcome = "sent" | "already" | "pending" | "nothing" | "refused";

async function signedIn(): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await createClient().auth.getSession();
    return Boolean(session);
  } catch {
    return false;
  }
}

/** The team's side of this reader's request, or null when it cannot be read. */
async function theirSide(): Promise<MyClergy | null> {
  try {
    const r = await apiFetch("/api/profile/clergy", { cache: "no-store" });
    if (!r.ok) return null;
    const body = (await r.json()) as { clergy?: MyClergy };
    return body.clergy ?? null;
  } catch {
    return null;
  }
}

// One send at a time: a sign-in can announce itself twice in a breath
// (INITIAL_SESSION, then SIGNED_IN), and the second call waits on the first.
let inflight: Promise<FileOutcome> | null = null;

/** Send the request if the answers ask for one. Safe to call more than once. */
export function fileClergyRequest(): Promise<FileOutcome> {
  inflight ??= send().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function send(): Promise<FileOutcome> {
  if (typeof window === "undefined" || isTesting()) return "nothing";
  const role = readRole();
  const answers = readClergy();
  if (!asksClergy(readLevel()) || !isClergyRole(role) || !clergyComplete(role, answers)) {
    // Nothing to send now: a wait kept for earlier answers goes with them.
    if (readClergyRequest()?.state === "pending") writeClergyRequest(null);
    return "nothing";
  }
  if (readClergyRequest()?.state === "sent") return "already";
  if (!(await signedIn())) {
    writeClergyRequest({ state: "pending" });
    return "pending";
  }
  const mine = await theirSide();
  if (!mine) {
    writeClergyRequest({ state: "pending", tried: Date.now() });
    return "pending";
  }
  if (mine.status === "requested" || mine.status === "verified") {
    writeClergyRequest({ state: "sent" });
    return "already";
  }
  const body = clergyRequestBody(role, answers, { countryEn: countryName(answers.country ?? "", "en") });
  const res = await requestClergy(body);
  if (res.ok || res.code === "verified") {
    writeClergyRequest({ state: "sent" });
    return res.ok ? "sent" : "already";
  }
  if (res.code === "filtered" || res.code === "invalid") {
    writeClergyRequest(null);
    return "refused";
  }
  // Signed out since (401): wait for the next sign-in. Anything else: wait, and try later.
  writeClergyRequest(res.status === 401 ? { state: "pending" } : { state: "pending", tried: Date.now() });
  return "pending";
}

/** At a sign-in or a page load: send a request that was waiting, unless it failed only lately. */
export async function flushClergyRequest(now: number = Date.now()): Promise<FileOutcome | null> {
  const kept = readClergyRequest();
  if (kept?.state !== "pending") return null;
  if (kept.tried !== undefined && now - kept.tried < RETRY_MS) return null;
  return fileClergyRequest();
}
