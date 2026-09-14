/**
 * Is this a link the server may fetch on someone's behalf?
 *
 * A URL handed to a server is a request the server makes with the server's own
 * network position, and that position can see things the person pasting the
 * link cannot: the Render instance's own ports, a metadata endpoint, anything
 * else inside the private network. The shop's listing importer is the first
 * feature here that fetches an arbitrary address, so the check lives in
 * security/ rather than in that feature, and anything else that grows the same
 * appetite should call this rather than write its own.
 *
 * Outward only: http or https, a public host, and the two ordinary web ports.
 * The checks are on the hostname as written, which stops the obvious cases
 * (localhost, 10.x, 169.254.169.254) and does not pretend to stop a public DNS
 * name that resolves inward. That would need a resolve-then-pin fetch, which
 * is worth building the day something less trusted than an owner-gated admin
 * panel can reach this.
 */

/** Private, loopback, link-local and multicast hosts. */
export function isPrivateHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) {
    return true;
  }
  // IPv6: loopback, unique local (fc00::/7), link local (fe80::/10).
  if (h === "::1" || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe[89ab][0-9a-f]:/.test(h)) return true;

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return false;
  const parts = v4.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier grade NAT
    (a === 169 && b === 254) || // link local, which is where cloud metadata lives
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast and reserved
  );
}

export type OutboundCheck = { url: URL } | { error: string };

/** Parse and vet a link the server was asked to fetch. */
export function safeOutboundUrl(raw: string): OutboundCheck {
  const text = (raw ?? "").trim();
  if (!text) return { error: "Paste a link first." };

  // A scheme that is written down is honoured, never coerced: "file:///c:/…"
  // must be refused, not quietly turned into "https://file/…" and fetched.
  // Only a link with no scheme at all gets https:// put in front of it.
  const scheme = text.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme && scheme !== "http" && scheme !== "https") {
    return { error: "Only http and https links can be opened." };
  }

  let url: URL;
  try {
    url = new URL(scheme ? text : `https://${text}`);
  } catch {
    return { error: "That does not look like a link." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Only http and https links can be opened." };
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    return { error: "Links with a custom port are not opened." };
  }
  if (url.username || url.password) {
    return { error: "Links carrying a username or password are not opened." };
  }
  if (isPrivateHost(url.hostname)) {
    return { error: "That address is on a private network, not a public site." };
  }
  return { url };
}
