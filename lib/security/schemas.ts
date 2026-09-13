import { z } from "zod";

import { CLASSIFICATION_LABELS } from "@/lib/shop/format";
import type { ShopClassification } from "@/lib/shop/types";

// Central registry for request-body schemas. One per route. Keeps validation
// logic out of route handlers and reusable from tests.

/**
 * The listing vocabulary, read off the label table the FORM renders from
 * rather than retyped beside it. Retyping is how the seller listing schema
 * came to accept five classifications while the form offered ten.
 *
 * z.enum needs a non-empty tuple, hence the assertion; CLASSIFICATION_LABELS
 * is a Record over the full union, so it can never actually be empty.
 */
export const SHOP_CLASSIFICATIONS = Object.keys(CLASSIFICATION_LABELS) as [
  ShopClassification,
  ...ShopClassification[],
];

/** /api/track POST body. */
export const trackSchema = z.object({
  // 16–64 chars, URL-safe alphabet. UUID + a few extras.
  sessionId: z
    .string()
    .min(16)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "sessionId must be url-safe"),
  // Site-relative paths only. Reject newline / null / parent-segment / scheme.
  path: z
    .string()
    .min(1)
    .max(512)
    .startsWith("/", "path must start with /")
    .refine(
      (s) => !/[\r\n\0]/.test(s) && !s.includes("..") && !s.startsWith("//"),
      "path contains forbidden characters",
    ),
  referrer: z.string().max(512).optional().nullable(),
});

/** /api/shop/cart/sync POST body — a client-generated cart token plus the
 * cart snapshot. Analytics/recovery only; never trusted for money. */
export const cartSyncSchema = z.object({
  cartToken: z.string().uuid(),
  items: z
    .array(
      z.object({
        slug: z.string().min(1).max(200),
        title: z.string().max(200).optional().default(""),
        quantity: z.number().int().min(1).max(10),
        unitPriceCents: z.number().int().min(0).max(10_000_000),
      }),
    )
    .max(50),
  subtotalCents: z.number().int().min(0).max(100_000_000),
  currency: z.string().max(8).optional().nullable(),
});

/** CSP report body (browsers send "application/csp-report" with this shape). */
export const cspReportSchema = z.object({
  "csp-report": z
    .object({
      "document-uri": z.string().max(2048).optional(),
      referrer: z.string().max(2048).optional(),
      "violated-directive": z.string().max(256).optional(),
      "effective-directive": z.string().max(256).optional(),
      "blocked-uri": z.string().max(2048).optional(),
      "source-file": z.string().max(2048).optional(),
      "line-number": z.number().int().optional(),
      "column-number": z.number().int().optional(),
      disposition: z.string().max(32).optional(),
    })
    .passthrough(),
});

/** /api/shop/requests POST body (Request an Icon). Anonymous allowed:
 * email is required only when the caller is signed out — the route
 * enforces that pairing, the schema validates shapes. */
export const shopIconRequestSchema = z.object({
  subject: z.string().min(2).max(200),
  saintSlug: z
    .string()
    .max(100)
    .regex(/^[a-z0-9-]+$/, "slug format")
    .optional()
    .nullable(),
  requestType: z.enum(["ready_made", "custom", "either"]),
  preferredSize: z.string().max(100).optional().nullable(),
  productPreference: z.string().max(200).optional().nullable(),
  budgetBand: z
    .enum(["under_50", "50_100", "100_250", "250_500", "500_plus", "unsure"])
    .optional()
    .nullable(),
  desiredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional()
    .nullable(),
  notes: z.string().max(2000).optional().nullable(),
  email: z.string().email().max(320).optional().nullable(),
  notify: z.boolean().optional(),
});

/** /api/shop/applications POST body (Sell on Purify). Signed-in only;
 * the route derives user identity from the session, never the body. */
