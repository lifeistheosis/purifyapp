import { z } from "zod";

// Central registry for request-body schemas. One per route. Keeps validation
// logic out of route handlers and reusable from tests.

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
 * it wants, never what it costs. */
export const shopCheckoutSchema = z.object({
  productSlug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug format"),
  quantity: z.number().int().min(1).max(10).default(1),
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
