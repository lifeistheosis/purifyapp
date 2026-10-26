// Read together (1.8), from client code: apiFetch, so the apps reach
// purifyapp.net with the reader's bearer token and the web stays
// same-origin. Every call answers { ok, ... } instead of throwing, with the
// server's message passed through for the screen to show.

import { apiFetch } from "@/lib/api/client";

import type { Circle, CircleKind } from "./circles";

export type CircleError = { ok: false; status: number; error: string };

async function fail(r: Response): Promise<CircleError> {
  const body = (await r.json().catch(() => null)) as { error?: string } | null;
  return { ok: false, status: r.status, error: body?.error ?? "" };
}

const OFFLINE: CircleError = { ok: false, status: 0, error: "" };

async function send<T>(path: string, init?: RequestInit): Promise<({ ok: true } & T) | CircleError> {
  try {
    const r = await apiFetch(path, { cache: "no-store", ...init });
    if (!r.ok) return fail(r);
    return { ok: true, ...((await r.json()) as T) };
  } catch {
    return OFFLINE;
  }
}

const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** The reader's circles on a path, with their members and who read each day. */
export function fetchCircles(pathId: string) {
  return send<{ circles: Circle[] }>(`/api/circles?path=${encodeURIComponent(pathId)}`);
}

export function createCircle(input: { name: string; kind: CircleKind; pathId: string }) {
  return send<{ id: string; inviteCode: string }>("/api/circles", json(input));
}

export function joinCircle(inviteCode: string) {
  return send<{ id: string; name: string; pathId: string; alreadyMember: boolean }>("/api/circles/join", json({ inviteCode }));
}

/** Tell the reader's circles on a path that a day is read, or not. */
export function markCircleDay(pathId: string, day: number, read: boolean) {
  return send<{ circles: number }>("/api/circles/read", json({ pathId, day, read }));
}

export function leaveCircle(id: string) {
  return send<Record<string, never>>(`/api/circles/${id}`, { method: "DELETE" });
}