export const shopMerchantApplicationSchema = z.object({
  proposedStoreName: z.string().min(2).max(120),
  sellerType: z.enum([
    "independent_iconographer",
    "monastery",
    "workshop",
    "retailer",
  ]),
  legalName: z.string().min(2).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(40).optional().nullable(),
  country: z.string().min(2).max(100),
  shippingOrigin: z.string().max(200).optional().nullable(),
  portfolioUrl: z
    .string()
    .url()
    .max(500)
    .refine(
      (u) => u.startsWith("https://") || u.startsWith("http://"),
      "portfolio must be an http(s) link",
    )
    .optional()
    .nullable(),
  productMethods: z.array(z.string().max(100)).max(20).default([]),
  fulfillmentOfferings: z
    .array(z.enum(["ready_made", "made_to_order", "commission"]))
    .max(3)
    .default([]),
  processingTime: z.string().max(200).optional().nullable(),
  countriesServed: z.string().max(500).optional().nullable(),
  returnPolicy: z.string().max(2000).optional().nullable(),
  rightsDeclaration: z.literal(true),
  sellerDescription: z.string().max(3000).optional().nullable(),
  agreedStandards: z.literal(true),
});

/** /api/shop/checkout POST body. Deliberately tiny: the server looks up
 * price, availability, and shipping itself — a client can only say WHAT
 * it wants, never what it costs. `termsAccepted` must be literally true:
 * the checkout checkbox is clickwrap and the server refuses without it.
 * Two accepted shapes: buy-now (a single productSlug, the original form)
 * and the cart (items[]). */
const shopCheckoutItem = z.object({
  productSlug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug format"),
  quantity: z.number().int().min(1).max(10).default(1),
});

export const shopCheckoutSchema = z.union([
  shopCheckoutItem.extend({ termsAccepted: z.literal(true) }),
  z.object({
    items: z.array(shopCheckoutItem).min(1).max(20),
    termsAccepted: z.literal(true),
  }),
]);

/** /api/legal/accept POST body: records a signup clickwrap acceptance.
 * Email-keyed because with confirm-email on there is no session yet. */
export const legalAcceptSchema = z.object({
  context: z.literal("signup"),
  email: z.string().email().max(320).optional(),
});

/** /api/shop/conversations POST body: a buyer opens a thread with a
 * store, anchored to an order or product they can name but the server
 * verifies ownership of. */
export const shopConversationStartSchema = z.object({
  orderId: z.string().uuid().optional().nullable(),
  productSlug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug format")
    .optional()
    .nullable(),
  storeSlug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug format")
    .optional()
    .nullable(),
  subject: z.string().min(2).max(200),
  body: z.string().min(1).max(4000),
});

/** /api/shop/messages POST body: a reply into an existing thread. */
export const shopMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

/** /api/shop/orders/refund-request POST body (buyer). Amounts are never
 * accepted from the client: a request is for the order, and the money
 * figure is resolved server-side at decision time. */
export const shopRefundRequestSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum([
    "damaged",
    "not_as_described",
    "never_arrived",
    "wrong_item",
    "change_of_mind",
    "other",
  ]),
  details: z.string().max(2000).optional().nullable(),
});

/**
 * /api/shop/seller/store PATCH body: the store page, edited by the person
 * whose store it is.
 *
 * WHAT IS NOT HERE IS THE POINT. public_name, slug and status are absent, and
 * so are ownership_disclosure and operational_disclosure. Those five are what
 * a buyer relies on to know WHO they are buying from and how the goods reach
 * them, and a seller rewriting their own disclosure is the whole failure mode
 * disclosure exists to prevent. They stay on the admin route.
 *
 * Images are pinned to Purify's own storage with the same refinement the
 * campaign image uses. Without it a seller could point their banner at any
 * server on the internet, which hotlinks unreviewed content onto a Purify page
 * and leaks every viewer's IP to whoever is hosting it.
 *
 * Everything is `.optional()` and nullable so the form can send one field or
 * all of them, and so clearing a field is expressible. The route rejects an
 * entirely empty body rather than writing nothing and reporting success.
 */
