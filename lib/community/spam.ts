// The spam filter's judgement on one post or reply.
//
// Three outcomes. ALLOW. REFUSE, with a reason the writer can act on: too
// many links or @mentions in one go. HOLD: the post is kept but shown to
// nobody until a moderator approves it, because it carries a blocked or
// shortened link, reads like the scam and contact-me spam every forum gets,
// or comes from a new account with a link in it. Holding rather than refusing
// is deliberate: a false alarm costs the writer a short wait, not their words.
//
// Pure and dependency-free: the routes gather the facts (who is writing,
// which web addresses the team blocks) and this decides. The word filter
// (lib/moderation) is a separate pass; a post can be masked AND held.

import { splitMentions } from "./mentions";
import { TRUST_LIMITS, type TrustLevel, type TrustLimits } from "./trust";

export type LinkFound = { host: string; text: string };

/** Common domain endings, for addresses written without "https://". */
const TLDS =
  "com|net|org|io|co|me|ly|gg|tv|xyz|top|info|biz|site|online|shop|store|app|link|click|live|club|vip|win|bet|casino|loan|cc|tk|ml|ga|cf|gq|icu|cyou|sbs|buzz|ru|cn|in|us|uk|ca|au|de|fr|es|it|nl|gr|ro|rs|ua|pl";

const URL_RE = /\bhttps?:\/\/[^\s<>()"'`]+/gi;
const WWW_RE = /\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s<>()"'`]*/gi;
const BARE_RE = new RegExp(
  String.raw`(?<![@\w.-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:${TLDS})\b(?:\/[^\s<>()"'\x60]*)?`,
  "gi",
);

/** Link shorteners hide where a link goes, which is why spam uses them. */
export const SHORTENERS: readonly string[] = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "rb.gy",
  "t.ly",
  "tiny.cc",
  "s.id",
  "v.gd",
  "bl.ink",
  "shorte.st",
  "adf.ly",
];

/** Endings handed out free or near free, and overwhelmingly used by spam. */
const SUSPICIOUS_TLDS = new Set(["xyz", "top", "click", "loan", "win", "vip", "bet", "casino", "tk", "ml", "ga", "cf", "gq", "icu", "cyou", "sbs", "buzz"]);

function hostOf(raw: string): string | null {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const host = new URL(withScheme).hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

/** Every web address in some text, each once, with its host. */
export function findLinks(texts: readonly (string | null | undefined)[]): LinkFound[] {
  const out: LinkFound[] = [];
  const seen = new Set<string>();
  for (const t of texts) {
    if (!t) continue;
    // Full addresses first, then www., then bare domains, each blanked out
    // of the text once found so the next pass does not count it again.
    let rest = t;
    for (const re of [URL_RE, WWW_RE, BARE_RE]) {
      rest = rest.replace(re, (m) => {
        const text = m.replace(/[.,;:!?)\]]+$/, "");
        const host = hostOf(text);
        if (host && !seen.has(text.toLowerCase())) {
          seen.add(text.toLowerCase());
          out.push({ host, text });
        }
        return " ".repeat(m.length);
      });
    }
  }
  return out;
}

/** Whether `host` is `blocked` or one of its subdomains. */
export function hostMatches(host: string, blocked: string): boolean {
  const b = blocked.toLowerCase().replace(/^www\./, "");
  return host === b || host.endsWith(`.${b}`);
}

/** Distinct @handles across some texts, however many. */
export function countMentions(texts: readonly (string | null | undefined)[]): number {
  const seen = new Set<string>();
  for (const t of texts) {
    if (!t) continue;
    for (const part of splitMentions(t)) if ("handle" in part) seen.add(part.handle);
  }
  return seen.size;
}

const CONTACT =
  /\b(?:whats\s?app|telegram|t\.me\/|wechat|kik\s+me|snapchat\s+me|signal\s+me|dm\s+me|inbox\s+me|text\s+me|call\s+me|message\s+me\s+(?:on|at))\b/i;
const MONEY =
  /\b(?:crypto(?:currency)?|bitcoin|btc|usdt|ethereum|forex|binary\s+options?|investment\s+(?:plan|opportunity|platform)|invest\s+with\s+me|make\s+money|cash\s?app|paypal\.me|giveaway|sugar\s+(?:daddy|mummy|mommy)|onlyfans|casino|sports\s+betting|loan\s+offer|guaranteed\s+(?:profit|returns?))\b|\bearn\s+\$|\$\s?\d[\d,]*\s*(?:per|a|\/)\s*(?:day|week|hour)\b/i;
