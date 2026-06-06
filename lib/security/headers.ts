import "server-only";

/**
 * Per-request CSP nonce + policy builder. The nonce gates Next.js's own
 * runtime/inline scripts via `strict-dynamic`; everything else is locked
 * down to `self` plus explicit allowlists.
 *
 * The CSP is shipped as Content-Security-Policy-Report-Only initially so
 * we can collect violations at /api/csp-report without breaking the site,
 * then flip to the enforcing header after a week of clean reports.
 */

/** Generate a fresh base64url nonce per request. */
export function generateNonce(): string {
  // crypto.getRandomValues is available in the Edge/Node Web Crypto runtime.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Build the CSP string for a given nonce. Keep this in lockstep with the
 * static headers in next.config.ts (which carry the non-CSP set).
 */
export function buildCsp(nonce: string): string {
  const directives: string[] = [
    "default-src 'self'",
    // 'strict-dynamic' lets the nonced loader load other scripts without
    // needing each to be listed; everything else is blocked.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Tailwind 4 + next/font inject inline <style> tags; allow them.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://*.buymeacoffee.com https://img.buymeacoffee.com",
    "font-src 'self' data:",
    // Self-hosted prayer audio (e.g. the prayer-rope anthem).
    "media-src 'self'",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "report-uri /api/csp-report",
  ];
  return directives.join("; ");
}

/** Header name we use to thread the nonce from middleware → layout. */
export const NONCE_HEADER = "x-nonce";