export const shopSellerStoreSchema = z.object({
  tagline: z.string().max(200).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  support_email: z.string().email().max(320).optional().nullable(),
  shipping_origin: z.string().max(200).optional().nullable(),
  shipping_policy_md: z.string().max(8000).optional().nullable(),
  return_policy_md: z.string().max(8000).optional().nullable(),
  logo_url: z
    .string()
    .url()
    .max(1000)
    .refine(isSupabaseStorageUrl, "Image must be uploaded through Purify.")
    .optional()
    .nullable(),
  banner_url: z
    .string()
    .url()
    .max(1000)
    .refine(isSupabaseStorageUrl, "Image must be uploaded through Purify.")
    .optional()
    .nullable(),
});

/** /api/shop/seller/refunds POST body (seller decision). */
export const shopRefundDecisionSchema = z.object({
  refundId: z.string().uuid(),
  decision: z.enum(["approved", "declined"]),
  note: z.string().max(2000).optional().nullable(),
});

/** /api/shop/seller/orders PATCH body. */
export const shopSellerOrderUpdateSchema = z.object({
  orderId: z.string().uuid(),
  fulfillmentStatus: z.enum([
    "packaged",
    "shipped",
    "delivered",
    "cancelled",
  ]),
  tracking: z.string().max(200).optional().nullable(),
});

/** Seller listing create/update. Prices arrive in cents and are bounded;
 * category/classification reuse the catalog vocabulary. The seller can
 * never set store_id or seller_id — the route derives both from the
 * session. */
export const shopListingSchema = z.object({
  title: z.string().min(2).max(200),
  subtitle: z.string().max(300).optional().nullable(),
  descriptionMd: z.string().max(8000).optional().nullable(),
  priceCents: z.number().int().min(100).max(10_000_000),
  category: z.enum([
    "christ",
    "theotokos",
    "saints",
    "feasts",
    "prayer_corner",
    "crosses",
    "sets",
  ]),
  // DERIVED, not retyped. This enum listed five values while the form rendered
  // all ten from CLASSIFICATION_LABELS, so a seller who picked Prayer Rope,
  // Incense, Prayer Beads, Cross & Chain or Woven Textile got a 400 with no
  // explanation of which field was wrong.
  //
  // The database already accepts all ten. Probed 2026-08-24 with the service
  // role: of 18 products in production, 7 carry `incense`, `prayer_rope` or
  // `beaded`. So supabase/migrations/20260704_shop_phase1.sql:111-112, which
  // still lists five, no longer describes the table it created; the CHECK was
  // widened outside this repo. The five-value list here was the only thing
  // actually rejecting those listings.
  //
  // Reading the keys off CLASSIFICATION_LABELS is what stops the three lists
  // drifting again. lib/security/__tests__/listingVocabulary.test.ts asserts
  // it stays that way.
  classification: z.enum(SHOP_CLASSIFICATIONS),
  inventoryStatus: z.enum([
    "ready_to_ship",
    "special_order",
    "coming_soon",
    "out_of_stock",
  ]),
  quantityAvailable: z.number().int().min(0).max(100000).optional().nullable(),
  dispatchMinDays: z.number().int().min(0).max(120),
  dispatchMaxDays: z.number().int().min(0).max(120),
  materials: z.string().max(500).optional().nullable(),
  dimensions: z.string().max(300).optional().nullable(),
  productionMethod: z.string().max(500).optional().nullable(),
  makerName: z.string().max(200).optional().nullable(),
  countryOfOrigin: z.string().max(100).optional().nullable(),
  imageIsRepresentative: z.boolean().default(true),
  status: z.enum(["draft", "published", "paused", "archived"]).default("draft"),
  media: z
    .array(
      z.object({
        url: z.string().url().max(1000),
        alt: z.string().min(3).max(500),
      }),
    )
    .max(8)
    .default([]),
});

