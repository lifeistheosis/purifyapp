/**
 * Reading the three Web Push (VAPID) variables in every shape they are likely
 * to have been pasted in.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * Production, 2026-10-04: 0 browsers subscribed, out of everyone who had ever
 * tapped "turn on reminders". The value of NEXT_PUBLIC_VAPID_KEY on Render
 * was the whole line from a .env file, `NEXT_PUBLIC_VAPID_KEY=B...`, name and
 * all. It is inlined into the browser bundle as it stands, so every browser
 * handed `pushManager.subscribe` a key that was not a key, the call threw, and
 * nothing caught it: the permission prompt was answered, the button did
 * nothing, and no row was ever written. The Push tab said "Web: Ready".
 *
 * lib/push/credentials.ts made the Apple and Firebase readers forgiving for
 * the same reason. This does it for VAPID, and says what is wrong with a value
 * it still cannot read, by shape and never by content.
 *
 * Pure, and free of Node APIs: the browser reads its key through this too.
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false; reason: string };

/**
 * A pasted value with the dashboard's damage taken off: surrounding
 * whitespace and quotes, and its own `NAME=` in front when the whole .env
 * line was pasted into the value box.
 */
export function cleanEnvValue(raw: string | undefined | null): string {
  let t = (raw ?? "").trim();
  const unquote = (s: string) =>
    s.length >= 2 && ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'"))) ? s.slice(1, -1).trim() : s;
  t = unquote(t);
  const named = /^(?:export\s+)?[A-Z][A-Z0-9_]*\s*=\s*([\s\S]*)$/.exec(t);
  if (named) t = unquote(named[1].trim());
  return t;
}

/** The bytes of a base64 or base64url string, or null when it is neither. */
function decode(text: string): Uint8Array | null {
  const compact = text.replace(/\s+/g, "");
  if (!compact || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(compact)) return null;
  const b64 = compact.replace(/=+$/, "").replace(/-/g, "+").replace(/_/g, "/");
  try {
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function encode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function shape(text: string, bytes: Uint8Array | null): string {
  if (bytes) return `it is ${text.length} characters and decodes to ${bytes.length} bytes`;
  return `it is ${text.length} characters and is not base64`;
}

/**
 * A Web Push public key: the 65 bytes of an uncompressed P-256 point, as
 * base64url (87 characters, beginning with B). `name` is the variable it came
 * from, for the reason.
 */
export function readVapidPublicKey(raw: string | undefined | null, name: string): Parsed<string> {
  const text = cleanEnvValue(raw);
  if (!text) return { ok: false, reason: `${name} is not set.` };
  const bytes = decode(text);
  if (bytes && bytes.length === 65 && bytes[0] === 4) return { ok: true, value: encode(bytes) };
  if (bytes && bytes.length === 32) {
    return { ok: false, reason: `${name} holds a private key (32 bytes). It needs the public key, which is 87 characters and begins with B.` };
  }
  return {
    ok: false,
    reason: `${name} cannot be read: ${shape(text, bytes)}, where a web push public key is 87 characters (65 bytes).`,
  };
}

/** A Web Push private key: 32 bytes, as base64url (43 characters). */
export function readVapidPrivateKey(raw: string | undefined | null, name: string): Parsed<string> {
  const text = cleanEnvValue(raw);
  if (!text) return { ok: false, reason: `${name} is not set.` };
  const bytes = decode(text);
  if (bytes && bytes.length === 32) return { ok: true, value: encode(bytes) };
  if (bytes && bytes.length === 65) {
    return { ok: false, reason: `${name} holds the public key (65 bytes). It needs the private key, which is 43 characters.` };
  }
  return {
    ok: false,
    reason: `${name} cannot be read: ${shape(text, bytes)}, where a web push private key is 43 characters (32 bytes).`,
  };
}

/** Who a push service may write to about our pushes: a mailto: or https: address. */
export function readVapidSubject(raw: string | undefined | null, name: string): Parsed<string> {
  const text = cleanEnvValue(raw);
  if (!text) return { ok: false, reason: `${name} is not set.` };
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(text) || /^https:\/\/[^\s]+$/i.test(text)) return { ok: true, value: text };
  // A bare address is the commonest paste, and what it means is not in doubt.
  if (/^[^\s@:]+@[^\s@]+\.[^\s@]+$/.test(text)) return { ok: true, value: `mailto:${text}` };
  return { ok: false, reason: `${name} must be a mailto: address or an https: address.` };
}

/** The key browsers subscribe with, read from the value built into the bundle. */
export function browserVapidKey(): Parsed<string> {
  return readVapidPublicKey(process.env.NEXT_PUBLIC_VAPID_KEY, "NEXT_PUBLIC_VAPID_KEY");
}
