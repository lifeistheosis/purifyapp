/**
 * Reading the two push credentials out of environment variables, in every
 * shape they are likely to have been pasted in.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * Production reported on 2026-09-19: "Android, 175 devices: its variables are
 * set but one could not be read, so it dry-ran." FCM_SERVICE_ACCOUNT_JSON was
 * set on Render, and the reader only accepted base64 of the service-account
 * file. The natural thing to paste into a dashboard is the file itself, and
 * that was refused as unreadable, so 175 Android phones got nothing, every
 * broadcast, with the reason only in a server log.
 *
 * So each reader here accepts the file as it is, base64 of the file, and the
 * damage dashboards do on the way in (surrounding quotes, line breaks turned
 * into spaces or into literal "\n"). When it still cannot read a value it says
 * WHICH part is wrong, in words the admin panel can show. NEVER a value: every
 * reason names a field or a shape, not what was in it.
 *
 * Pure: strings in, a key or a reason out.
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: string };

/** Drop the quotes a dashboard or a .env line may have kept around a value. */
function unquote(raw: string): string {
  const t = raw.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === "'" && t.endsWith("'")))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

function fromBase64(raw: string): string | null {
  const compact = raw.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=_-]+$/.test(compact)) return null;
  try {
    const decoded = Buffer.from(compact, "base64").toString("utf8");
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * A PEM private key, rebuilt into the exact shape a signer accepts.
 *
 * Handles the body arriving on one line, with real or literal "\n" breaks, or
 * with the breaks flattened into spaces, by pulling the base64 body out from
 * between the markers and re-wrapping it at 64 characters.
 */
export function normalizePem(text: string): string | null {
  const unescaped = text.replace(/\\r/g, "").replace(/\\n/g, "\n");
  const m = unescaped.match(/-----BEGIN ([A-Z ]*PRIVATE KEY)-----([\s\S]*?)-----END \1-----/);
  if (!m) return null;
  const body = m[2].replace(/\s+/g, "");
  if (!body || !/^[A-Za-z0-9+/=]+$/.test(body)) return null;
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${m[1]}-----\n${lines.join("\n")}\n-----END ${m[1]}-----\n`;
}

function parseJsonLoosely(text: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(text) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    // A service-account file pasted into a single-line field often has its
    // private_key's escaped "\n" turned into real line breaks, which JSON
    // forbids inside a string. Escaping them back is the whole repair.
    try {
      const v = JSON.parse(text.replace(/\r?\n/g, "\\n")) as unknown;
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}

/** FCM_SERVICE_ACCOUNT_JSON: the Firebase service-account file, raw or base64. */
export function parseServiceAccount(raw: string | undefined): Parsed<Record<string, unknown>> {
  if (!raw || !raw.trim()) return { ok: false, reason: "FCM_SERVICE_ACCOUNT_JSON is not set." };
  const text = unquote(raw);
  let json = text.startsWith("{") ? parseJsonLoosely(text) : null;
  if (!json) {
    const decoded = fromBase64(text);
    if (decoded && decoded.trim().startsWith("{")) json = parseJsonLoosely(decoded.trim());
  }
  if (!json) {
    return {
      ok: false,
      reason:
        "FCM_SERVICE_ACCOUNT_JSON is neither the service-account JSON file nor base64 of it. Paste the whole downloaded .json file, from { to }.",
    };
  }
  // The likeliest wrong file: google-services.json sits beside the service
  // account in the Firebase console and is also JSON, but it is the app's own
  // config and cannot sign anything.
  if (json.project_info && json.client) {
    return {
      ok: false,
      reason:
        "FCM_SERVICE_ACCOUNT_JSON holds google-services.json, the app's config, not a service-account key. In Firebase: Project settings, Service accounts, Generate new private key, then paste that file.",
    };
  }
  if (json.type && json.type !== "service_account") {
    return {
      ok: false,
      reason: `FCM_SERVICE_ACCOUNT_JSON is a "${String(json.type).slice(0, 40)}" file, not a service account. Download a new private key under Firebase, Project settings, Service accounts.`,
    };
  }
  const missing = ["project_id", "client_email", "private_key"].filter((k) => typeof json![k] !== "string" || !json![k]);
  if (missing.length) {
    return { ok: false, reason: `FCM_SERVICE_ACCOUNT_JSON is JSON but has no ${missing.join(", ")}.` };
  }
  const pem = normalizePem(json.private_key as string);
  if (!pem) {
    return { ok: false, reason: "FCM_SERVICE_ACCOUNT_JSON has a private_key that is not a readable PEM key." };
  }
  return { ok: true, value: { ...json, private_key: pem } };
}

/** APNS_KEY_P8: the .p8 file from Apple, raw or base64. */
export function parseP8(raw: string | undefined): Parsed<string> {
  if (!raw || !raw.trim()) return { ok: false, reason: "APNS_KEY_P8 is not set." };
  const text = unquote(raw);
  let pem = text.includes("PRIVATE KEY") ? normalizePem(text) : null;
  if (!pem) {
    const decoded = fromBase64(text);
    if (decoded && decoded.includes("PRIVATE KEY")) pem = normalizePem(decoded);
  }
  if (!pem) {
    return {
      ok: false,
      reason:
        "APNS_KEY_P8 is neither the .p8 key file nor base64 of it. Paste the whole file, from -----BEGIN PRIVATE KEY----- to the END line.",
    };
  }
  return { ok: true, value: pem };
}
