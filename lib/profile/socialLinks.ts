// Social links on a profile: Instagram, X, TikTok, YouTube and the rest, or
// a website of the reader's own.
//
// A network link is stored as a username and built into its address here, on
// the server, so a profile can only ever link to the network it names: a
// "Instagram" button cannot be pointed at somewhere else. A website is any
// https address, refused if it sits on the team's blocked list or reads as a
// shortener (lib/community/spam.ts), because a profile is public and a link on
// it is followed by people who trust the app.
//
// Pure: the profile route checks with it and the card draws with it.

import { SHORTENERS, hostMatches } from "@/lib/community/spam";

export const SOCIAL_NETWORKS = ["instagram", "x", "tiktok", "youtube", "facebook", "threads", "bluesky", "website"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

/** At most this many links on one profile. */
export const MAX_SOCIAL_LINKS = 5;

/** As stored in profiles.social_links: the network and the reader's part. */
export type SocialLink = { k: SocialNetwork; v: string };

/** As a profile shows it. */
export type ShownLink = { kind: SocialNetwork; label: string; href: string };

type Network = {
  /** The network's own name, which is not translated. */
  name: string;
  /** Where its profile addresses live, for a pasted address. */
  hosts: string[];
  /** What a valid username looks like there. */
  pattern: RegExp;
  url: (v: string) => string;
  /** How the username is shown: "@purify", or the channel's handle. */
  shown: (v: string) => string;
};

const NETWORKS: Record<Exclude<SocialNetwork, "website">, Network> = {
  instagram: {
    name: "Instagram",
    hosts: ["instagram.com"],
    pattern: /^[a-z0-9._]{1,30}$/i,
    url: (v) => `https://www.instagram.com/${v}/`,
    shown: (v) => `@${v}`,
  },
  x: { name: "X", hosts: ["x.com", "twitter.com"], pattern: /^[a-z0-9_]{1,15}$/i, url: (v) => `https://x.com/${v}`, shown: (v) => `@${v}` },
  tiktok: {
    name: "TikTok",
    hosts: ["tiktok.com"],
    pattern: /^[a-z0-9._]{2,24}$/i,
    url: (v) => `https://www.tiktok.com/@${v}`,
    shown: (v) => `@${v}`,
  },
  youtube: {
    name: "YouTube",
    hosts: ["youtube.com"],
    pattern: /^[a-z0-9._-]{3,30}$/i,
    url: (v) => `https://www.youtube.com/@${v}`,
    shown: (v) => `@${v}`,
  },
  facebook: {
    name: "Facebook",
    hosts: ["facebook.com", "fb.com"],
    pattern: /^[a-z0-9.]{5,50}$/i,
    url: (v) => `https://www.facebook.com/${v}`,
    shown: (v) => v,
  },
  threads: {
    name: "Threads",
    hosts: ["threads.net", "threads.com"],
    pattern: /^[a-z0-9._]{1,30}$/i,
    url: (v) => `https://www.threads.net/@${v}`,
    shown: (v) => `@${v}`,
  },
  bluesky: {
    name: "Bluesky",
    hosts: ["bsky.app"],
    // A Bluesky handle is a domain: name.bsky.social, or the reader's own.
    pattern: /^(?=.{3,60}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i,
    url: (v) => `https://bsky.app/profile/${v}`,
    shown: (v) => `@${v}`,
  },
};

export function networkName(k: SocialNetwork): string {
  return k === "website" ? "Website" : NETWORKS[k].name;
}

export function isSocialNetwork(v: unknown): v is SocialNetwork {
  return typeof v === "string" && (SOCIAL_NETWORKS as readonly string[]).includes(v);
}

/**
 * What a reader typed, reduced to what is stored: the username alone (an
 * "@", a pasted profile address and spaces taken off), or a website's https
 * address. Null when it cannot be one.
 */
export function cleanSocialValue(k: SocialNetwork, raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (k === "website") {
    const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    try {
      const u = new URL(withScheme);
      if (u.protocol !== "https:" && u.protocol !== "http:") return null;
      if (!u.hostname.includes(".") || u.username || u.password) return null;
      u.protocol = "https:";
      const out = u.toString();
      return out.length <= 200 ? out : null;
    } catch {
      return null;
    }
  }
  // A pasted address: keep what comes after the network's own domain, and
  // refuse an address on any other site.
  let v = s;
  if (/^(https?:\/\/|www\.)/i.test(s) || /^[a-z0-9.-]+\.[a-z]{2,}\//i.test(s)) {
    let u: URL;
    try {
      u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    } catch {
      return null;
    }
    const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
    if (!NETWORKS[k].hosts.some((h) => host === h || host.endsWith(`.${h}`))) return null;
    v = u.pathname.replace(/^\/(?:profile\/)?/, "");
  }
  v = v.replace(/^@/, "").split(/[/?#]/)[0].replace(/^@/, "");
  return NETWORKS[k].pattern.test(v) ? (k === "bluesky" ? v.toLowerCase() : v) : null;
}

export type LinkProblem = "unknown" | "invalid" | "blocked" | "too_many";

/** Check and clean a whole list, as the profile route saves it. */
export function cleanSocialLinks(
  input: readonly { k: string; v: string }[],
  blockedHosts: readonly string[] = [],
): { ok: true; links: SocialLink[] } | { ok: false; problem: LinkProblem; index: number } {
  const out: SocialLink[] = [];
  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (!item.v.trim()) continue;
    if (!isSocialNetwork(item.k)) return { ok: false, problem: "unknown", index: i };
    const v = cleanSocialValue(item.k, item.v);
    if (!v) return { ok: false, problem: "invalid", index: i };
    if (item.k === "website") {
      const host = new URL(v).hostname.toLowerCase().replace(/^www\./, "");
      if ([...blockedHosts, ...SHORTENERS].some((b) => hostMatches(host, b))) return { ok: false, problem: "blocked", index: i };
    }
    if (out.some((l) => l.k === item.k && l.v.toLowerCase() === v.toLowerCase())) continue;
    out.push({ k: item.k, v });
  }
  if (out.length > MAX_SOCIAL_LINKS) return { ok: false, problem: "too_many", index: MAX_SOCIAL_LINKS };
  return { ok: true, links: out };
}

/** The stored list as a profile draws it, dropping anything that no longer checks out. */
export function shownLinks(stored: unknown): ShownLink[] {
  if (!Array.isArray(stored)) return [];
  const out: ShownLink[] = [];
  for (const raw of stored.slice(0, MAX_SOCIAL_LINKS)) {
    const item = raw as { k?: unknown; v?: unknown };
    if (!isSocialNetwork(item.k) || typeof item.v !== "string") continue;
    const v = cleanSocialValue(item.k, item.v);
    if (!v) continue;
    if (item.k === "website") {
      const u = new URL(v);
      out.push({ kind: "website", label: (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "")).slice(0, 40), href: v });
    } else {
      const n = NETWORKS[item.k];
      out.push({ kind: item.k, label: n.shown(v), href: n.url(v) });
    }
  }
  return out;
}

/** The stored list as the editor fills its rows. */
export function storedLinks(stored: unknown): SocialLink[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((x): x is SocialLink => isSocialNetwork((x as SocialLink)?.k) && typeof (x as SocialLink)?.v === "string")
    .slice(0, MAX_SOCIAL_LINKS);
}
