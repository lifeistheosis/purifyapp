import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { feastsOn } from "@/lib/calendar/orthodox";

import { sendMarketingTo, type MarketingReport } from "./marketing";
import { nameDayBody, type ShopPiece } from "./templates/shopBodies";

/**
 * Name days, from the daily lifecycle job: on the morning of a saint's feast,
 * a short note to every reader who chose that saint as their patron.
 *
 * The one email a generic store could not send, and where the shop and the
 * library meet: when the shop carries an icon of that saint, the note says so,
 * once. It rides the library list's consent, so a reader with the list off gets
 * nothing whatever patron they chose.
 *
 * New calendar, like everything else server-side, because a reader's reckoning
 * is not readable here yet. Once a year per reader: keyed on the year and the
 * saint, so a second run the same day, or a saint with two feasts, is fine.
 */

/** Which of today's saints each reader chose. Pure. */
export function nameDayMatches(
  todaysSlugs: readonly string[],
  profiles: readonly { id: string; patron_saint: string | null }[],
): Map<string, string> {
  const today = new Set(todaysSlugs);
  const out = new Map<string, string>();
  for (const p of profiles) if (p.patron_saint && today.has(p.patron_saint)) out.set(p.id, p.patron_saint);
  return out;
}

/** The first published icon the shop tags with each saint. Pure. */
export function piecesBySaint(
  rows: readonly { subject_slug: string; product: { title: string; slug: string; price_cents: number; status: string } | null }[],
): Map<string, ShopPiece> {
  const out = new Map<string, ShopPiece>();
  for (const r of rows) {
    if (!r.product || r.product.status !== "published" || out.has(r.subject_slug)) continue;
    out.set(r.subject_slug, { title: r.product.title, slug: r.product.slug, priceCents: r.product.price_cents });
  }
  return out;
}

export async function runNameDays(
  admin: SupabaseClient,
  now: Date,
  /** The day's bulk budget left for these (lib/email/budget.ts). */
  limit?: number,
): Promise<{ matched: number; report: MarketingReport | null; errors: string[] }> {
  const errors: string[] = [];
  const saints = feastsOn(now);
  if (saints.length === 0) return { matched: 0, report: null, errors };
  const names = new Map(saints.map((s) => [s.slug, s.name]));

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, patron_saint")
    .in("patron_saint", [...names.keys()])
    .limit(20000);
  if (error) {
    errors.push(`profiles.patron_saint: ${error.message}`);
    return { matched: 0, report: null, errors };
  }
  const matches = nameDayMatches([...names.keys()], (profiles ?? []) as { id: string; patron_saint: string | null }[]);
  if (matches.size === 0) return { matched: 0, report: null, errors };

  const { data: subjects, error: subjectError } = await admin
    .from("shop_product_subjects")
    .select("subject_slug, product:shop_products(title, slug, price_cents, status)")
    .eq("subject_type", "saint")
    .in("subject_slug", [...new Set(matches.values())]);
  if (subjectError) errors.push(`shop_product_subjects: ${subjectError.message}`);
  const pieces = piecesBySaint(
    ((subjects ?? []) as unknown as {
      subject_slug: string;
      product: { title: string; slug: string; price_cents: number; status: string } | null;
    }[]),
  );

  const year = now.getUTCFullYear();
  const report = await sendMarketingTo(admin, {
    list: "product_updates",
    kind: "name_day",
    limit,
    only: new Set(matches.keys()),
    keyFor: (id) => `name_day:${id}:${year}:${matches.get(id)}`,
    body: (s) => {
      const slug = matches.get(s.userId)!;
      return nameDayBody({ saintName: names.get(slug) ?? slug, saintSlug: slug, piece: pieces.get(slug) ?? null });
    },
  });
  errors.push(...report.errors);
  return { matched: matches.size, report, errors };
}
