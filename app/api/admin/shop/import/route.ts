import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { safeOutboundUrl } from "@/lib/security/outboundUrl";
import { rateLimited } from "@/lib/security/ratelimit";
import {
  challengeIn,
  parseListing,
  parseShopifyProduct,
  shopifyProductJsonUrl,
  slugify,
  type ParsedListing,
} from "@/lib/shop/importListing";
import { storeShopImage } from "@/lib/shop/shopMedia";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Turn a distributor's product link into a draft listing.
 *
 * Paste a link in the Shop tab, this fetches the page, reads the listing out of
 * it (lib/shop/importListing.ts does the reading), pulls the pictures into our
 * own bucket, and hands back a draft. NOTHING IS SAVED HERE. The draft opens in
 * the product editor and the owner presses Save, so an import can never quietly
 * publish a listing or overwrite one.
 *
 * WHEN THE SHOP BLOCKS US. Some distributors sit behind Cloudflare or a
 * CAPTCHA, and a server fetch from Render gets the challenge page rather than
 * the product. That is not solvable from here, and solving it from here is not
 * something this repo does. The route says what is in the way and the panel
 * offers the way through: the owner opens the page in his own browser where he
 * is already a human with a session, saves or copies the page source, and
 * pastes it in. The same parser then runs on the pasted HTML, so the import
 * finishes identically. `html` in the body is that path.
 *
 * THE FETCH IS NARROW ON PURPOSE. Admin-gated, rate limited, http(s) only,
 * public hosts only (no localhost, no private ranges, no odd ports), one
 * redirect chain, 12 seconds, 3MB of HTML, 6 images at 8MB each. A URL a user
 * hands a server is a request the server makes on their behalf, and this one is
 * pointed at the open internet, never inward.
 */

export const runtime = "nodejs";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const PAGE_TIMEOUT_MS = 12_000;
const IMAGE_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_IMAGES_INGESTED = 6;

const bodySchema = z.object({
  url: z.string().min(4).max(2000),
  /** Page source the owner pasted after clearing a challenge himself. */
  html: z.string().max(4_000_000).optional(),
  /**
   * Copy the pictures into our own bucket. OFF BY DEFAULT, and the default is
   * the whole point. lib/shop/imageRights.ts hides any listing whose primary
   * photo still sits on a supplier's CDN, because that photo is the supplier's
   * copyright and not ours. That gate reads the URL's host, so downloading a
   * supplier photo into our bucket would walk a listing straight past it while
   * changing nothing about who owns the picture. Copying is therefore a claim
   * the owner makes deliberately, and the panel ties it to the sourcing row's
   * resaleRightsConfirmed flag.
   */
  withImages: z.boolean().default(false),
});

async function fetchText(
  url: string,
  accept: string,
): Promise<{ text: string; status: number; finalUrl: string } | { error: string }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      headers: {
        "user-agent": BROWSER_UA,
        accept,
        "accept-language": "en-US,en;q=0.9",
      },
    });
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_HTML_BYTES) return { error: "That page is too big to read (over 3MB)." };
    const text = (await res.text()).slice(0, MAX_HTML_BYTES);
    return { text, status: res.status, finalUrl: res.url || url };
  } catch (e) {
    const msg = (e as Error).name === "TimeoutError" ? "The page took too long to answer." : "Could not reach that page.";
    return { error: msg };
  }
}

/** Pull the pictures into our own bucket so a listing cannot go blank when a
 *  distributor rotates a CDN path. Failures are reported, never fatal. */
