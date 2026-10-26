import "server-only";

import { createClientFromRequest } from "@/lib/supabase/server";

/** The signed-in reader, proved by their own token (bearer in the apps, cookie on the web). */
export async function circleUser(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** The name a circle shows for a member: their display name, else the start of their email. */
export function memberName(user: { email?: string; user_metadata?: Record<string, unknown> }): string {
  const meta = user.user_metadata ?? {};
  const given = typeof meta.display_name === "string" ? meta.display_name.trim() : "";
  if (given) return given.slice(0, 80);
  const local = user.email?.split("@")[0];
  return (local || "Reader").slice(0, 80);
}

/** The row Supabase gives for an embedded relation: one object, or a list of one. */
export function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}