/** Reusable: validate a `next=` redirect target is a safe site-relative path. */
export function isSafeNext(value: string | null | undefined): value is string {
  if (!value) return false;
  if (value.length > 512) return false;
  if (!value.startsWith("/")) return false;
  // Reject protocol-relative ("//evil.com"), backslash quirks, control chars.
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (/[\r\n\0]/.test(value)) return false;
  return true;
}

/** Reusable: is this URL served by our own Supabase storage?
 *
 *  Uploads come back from /api/campaigns/image as a public storage URL, and
 *  the client hands that URL to the create call. Without this check a client
 *  could post any absolute URL and have it rendered as a campaign image on a
 *  public page. Reads the project host from NEXT_PUBLIC_SUPABASE_URL rather
 *  than hardcoding the ref, so it follows the project if it ever moves. */
export function isSupabaseStorageUrl(value: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.host !== new URL(base).host) return false;
    return url.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

/** /api/campaigns POST body (create a prayer campaign). The server owns every
 *  counter and workflow column; a client only proposes the human fields. The
 *  blessing literal is the privacy affirmation, mirroring the checkout
 *  clickwrap: it must be true. */
export const campaignCreateSchema = z.object({
  title: z.string().min(3).max(120),
  intention: z.enum([
    "healing",
    "comfort",
    "guidance",
    "persecuted",
    "thanksgiving",
    "departed",
  ]),
  forWhom: z.enum(["living", "departed"]),
  // First name or a cause. Privacy is enforced by copy + this length cap, never
  // a surname or identifying detail of a third party.
  subjectName: z.string().max(80).optional().nullable(),
  note: z.string().max(280).optional().nullable(),
  // The chosen preset prayer's key. Validated against the catalog in the route
  // (isPrayerKey); an unknown or absent key falls back to the intention default.
  prayerKey: z.string().max(40).optional().nullable(),
  // Campaign length in days: a week, a novena, or forty days. Omitted/null = ongoing.
  durationDays: z
    .union([z.literal(7), z.literal(9), z.literal(40)])
    .optional()
    .nullable(),
  // "This is my own request, or I have the person's blessing to share it."
  blessing: z.literal(true),
  // Public URL of an already-uploaded image from /api/campaigns/image. Pinned
  // to the Supabase storage host so a client can never store an arbitrary
  // remote URL (which would let a campaign card hotlink anywhere, and leak
  // viewer IPs to a third-party server).
  imageUrl: z
    .string()
    .url()
    .max(1000)
    .refine(isSupabaseStorageUrl, "Image must be uploaded through Purify.")
    .optional()
    .nullable(),
  // Required only when an image is attached: the uploader affirms they may
  // share this picture. Campaigns are public-read, so this is the same kind
  // of affirmation as `blessing`, not a duplicate of it.
  photoConsent: z.literal(true).optional(),
});

/** /api/campaigns/[id]/report POST body. */
export const campaignReportSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

/** /api/campaigns/[id] PATCH body (creator closes their own campaign). */
export const campaignStatusSchema = z.object({
  status: z.enum(["answered", "memory_eternal"]),
});

/** /api/campaigns/[id]/groups POST body (start a parish group in a campaign).
 *  The server owns the invite code, both counters and every timestamp; a
 *  client only proposes the name. */
export const campaignGroupCreateSchema = z.object({
  name: z.string().min(2).max(60),
});

/** /api/campaigns/groups POST body (join by invite code).
 *
 *  The code is normalised client-side before it gets here, but the pattern is
 *  enforced again because a client is not a validator. It matches the check
 *  constraint on prayer_campaign_groups.invite_code exactly, so anything that
 *  passes here can be looked up and anything that fails could never match a
 *  row anyway. */
