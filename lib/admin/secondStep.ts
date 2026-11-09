/**
 * The admin's second sign-in step: a 6-digit code from an authenticator app.
 *
 * Admin item A4, Edgar's yes of 2026-11-09 (the arbiter's item 25), with his
 * condition: "if you're gonna implement it into the onboarding, make sure it's
 * clean". It is the admin's alone; readers' sign-in does not change.
 *
 * WHY. One sign-in opened everything the panel can do: refund an order, give
 * Plus, email or push every reader, read every account. A stolen password or
 * a session lifted from a browser was the whole key.
 *
 * HOW. Supabase Auth's own multi-factor (TOTP): the admin adds the app once,
 * by scanning a QR code; from then on every new sign-in reaches "aal2" only
 * after a code. The rule, in one place:
 *
 *   - An admin with a verified factor must be at aal2. Until the code is
 *     typed, the panel shows the code screen and every admin and owner route
 *     answers 403 (lib/admin/access.ts, which they all go through).
 *   - An admin with no factor yet keeps today's access, and the panel offers
 *     the setup. When ADMIN_MFA=required is set on the server, setup comes
 *     first and nothing else opens. That switch exists so that turning the
 *     rule on can never lock him out: he adds his code, then it is set.
 *
 * TRUST. The level is read from the session's access token only after the
 * auth server has accepted that same token, and whether the account has a
 * factor is read from the user the server returns, never from the copy of
 * the user kept in the browser's cookie, which whoever holds the browser can
 * edit (lib/admin/access.ts does both).
 *
 * Pure: tested in lib/admin/__tests__/secondStep.test.ts.
 */

export type AdminGate = "ok" | "verify" | "enroll";

/** The `aal` claim of a JWT ("aal1", "aal2"), or null when it carries none or is not a JWT. */
export function aalOf(jwt: string | null | undefined): string | null {
  if (!jwt) return null;
  const part = jwt.split(".")[1];
  if (!part) return null;
  try {
    const json = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as {
      aal?: unknown;
    };
    return typeof json.aal === "string" ? json.aal : null;
  } catch {
    return null;
  }
}

/** Whether the server makes the second step compulsory for every admin (ADMIN_MFA=required). */
export function secondStepRequired(env: Record<string, string | undefined> = process.env): boolean {
  return (env.ADMIN_MFA ?? "").trim().toLowerCase() === "required";
}

/**
 * Where an admin stands: "ok" opens the panel, "verify" asks for the code,
 * "enroll" asks for the setup first.
 */
export function adminGate(opts: { aal: string | null; verifiedFactors: number; required: boolean }): AdminGate {
  if (opts.verifiedFactors > 0) return opts.aal === "aal2" ? "ok" : "verify";
  return opts.required ? "enroll" : "ok";
}

/** The verified factors among a user's factors, as the auth server returns them. */
export function verifiedFactorCount(factors: readonly { status?: string }[] | null | undefined): number {
  return (factors ?? []).filter((f) => f.status === "verified").length;
}

/** A typed code, cleaned: digits only, six of them, or null. */
export function cleanCode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 6 ? digits : null;
}

/**
 * The QR code as an image address that always loads. Supabase hands the SVG
 * back as "data:image/svg+xml;utf-8,<svg ...>", the markup raw; a "#" in it
 * (a colour) ends the address there and the picture breaks. Re-encoded here,
 * whatever form it arrives in.
 */
export function qrImageSrc(qr: string): string {
  const raw = qr.match(/^data:image\/svg\+xml;utf-?8,([\s\S]*)$/i)?.[1] ?? (qr.trimStart().startsWith("<") ? qr : null);
  return raw === null ? qr : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`;
}

/** "ABCD EFGH IJKL ...": a setup key in groups of four, easier to type by hand. */
export function groupKey(secret: string): string {
  return secret.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");
}
