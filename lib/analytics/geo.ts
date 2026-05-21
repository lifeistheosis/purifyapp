import "server-only";

export type Geo = {
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
};

// In-memory cache so we geolocate each IP at most once per TTL (the free
// ipwho.is endpoint is rate-limited, and a session's IP doesn't move).
const cache = new Map<string, { geo: Geo; exp: number }>();
const TTL = 6 * 60 * 60 * 1000; // 6h

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

/** Best-effort coarse (city-level) geolocation of an IP. Never throws. */
export async function geolocate(ip: string): Promise<Geo | null> {
  if (isPrivate(ip)) return null;
  const hit = cache.get(ip);
  if (hit && hit.exp > Date.now()) return hit.geo;
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || j.success === false) return null;
    const geo: Geo = {
      country: j.country ?? null,
      country_code: j.country_code ?? null,
      region: j.region ?? null,
      city: j.city ?? null,
      lat: typeof j.latitude === "number" ? j.latitude : null,
      lng: typeof j.longitude === "number" ? j.longitude : null,
    };
    cache.set(ip, { geo, exp: Date.now() + TTL });
    return geo;
  } catch {
    return null;
  }
}

/** Pull the client IP from common proxy headers (Render sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "";
}
