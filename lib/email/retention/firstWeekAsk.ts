import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { SITE_URL } from "@/lib/site";

import { FIRST_WEEK } from "./plan";
import { retentionPosition } from "./switches";

/**
 * The welcome email's one asking line for the first-week guide, and the tap
 * that answers it (his "all recs", 2026-11-13 about 14:29 UTC, to question 3
 * of docs/plans/retention-emails.md: "A short guide for your first week,
 * three emails. Send it to me." Consent is the reader's own tap).
 *
 * THE LINE IS THERE ONLY WHEN IT IS TRUE. The guide reaches readers only when
 * its switch stands at `readers` (lib/email/retention/switches.ts: his yes to
 * its design, the first send to him alone, then his word for readers). Short
 * of that the welcome email asks nothing, because "three emails" would be a
 * promise nothing keeps.
 *
 * A TAP, NEVER A VISIT. A mail scanner opens every link in a message before
 * the reader does, so the link opens a page (/email/first-week) whose one
 * button turns the guide on, by POST (app/api/email/first-week/route.ts), as
 * the unsubscribe page does. Nothing happens on arrival.
 *
 * SIGNED TO THE ACCOUNT, FOR THIS ONE PURPOSE. The link carries the account's
 * id and a signature over it, made with a key that only the server holds and
 * that is kept for this purpose alone: derived from the service role key,
 * which the route needs anyway, by an HMAC over PURPOSE. So the link can turn
 * on the first-week guide for that one account and do nothing else, and
 * neither the unsubscribe token (which every email carries) nor any other
 * link can be used to turn a list on. No new secret to set, and no new
 * column: the guide's own column, email_preferences.first_week, is the
 * signed migration 20261113052927_retention_lists.sql. A new service role key
 * makes an unanswered link say so plainly, and nothing else.
 *
 * ONLY WHILE IT CAN STILL BE SENT. The guide's last step ends on day ten of
 * an account (FIRST_WEEK in plan.ts); a tap after that would turn on a list
 * that sends nothing, so it is refused in plain words.
 */

/** What the signature binds, besides the account: this link's one use. */
const PURPOSE = "purify:email:first_week:ask:v1";

/** The days after an account is made in which the guide can still send a step. */
export const FIRST_WEEK_OPEN_DAYS = Math.max(...FIRST_WEEK.map((s) => s.until));

const DAY = 86_400_000;

/** The page the link opens. */
export const FIRST_WEEK_PAGE = `${SITE_URL.replace(/\/$/, "")}/email/first-week`;

function purposeKey(secret: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY): Buffer | null {
  if (!secret) return null;
  return createHmac("sha256", secret).update(PURPOSE).digest();
}

/** The signature for one account, or null where the server holds no key. */
export function firstWeekSignature(userId: string, secret?: string): string | null {
  const key = purposeKey(secret);
  if (!key) return null;
  return createHmac("sha256", key).update(userId).digest("base64url");
}

/** True when the signature is this account's, compared in constant time. */
export function signatureMatches(userId: string, signature: string, secret?: string): boolean {
  const want = firstWeekSignature(userId, secret);
  if (!want) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The welcome email's link for this account, or null: no line at all while
 * the guide does not reach readers, or where the server holds no key.
 */
export function firstWeekAskLink(userId: string, secret?: string): string | null {
  if (retentionPosition("first_week") !== "readers") return null;
  const signature = firstWeekSignature(userId, secret);
  if (!signature) return null;
  return `${FIRST_WEEK_PAGE}?u=${encodeURIComponent(userId)}&s=${encodeURIComponent(signature)}`;
}

/** The welcome email's words for it: the line, and the link's own words. */
export { FIRST_WEEK_ASK } from "./firstWeekWords";

export type FirstWeekAnswer =
  /** Turned on: the guide's next step comes with the next day's run. */
  | "on"
  /** The account is past the guide's days: nothing is turned on. */
  | "past"
  /** The guide is not reaching readers just now: nothing is turned on. */
  | "paused"
  /** The account or its column is not there: nothing is turned on. */
  | "unknown";

/**
 * The tap's answer, through the service role: the guide turned on for this
 * account, or why not. The caller has checked the signature.
 */
export async function turnOnFirstWeek(admin: SupabaseClient, userId: string, now: Date = new Date()): Promise<FirstWeekAnswer> {
  if (retentionPosition("first_week") !== "readers") return "paused";
  const { data: profile, error: readError } = await admin.from("profiles").select("joined_at").eq("id", userId).maybeSingle();
  if (readError) throw new Error(`profiles: ${readError.message}`);
  const made = Date.parse((profile as { joined_at?: string | null } | null)?.joined_at ?? "");
  if (!Number.isFinite(made)) return "unknown";
  if ((now.getTime() - made) / DAY >= FIRST_WEEK_OPEN_DAYS) return "past";
  const { error } = await admin
    .from("email_preferences")
    .upsert({ user_id: userId, first_week: true, updated_at: now.toISOString() }, { onConflict: "user_id" });
  if (error && isColumnAbsent(error)) return "unknown";
  if (error) throw new Error(`email_preferences.first_week: ${error.message}`);
  return "on";
}