const PHONE = /\+?\(?\d[\d\s().-]{8,}\d/g;
const EMAIL = /(?<![\w@])[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;

export type SpamSignal = "contact" | "money" | "phone" | "email" | "caps" | "repetition" | "odd_link";

const WEIGHT: Record<SpamSignal, number> = { contact: 2, money: 2, phone: 2, email: 1, caps: 1, repetition: 1, odd_link: 1 };

/** What reads like spam in some text, and how strongly. */
export function spamSignals(texts: readonly (string | null | undefined)[], links: readonly LinkFound[] = []): {
  signals: SpamSignal[];
  score: number;
} {
  const all = texts.filter(Boolean).join("\n");
  const signals: SpamSignal[] = [];
  if (CONTACT.test(all)) signals.push("contact");
  if (MONEY.test(all)) signals.push("money");
  const phone = [...all.matchAll(PHONE)].some((m) => {
    const digits = m[0].replace(/\D/g, "").length;
    return digits >= 10 && digits <= 15;
  });
  if (phone) signals.push("phone");
  if (EMAIL.test(all)) signals.push("email");
  const letters = all.match(/\p{L}/gu) ?? [];
  const upper = all.match(/\p{Lu}/gu) ?? [];
  if (letters.length >= 24 && upper.length / letters.length > 0.7) signals.push("caps");
  if (/(.)\1{9,}/u.test(all) || /\b(\w+)(?:\s+\1\b){5,}/iu.test(all)) signals.push("repetition");
  if (links.some((l) => SUSPICIOUS_TLDS.has(l.host.split(".").pop() ?? ""))) signals.push("odd_link");
  return { signals, score: signals.reduce((n, s) => n + WEIGHT[s], 0) };
}

export type SpamVerdict =
  | { action: "allow" }
  | { action: "refuse"; code: "too_many_links" | "too_many_mentions"; limit: number }
  | { action: "hold"; reason: "spam" | "links" | "new_account"; detail: string };

/** A score this high is held from anyone; a new account is held a point sooner. */
export const HOLD_SCORE = 3;

export function judgeSpam(
  texts: readonly (string | null | undefined)[],
  ctx: { level: TrustLevel; blockedHosts: readonly string[]; limits?: TrustLimits },
): SpamVerdict {
  if (ctx.level === "staff") return { action: "allow" };
  const limits = ctx.limits ?? TRUST_LIMITS[ctx.level];

  const mentions = countMentions(texts);
  if (mentions > limits.maxMentions) return { action: "refuse", code: "too_many_mentions", limit: limits.maxMentions };
  const links = findLinks(texts);
  if (links.length > limits.maxLinks) return { action: "refuse", code: "too_many_links", limit: limits.maxLinks };

  const blocked = links.find((l) => ctx.blockedHosts.some((b) => hostMatches(l.host, b)));
  if (blocked) return { action: "hold", reason: "spam", detail: `Blocked link: ${blocked.host}` };
  const short = links.find((l) => SHORTENERS.some((s) => hostMatches(l.host, s)));
  if (short) return { action: "hold", reason: "links", detail: `Short link: ${short.host}` };

  const { signals, score } = spamSignals(texts, links);
  const newish = ctx.level === "new" || ctx.level === "restricted";
  if (score >= HOLD_SCORE || (newish && score >= HOLD_SCORE - 1)) {
    return { action: "hold", reason: "spam", detail: `Reads like spam: ${signals.join(", ")}` };
  }
  if (links.length > 0 && limits.linksHeld) {
    return {
      action: "hold",
      reason: "new_account",
      detail: `${ctx.level === "new" ? "New account" : "Limited account"} with a link: ${links.map((l) => l.host).join(", ")}`,
    };
  }
  return { action: "allow" };
}

/**
 * Text reduced to what makes two messages "the same": letters and digits only,
 * lowercased, accents and spacing gone. Null when too short to judge, so a
 * reader saying "Amen" twice is never stopped.
 */
export function duplicateKey(text: string | null | undefined, min = 12): string | null {
  if (!text) return null;
  const key = text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return key.length >= min ? key : null;
}
