import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isoDay } from "@/lib/calendar/orthodox";
import { libraryCounts } from "@/lib/content/libraryCounts";
import { listProducts } from "@/lib/shop/catalog";
import { isFeastIcon, nextFeastDrop } from "@/lib/shop/feasts";
import { isoWeekOf } from "@/lib/whatsNew/boardShape";
import { getPatchNotes } from "@/lib/whatsNew/notes";
import { RELEASE_EMAIL } from "@/lib/whatsNew/releaseEmail";
import { CURRENT_VERSION, featureRelease } from "@/lib/whatsNew/version";

import { latestCampaign, type CampaignKind } from "./campaigns";
import type { MarketingList } from "./lists";
import { longDate } from "./templates/build";
import { monthlyBody, releaseBody, weeklyBody, type LibraryCounts } from "./templates/contentBodies";
import type { MarketingBody } from "./templates/marketingBodies";
import { shopFeastBody, shopGreatFeastBody, shopNewBody, type ShopPiece } from "./templates/shopBodies";
import { weekAhead } from "./weekly";

/**
 * A campaign built from what the app already knows, so nobody writes copy to
 * send one. The admin Email tab previews exactly this and the send route
 * rebuilds it on the server rather than trusting what the browser previewed.
 *
 * `body` is null with a `reason` when there is honestly nothing to send: no
 * piece has arrived since the last shop email, nothing was added this month, no
 * note exists for the current release.
 */

export type CampaignDraft = {
  kind: CampaignKind;
  list: MarketingList;
  /** Once-only key with kind, e.g. "2026-W38", "2026-09", "1.4", "nativity-2026". */
  periodKey: string;
  body: MarketingBody | null;
  reason: string | null;
  details: Record<string, unknown>;
};

export const CAMPAIGN_KINDS: readonly CampaignKind[] = ["weekly", "monthly", "release", "shop_new", "shop_feast"];

export function isCampaignKind(x: unknown): x is CampaignKind {
  return typeof x === "string" && (CAMPAIGN_KINDS as readonly string[]).includes(x);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

async function publishedPieces(admin: SupabaseClient): Promise<(ShopPiece & { id: string })[]> {
  const { data, error } = await admin
    .from("shop_products")
    .select("id, title, slug, price_cents, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`shop_products: ${error.message}`);
  return ((data ?? []) as { id: string; title: string; slug: string; price_cents: number }[]).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    priceCents: p.price_cents,
  }));
}

/** Every product id any earlier "new in the shop" email already announced. */
async function announcedProductIds(admin: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await admin.from("email_campaigns").select("details").eq("kind", "shop_new").limit(500);
  if (error) throw new Error(`email_campaigns: ${error.message}`);
  const ids = new Set<string>();
  for (const row of (data ?? []) as { details: { productIds?: unknown } }[]) {
    if (Array.isArray(row.details?.productIds)) for (const id of row.details.productIds) ids.add(String(id));
  }
  return ids;
}

export async function draftCampaign(
  admin: SupabaseClient,
  kind: CampaignKind,
  now: Date = new Date(),
): Promise<CampaignDraft> {
  const today = isoDay(now);

  switch (kind) {
    case "weekly": {
      const week = weekAhead(now);
      return {
        kind,
        list: "product_updates",
        periodKey: isoWeekOf(today),
        body: week.lines.length ? weeklyBody(week) : null,
        reason: week.lines.length ? null : "The calendar has nothing for the coming week.",
        details: { from: today, days: week.lines.map((l) => ({ day: l.day, name: l.name, kind: l.kind })) },
      };
    }

    case "monthly": {
      // In the first week of a month the note is about the month that just
      // ended; otherwise it is about this month so far.
      const reportMonth =
        now.getUTCDate() <= 7 ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)) : now;
      const periodKey = `${reportMonth.getUTCFullYear()}-${String(reportMonth.getUTCMonth() + 1).padStart(2, "0")}`;
      const counts = await libraryCounts();
      const last = await latestCampaign(admin, "monthly");
      const before = (last?.details?.counts as LibraryCounts | undefined) ?? null;
      const body = monthlyBody({ monthLabel: MONTHS[reportMonth.getUTCMonth()], now: counts, before });
      return {
        kind,
        list: "product_updates",
        periodKey,
        body,
        reason: body ? null : "Nothing was added to the library since the last monthly note.",
        details: { counts, before },
      };
    }

    case "release": {
      // Hard push only: the note for the release this build belongs to. A
      // soft push gets no note and so no email, an older note is history, and
      // a patch (1.5.1) announces nothing of its own: the email is its
      // release's (1.5), sent once.
      const announced = featureRelease(CURRENT_VERSION);
      const { entries } = await getPatchNotes();
      const entry = entries.find((e) => e.version === announced) ?? null;
      return {
        kind,
        list: "product_updates",
        periodKey: announced,
        // The letter's picture and points belong to one release; an older
        // release's never head a newer note, which sends its blurb instead.
        body: entry ? releaseBody(entry, RELEASE_EMAIL.version === entry.version ? RELEASE_EMAIL : null) : null,
        reason: entry ? null : `There is no published note for ${announced}.`,
        details: { version: announced },
      };
    }

    case "shop_new": {
      const [pieces, announced] = await Promise.all([publishedPieces(admin), announcedProductIds(admin)]);
      const fresh = pieces.filter((p) => !announced.has(p.id));
      return {
        kind,
        list: "shop_offers",
        periodKey: today,
        body: fresh.length ? shopNewBody(fresh) : null,
        reason: fresh.length ? null : "Every published piece has already been announced.",
        details: { productIds: fresh.map((p) => p.id) },
      };
    }

    case "shop_feast": {
      // The next feast email (lib/shop/feasts.ts): the Nativity Fast or
      // Pascha as always, or a great feast the shop has a piece for. `until`
      // ends the send on the day itself (the campaign route), so nobody is
      // told about a feast that has passed.
      const catalogue = await listProducts({ limit: 60 });
      const next = nextFeastDrop(now, catalogue);
      const on = longDate(next.date).replace(/, \d{4}$/, "");
      const until = new Date(next.date.getTime()).toISOString();
      if (next.kind === "feast" && next.feast) {
        const pieces = next.pieces.slice(0, 6);
        const pieceKind = isFeastIcon(next.feast, pieces[0]) ? "feast_icon" : next.feast.person;
        return {
          kind: "shop_feast",
          list: "shop_offers",
          periodKey: next.periodKey,
          body: shopGreatFeastBody({
            name: next.name,
            on,
            kind: pieceKind,
            pieces: pieces.map((p) => ({ title: p.title, slug: p.slug, priceCents: p.price_cents })),
          }),
          reason: null,
          details: { feast: next.key, until, productIds: pieces.map((p) => p.id) },
        };
      }
      const pieces = (await publishedPieces(admin)).slice(0, 6);
      const feast = next.key === "pascha" ? "pascha" : "nativity";
      return {
        kind,
        list: "shop_offers",
        periodKey: next.periodKey,
        body: pieces.length ? shopFeastBody({ feast, begins: on, pieces }) : null,
        reason: pieces.length ? null : "There are no published pieces to show.",
        details: { feast, until, productIds: pieces.map((p) => p.id) },
      };
    }
  }
}