export const campaignGroupJoinSchema = z.object({
  inviteCode: z.string().regex(/^[A-Z0-9]{6}$/, "That code is not right."),
});

/** /api/campaigns/[id]/remind PUT body (per-campaign daily reminder).
 *
 *  Default off, and the reader sets their own local hour. `enabled: false`
 *  needs no time, which is why the time is optional rather than defaulted:
 *  turning a reminder off must never require sending one back. */
export const campaignRemindSchema = z.object({
  enabled: z.boolean(),
  time: z
    .string()
    .regex(/^[0-2][0-9]:[0-5][0-9]$/, "Use a time like 07:00.")
    .optional()
    .nullable(),
});

/** /api/trapeza POST body (submit a fasting recipe). Submissions land pending
 *  and are reviewed before publishing, so the server owns status. */
export const trapezaRecipeSubmitSchema = z.object({
  title: z.string().min(3).max(120),
  fastLevel: z.enum(["xerophagy", "oil_wine", "fish", "any"]),
  season: z.enum(["any", "nativity", "lent", "apostles", "dormition"]),
  tradition: z.enum(["any", "greek", "russian", "levantine", "balkan"]),
  summary: z.string().max(280).optional().nullable(),
  ingredients: z.string().min(3).max(2000),
  steps: z.string().min(3).max(4000),
  servings: z.string().max(40).optional().nullable(),
  timeMinutes: z.number().int().min(0).max(1440).optional().nullable(),
});

/** /api/trapeza/[id]/report POST body. */
export const trapezaReportSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

/**
 * /api/community/posts POST body.
 *
 * A discussion carries the reader's own words. A SHARE carries only a
 * LOCATOR into Purify's own library, never the quotation itself:
 *
 *   scripture  book / chapter / verse. The route loads the verse and writes
 *              both the text and the citation. Nothing the caller typed is
 *              stored.
 *   father     saintSlug / work / text. The route loads that work and
 *              refuses the post unless the text is found in it verbatim.
 *
 * This used to accept `quoteText`, `quoteSource` and `quoteHref` as free
 * strings, with the only server check being that the href began with "/".
 * The composer offers Florilegium lines and the code says "no fresh
 * doctrinal text enters the app through this surface", but that was a
 * property of the UI, not of the API: anyone with a token could post
 * invented patristic text under a saint's name and it rendered as vetted.
 * See lib/community/verifyQuote.ts.
 */
export const communityPostSchema = z
  .object({
    kind: z.enum(["discussion", "scripture", "father"]),
    title: z.string().max(160).optional().nullable(),
    body: z.string().max(4000).optional().nullable(),
    /** scripture locator */
    book: z.string().max(60).optional().nullable(),
    chapter: z.number().int().positive().max(200).optional().nullable(),
    verse: z.number().int().positive().max(400).optional().nullable(),
    /** father locator */
    saintSlug: z.string().max(80).optional().nullable(),
    work: z.string().max(80).optional().nullable(),
    /** Only read for `father`, and only to be checked against the work. */
    quoteText: z.string().max(2000).optional().nullable(),
    /** Post into a parish group's thread instead of the public feed. The
     *  route proves membership before it is honoured; this only shapes it. */
    groupId: z.string().uuid().optional().nullable(),
  })
  .refine(
    (p) => p.kind !== "discussion" || (p.body ?? "").trim().length >= 2,
    { message: "Write a little more before posting." },
  )
  .refine(
    (p) => p.kind !== "scripture" || (p.book && p.chapter && p.verse),
    { message: "A shared verse needs its book, chapter and verse." },
  )
  .refine(
    (p) =>
      p.kind !== "father" ||
      (p.saintSlug && p.work && (p.quoteText ?? "").trim().length > 0),
    { message: "A shared line from the Fathers has to name the work it came from." },
  );

/** /api/community/posts/[id]/replies POST body. */
export const communityReplySchema = z.object({
  body: z.string().min(1).max(2000),
});
