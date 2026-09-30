/**
 * Ambassador links: the code in `?ref=`, the cookie that remembers it, and
 * the code an invited reader is given (the owner's choices, 2026-09-30:
 * 10% on EIKON, invite only, a code-only cookie).
 *
 * ── The cookie holds a code, never a person ─────────────────────────────
 *
 * `purify_ref` is first-party and HTTP-only, set by proxy.ts when a visitor
 * arrives through `?ref=`, and read by checkout on the server. It carries the
 * ambassador's code and nothing else: no visitor id, no timestamp, no trail
 * of pages. Clicks are counted per link per day in the database, and nothing
 * joins a click to a visitor. The privacy page says exactly this.
 *
 * The last link wins: arriving through a second ambassador's link replaces
 * the first code, the usual rule and the one a buyer would expect.
 *
 * Pure, and free of Node or Next imports, so proxy.ts and the tests share it.
 */

export const REF_COOKIE = "purify_ref";
export const REF_PARAM = "ref";
export const REF_MAX_AGE_S = 30 * 24 * 60 * 60;

const CODE_RE = /^[a-z0-9][a-z0-9-]{2,23}$/;

/** A code as stored, or null when the input could never be one. */
export function normalizeCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toLowerCase();
  return CODE_RE.test(code) ? code : null;
}

/**
 * A link that arrived with `?ref=`: the code it carried (null when it was not
 * a valid code) and the same address without the parameter, so the reader
 * lands on a clean URL and a shared screenshot does not re-share the link.
 * Null when there is no `ref` at all.
 */
export function refFromUrl(url: URL): { code: string | null; clean: URL } | null {
  if (!url.searchParams.has(REF_PARAM)) return null;
  const code = normalizeCode(url.searchParams.get(REF_PARAM));
  const clean = new URL(url.toString());
  clean.searchParams.delete(REF_PARAM);
  return { code, clean };
}

/** The code in a Cookie header, if a valid one is there. */
export function refFromCookieHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== REF_COOKIE) continue;
    try {
      return normalizeCode(decodeURIComponent(part.slice(eq + 1).trim()));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * A code for a newly invited ambassador, from their name: lower case, words
 * joined by hyphens, at most twenty characters, and a number on the end when
 * the plain one is taken.
 */
export function codeFromName(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20)
      .replace(/-+$/g, "") || "friend";
  const padded = base.length >= 3 ? base : `${base}-purify`.slice(0, 20);
  if (!taken.has(padded)) return padded;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${padded.slice(0, 20)}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${padded.slice(0, 12)}-${Date.now().toString(36)}`;
}

/** The link an ambassador shares. */
export function referralLink(siteUrl: string, code: string, path = "/shop/eikon"): string {
  const u = new URL(path, siteUrl);
  u.searchParams.set(REF_PARAM, code);
  return u.toString();
}
