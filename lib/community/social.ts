import "server-only";

import type { User } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { censorName } from "@/lib/moderation/server";
import { normalizeHandle } from "@/lib/profile/handle";
import { createClientFromRequest } from "@/lib/supabase/server";

// Small pieces the Community social routes share: who is asking, which
// profile they mean, and whether Gift Plus is switched on.

export async function signedInUser(req: Request): Promise<User | null> {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** A handle from a request, normalized, or null when it cannot be one. */
export function handleFrom(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const h = normalizeHandle(value);
  return /^[a-z0-9_.]{3,24}$/.test(h) ? h : null;
}

/**
 * Gift Plus is on when the owner has created a price for it in Stripe and set
 * it on the server, with the number of days it gives. Until both are set, and
 * Stripe itself, the button never shows and the checkout route refuses.
 */
export function giftConfig(): { priceId: string; days: number } | null {
  const priceId = process.env.STRIPE_GIFT_PLUS_PRICE_ID?.trim();
  const days = Number(process.env.GIFT_PLUS_DAYS);
  if (!process.env.STRIPE_SECRET_KEY || !priceId || !Number.isInteger(days) || days < 1 || days > 3650) return null;
  return { priceId, days };
}

/** A missing table (the migration not applied yet), however the client reports it. */
export function notYet(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  return isTableAbsent(error);
}

/**
 * How an actor is named in someone else's inbox: the display name they chose,
 * never their email, and their @handle so the inbox can open their profile.
 */
export async function actorOf(
  admin: import("@supabase/supabase-js").SupabaseClient,
  user: User,
): Promise<{ name: string; handle: string | null }> {
  const meta = (user.user_metadata ?? {}) as { display_name?: string };
  const { data } = await admin.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  const name = (meta.display_name ?? "").trim().slice(0, 80);
  return {
    name: name ? await censorName(admin, name) : "A reader",
    handle: (data as { handle?: string | null } | null)?.handle ?? null,
  };
}
