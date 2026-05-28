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
