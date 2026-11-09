/**
 * What an error report may keep (admin item A10, docs/1.9-build/sql/app-errors.sql).
 *
 * The privacy line Edgar approved on 2026-11-09: "When something fails, the
 * app reports the page, the app version and the kind of device, never who you
 * are." So a report is cut down here before it is kept, on the server, for
 * every source (the website's own server and the apps):
 *
 *   - the page as a path alone: never the query string or the hash, which can
 *     carry an address, a token or a search;
 *   - the message cut to 300 characters, with anything that could name or
 *     reach a person replaced: email addresses, long numbers (a phone, a card,
 *     an order number), ids shaped like an account's, and tokens.
 *
 * Pure. Tested in lib/errors/__tests__/scrub.test.ts.
 */

export const ERROR_SOURCES = ["server", "screen", "request"] as const;
export type ErrorSource = (typeof ERROR_SOURCES)[number];

export const ERROR_PLATFORMS = ["web", "android", "ios", "desktop"] as const;
export type ErrorPlatform = (typeof ERROR_PLATFORMS)[number];

const MAX_PATH = 300;
const MAX_MESSAGE = 300;

/** The path of a page or address, and nothing after it. Null when there is no path in it. */
export function pathOnly(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let path = String(raw).trim();
  // A whole address: keep its path.
  const full = path.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i);
  if (full) path = full[1] ?? "/";
  path = path.split(/[?#]/)[0] ?? "";
  if (!path.startsWith("/")) return null;
  return scrubText(path).slice(0, MAX_PATH);
}

/** Anything that could name or reach a person, replaced. */
function scrubText(text: string): string {
  return (
    text
      // Tokens first: a JWT, or a bearer value.
      .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]*/g, "<token>")
      .replace(/\bBearer\s+[\w.-]+/gi, "Bearer <token>")
      .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "<email>")
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<id>")
      // Six or more digits in a row, spaces and dashes allowed between them.
      .replace(/\+?\d(?:[\s-]?\d){5,}/g, "<number>")
  );
}

/** An error's message, safe to keep: scrubbed and cut. Null when there is none. */
export function scrubMessage(raw: unknown): string | null {
  if (raw == null) return null;
  const text = (raw instanceof Error ? raw.message : String(raw)).replace(/\s+/g, " ").trim();
  if (!text) return null;
  const clean = scrubText(text);
  return clean.length > MAX_MESSAGE ? `${clean.slice(0, MAX_MESSAGE - 1)}…` : clean;
}

/** A version string as the app writes it ("1.9", "1.8.2"), or null. */
export function cleanVersion(raw: unknown): string | null {
  return typeof raw === "string" && /^[0-9]+(\.[0-9]+){0,3}$/.test(raw) ? raw : null;
}
