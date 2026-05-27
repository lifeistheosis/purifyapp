import "server-only";

export type Geo = {
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
};

// In-memory cache so we geolocate each IP at most once per TTL. The
// free endpoints are rate-limited and a session's IP doesn't move.
const cache = new Map<string, { geo: Geo; exp: number }>();
const TTL = 6 * 60 * 60 * 1000; // 6h
// A small negative cache so a failing provider doesn't get retried
// once per pageview, slows fallback chain otherwise.
const failCache = new Map<string, number>();
const FAIL_TTL = 15 * 60 * 1000; // 15m

function isPrivate(ip: string): boolean {
  return (
    !ip ||
    ip === "127.0.0.1" ||
    ip.startsWith("::1") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fe80")
  );
}

/**
 * Best-effort coarse geolocation. Tries ipwho.is first, then
 * ip-api.com as a fallback when the primary returns null. Never
 * throws, returns null only when both providers fail or the IP is
 * private / missing.
 */
export async function geolocate(ip: string): Promise<Geo | null> {
  if (isPrivate(ip)) return null;
  const hit = cache.get(ip);
  if (hit && hit.exp > Date.now()) return hit.geo;
  const failed = failCache.get(ip);
  if (failed && failed > Date.now()) return null;

  // Provider chain. Each is independent, if the first returns a
  // partial result we don't second-guess it.
  let geo = await tryIpwhois(ip);
  if (!geo) geo = await tryIpApi(ip);

  if (geo) {
    cache.set(ip, { geo, exp: Date.now() + TTL });
    return geo;
  }

  failCache.set(ip, Date.now() + FAIL_TTL);
  return null;
}

async function tryIpwhois(ip: string): Promise<Geo | null> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "purify-analytics/1.0" },
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || j.success === false) return null;
    return {
      country: typeof j.country === "string" ? j.country : null,
      country_code: typeof j.country_code === "string" ? j.country_code : null,
      region: typeof j.region === "string" ? j.region : null,
      city: typeof j.city === "string" ? j.city : null,
      lat: typeof j.latitude === "number" ? j.latitude : null,
      lng: typeof j.longitude === "number" ? j.longitude : null,
    };
  } catch {
    return null;
  }
}

async function tryIpApi(ip: string): Promise<Geo | null> {
  try {
    // ip-api.com free tier returns country/region/city, no auth needed.
    // Only the http endpoint is free; https requires a paid key. Render's
    // server-to-server traffic over http to ip-api is fine (no client
    // exposure), but we still gate behind a short timeout.
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,lat,lon`,
      {
        signal: AbortSignal.timeout(6000),
        headers: { "user-agent": "purify-analytics/1.0" },
      },
    );
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || j.status !== "success") return null;
    return {
      country: typeof j.country === "string" ? j.country : null,
      country_code: typeof j.countryCode === "string" ? j.countryCode : null,
      region: typeof j.regionName === "string" ? j.regionName : null,
      city: typeof j.city === "string" ? j.city : null,
      lat: typeof j.lat === "number" ? j.lat : null,
      lng: typeof j.lon === "number" ? j.lon : null,
    };
  } catch {
    return null;
  }
}

/**
 * Pull the client IP from common proxy headers. Render sets
 * `x-forwarded-for`; Cloudflare sets `cf-connecting-ip`; some other
 * proxies use `x-real-ip` or `forwarded`. Returns the first
 * non-private value found, stripped of port and IPv6 brackets.
 */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    // xff is a comma-separated list; the leftmost entry is the real
    // client (proxies prepend). Walk it and return the first
    // non-private candidate so a misconfigured proxy chain doesn't
    // give us a private/transit IP.
    for (const raw of xff.split(",")) {
      const cleaned = normalizeIp(raw);
      if (cleaned && !isPrivate(cleaned)) return cleaned;
    }
  }
  return (
    normalizeIp(headers.get("cf-connecting-ip")) ||
    normalizeIp(headers.get("x-real-ip")) ||
    normalizeIp(headers.get("true-client-ip")) ||
    ""
  );
}

function normalizeIp(raw: string | null): string {
  if (!raw) return "";
  let s = raw.trim();
  // Strip IPv6 brackets and optional port: [::1]:8080 → ::1
  if (s.startsWith("[")) {
    const close = s.indexOf("]");
    if (close > 0) s = s.slice(1, close);
  } else if (s.includes(".") && s.includes(":")) {
    // IPv4:port → IPv4. (IPv6 has multiple colons; don't strip those.)
    const colon = s.lastIndexOf(":");
    if (s.slice(colon + 1).match(/^\d+$/)) s = s.slice(0, colon);
  }
  return s;
}

/**
 * Diagnostic helper for the admin debug endpoint. Returns the raw
 * header snapshot the geo path is reading from, plus the IP that
 * `clientIp()` selected. Read-only; no network call.
 */
export function geoHeaderSnapshot(headers: Headers): {
  xForwardedFor: string | null;
  xRealIp: string | null;
  cfConnectingIp: string | null;
  trueClientIp: string | null;
  selectedIp: string;
  privateOrEmpty: boolean;
} {
  const selected = clientIp(headers);
  return {
    xForwardedFor: headers.get("x-forwarded-for"),
    xRealIp: headers.get("x-real-ip"),
    cfConnectingIp: headers.get("cf-connecting-ip"),
    trueClientIp: headers.get("true-client-ip"),
    selectedIp: selected,
    privateOrEmpty: isPrivate(selected),
  };
}