async function ingestImages(
  urls: string[],
  warnings: string[],
): Promise<{ sourceUrl: string; url: string }[]> {
  const admin = createAdminClient();
  const out: { sourceUrl: string; url: string }[] = [];
  for (const sourceUrl of urls.slice(0, MAX_IMAGES_INGESTED)) {
    try {
      const res = await fetch(sourceUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
        headers: { "user-agent": BROWSER_UA, accept: "image/*,*/*;q=0.8" },
      });
      if (!res.ok) {
        warnings.push(`A picture would not download (HTTP ${res.status}).`);
        continue;
      }
      const type = res.headers.get("content-type") ?? "";
      const bytes = await res.arrayBuffer();
      const name = new URL(sourceUrl).pathname.split("/").pop() || "image";
      const stored = await storeShopImage(admin, bytes, type, name);
      if ("error" in stored) {
        warnings.push(`A picture was skipped: ${stored.error}`);
        continue;
      }
      out.push({ sourceUrl, url: stored.url });
    } catch {
      warnings.push("A picture timed out while downloading.");
    }
  }
  return out;
}

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (await rateLimited(`shop-import:${adminUser.id}`, 60, 20)) {
    return NextResponse.json(
      { error: "That is a lot of imports in one minute. Give it a moment." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const checked = safeOutboundUrl(parsed.data.url);
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
  const pageUrl = checked.url.toString();

  let listing: ParsedListing | null = null;
  let pastedUsed = false;

  if (parsed.data.html && parsed.data.html.trim()) {
    // The owner's own browser did the fetching. Trust it over anything we
    // could get from here, challenge or no challenge.
    listing = parseListing(parsed.data.html, pageUrl);
    pastedUsed = true;
  } else {
    // Shopify hands over a clean product JSON at <url>.json. Worth one try
    // before parsing a page of markup.
    const jsonUrl = shopifyProductJsonUrl(pageUrl);
    if (jsonUrl) {
      const got = await fetchText(jsonUrl, "application/json");
      if (!("error" in got) && got.status === 200) {
        try {
          listing = parseShopifyProduct(JSON.parse(got.text), pageUrl);
        } catch {
          /* not Shopify after all, or a themed 200 that is really HTML */
        }
      }
    }

    if (!listing) {
      const got = await fetchText(pageUrl, "text/html,application/xhtml+xml");
      if ("error" in got) return NextResponse.json({ error: got.error }, { status: 502 });

      const challenge = challengeIn(got.text, got.status);
      if (challenge) {
        return NextResponse.json({
          ok: false,
          blocked: true,
          challenge,
          status: got.status,
          url: pageUrl,
          message: `That shop answered with ${challenge} instead of the product.`,
        });
      }
      if (got.status >= 400) {
        return NextResponse.json(
          { error: `The shop answered HTTP ${got.status}.` },
          { status: 502 },
        );
      }
      listing = parseListing(got.text, got.finalUrl);
    }
  }

  if (!listing || (!listing.title && listing.priceCents === null && listing.images.length === 0)) {
    return NextResponse.json({
      ok: false,
      blocked: false,
      url: pageUrl,
      message:
        "Nothing on that page looked like a product. Check the link points at one item, not a category.",
    });
  }

  const warnings = [...listing.warnings];
  if (pastedUsed) warnings.push("Read from the page source you pasted.");

  // TEMU'S ITEM ID IS NOT ON THE PAGE. The number its Share menu shows as the
  // Item ID never reaches a server: Temu answers a server's fetch with a
  // sign-in wall (checked 2026-09-18), and a page source pasted from a browser
  // carries the variant's sku_id as `sku`, which is a different number. Stored
  // as the Supplier SKU it was the wrong ID on every Temu import, so the field
  // is left empty and the note says where the right one lives.
  if (/(^|\.)temu\.com$/i.test(checked.url.hostname)) {
    warnings.push(
      listing.sku
        ? `Supplier SKU left empty: the ${listing.sku} on the page is Temu's variant id, not the Item ID. Copy the Item ID from Temu's Share menu.`
        : "Copy the Item ID from Temu's Share menu into Supplier SKU.",
    );
    listing = { ...listing, sku: null };
  }
  // The cost field is dollars. A distributor priced in pounds would otherwise
  // be stored as if 51.77 GBP were 51.77 USD and every margin after it would
  // be quietly wrong.
  if (listing.currency && listing.currency !== "USD") {
    warnings.push(
      `That shop prices in ${listing.currency}. The cost box is in dollars, so convert it before saving.`,
    );
  }

  const images =
    parsed.data.withImages && listing.images.length
      ? await ingestImages(listing.images, warnings)
      : [];

  return NextResponse.json({
    ok: true,
    listing,
    images,
    slug: listing.title ? slugify(listing.title) : "",
    supplierHost: checked.url.hostname.replace(/^www\./, ""),
    supplierUrl: listing.canonicalUrl ?? pageUrl,
    warnings,
  });
}
