/**
 * Where a visit came from, read from what is already kept about it.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * Every anonymous session has stored its referrer since the first analytics
 * commit (2026-05-21, supabase/migrations/20260521000000_analytics.sql), and
 * until 2026-10-06 nothing read it. The owner that day: "I kind of want to
 * start tracking where my traffic is coming from and what platform they're
 * using to view Purify ... if they're coming from emails, it should say
 * they're coming from emails." Most of that was already on the row. This
 * turns it into a place with a name.
 *
 * ── What it reads ───────────────────────────────────────────────────────
 *
 * Two things the session row has always held, and nothing new:
 *
 *   referrer    what the browser said brought the reader here. A web address,
 *               or on Android the app a link was opened from
 *               (android-app://com.google.android.gm/ is Gmail).
 *   user agent  only for one thing here: the browser built into a social app
 *               names its app ("Instagram", "FBAN", "musical_ly") even when
 *               it sends no referrer, which is how most of a short video's
 *               visitors arrive.
 *
 * ── What it cannot know ─────────────────────────────────────────────────
 *
 * A reader who taps a link in Apple Mail, in most phone mail apps, in a text
 * message or in a chat app arrives with no referrer at all, exactly like one
 * who typed the address. Both are "direct" here, and nothing kept today can
 * tell them apart. Saying "this came from our release email" for every such
 * reader needs a tag on the links in our emails, which is a change to what is
 * recorded and so starts on the privacy page, not here.
 *
 * It is a read of one session at a time and joins nothing: not an account, not
 * another session.
 */

export type SourceKind = "search" | "social" | "email" | "assistant" | "site" | "direct";

export type Source = {
  kind: SourceKind;
  /** The place by name: "Google", "Instagram", "Gmail", or a host. Null for a direct visit. */
  name: string | null;
};

export const SOURCE_KINDS: readonly SourceKind[] = ["search", "social", "email", "assistant", "site", "direct"];

export const SOURCE_LABEL: Record<SourceKind, string> = {
  search: "Search",
  social: "Social",
  email: "Email",
  assistant: "AI assistants",
  site: "Other sites",
  direct: "Direct",
};

const DIRECT: Source = { kind: "direct", name: null };

/** Purify itself, in every form a referrer can name it. A link from our own page is not a source. */
const OWN_HOSTS = ["purifyapp.net", "purifyapp.onrender.com", "localhost", "127.0.0.1"];

/**
 * Places a reader passes through on the way back to us, which are not where
 * they came from: signing in with Google or Apple, paying, our own database's
 * sign-in pages.
 */
const PASSING_THROUGH = ["accounts.google.com", "appleid.apple.com", "supabase.co", "stripe.com", "revenuecat.com"];

type Place = { kind: Exclude<SourceKind, "direct" | "site">; name: string; hosts?: string[]; apps?: string[] };

/**
 * The order is the rule: the first place that matches wins, so a narrower
 * host (mail.google.com, gemini.google.com) stands before the wider one it
 * sits inside (google.com).
 */
const PLACES: Place[] = [
  // Mail read in a browser, and the mail apps that say so on Android.
  { kind: "email", name: "Gmail", hosts: ["mail.google.com"], apps: ["com.google.android.gm"] },
  { kind: "email", name: "Outlook", hosts: ["outlook.live.com", "outlook.office.com", "outlook.office365.com"], apps: ["com.microsoft.office.outlook"] },
  { kind: "email", name: "Yahoo Mail", hosts: ["mail.yahoo.com"], apps: ["com.yahoo.mobile.client.android.mail"] },
  { kind: "email", name: "Proton Mail", hosts: ["mail.proton.me"], apps: ["ch.protonmail.android"] },
  { kind: "email", name: "AOL Mail", hosts: ["mail.aol.com"] },
  { kind: "email", name: "iCloud Mail", hosts: ["icloud.com"] },
  { kind: "email", name: "Fastmail", hosts: ["fastmail.com"] },
  { kind: "email", name: "Zoho Mail", hosts: ["mail.zoho.com"] },

  { kind: "assistant", name: "ChatGPT", hosts: ["chatgpt.com", "chat.openai.com"] },
  { kind: "assistant", name: "Gemini", hosts: ["gemini.google.com"] },
  { kind: "assistant", name: "Claude", hosts: ["claude.ai"] },
  { kind: "assistant", name: "Perplexity", hosts: ["perplexity.ai"] },
  { kind: "assistant", name: "Copilot", hosts: ["copilot.microsoft.com"] },
  { kind: "assistant", name: "Grok", hosts: ["grok.com"] },
  { kind: "assistant", name: "Meta AI", hosts: ["meta.ai"] },
  { kind: "assistant", name: "DeepSeek", hosts: ["deepseek.com"] },

  { kind: "social", name: "Instagram", hosts: ["instagram.com"], apps: ["com.instagram.android"] },
  { kind: "social", name: "TikTok", hosts: ["tiktok.com"], apps: ["com.zhiliaoapp.musically", "com.ss.android.ugc.trill"] },
  { kind: "social", name: "YouTube", hosts: ["youtube.com", "youtu.be"], apps: ["com.google.android.youtube"] },
  { kind: "social", name: "Facebook", hosts: ["facebook.com", "fb.com", "messenger.com"], apps: ["com.facebook.katana", "com.facebook.orca"] },
  { kind: "social", name: "X", hosts: ["x.com", "twitter.com", "t.co"], apps: ["com.twitter.android"] },
  { kind: "social", name: "Reddit", hosts: ["reddit.com"], apps: ["com.reddit.frontpage"] },
  { kind: "social", name: "Discord", hosts: ["discord.com", "discordapp.com"], apps: ["com.discord"] },
  { kind: "social", name: "Threads", hosts: ["threads.net", "threads.com"], apps: ["com.instagram.barcelona"] },
  { kind: "social", name: "Bluesky", hosts: ["bsky.app"] },
  { kind: "social", name: "Pinterest", hosts: ["pinterest.com"], apps: ["com.pinterest"] },
  { kind: "social", name: "LinkedIn", hosts: ["linkedin.com", "lnkd.in"], apps: ["com.linkedin.android"] },
  { kind: "social", name: "Telegram", hosts: ["t.me", "telegram.org"], apps: ["org.telegram.messenger"] },
  { kind: "social", name: "WhatsApp", hosts: ["whatsapp.com", "wa.me"], apps: ["com.whatsapp"] },
  { kind: "social", name: "Snapchat", hosts: ["snapchat.com"], apps: ["com.snapchat.android"] },
  { kind: "social", name: "Tumblr", hosts: ["tumblr.com"] },
  { kind: "social", name: "VK", hosts: ["vk.com"] },

  { kind: "search", name: "Bing", hosts: ["bing.com"] },
  { kind: "search", name: "DuckDuckGo", hosts: ["duckduckgo.com"] },
  { kind: "search", name: "Yahoo", hosts: ["search.yahoo.com", "yahoo.com"] },
  { kind: "search", name: "Brave Search", hosts: ["search.brave.com"] },
  { kind: "search", name: "Ecosia", hosts: ["ecosia.org"] },
  { kind: "search", name: "Startpage", hosts: ["startpage.com"] },
  { kind: "search", name: "Kagi", hosts: ["kagi.com"] },
  { kind: "search", name: "Qwant", hosts: ["qwant.com"] },
  { kind: "search", name: "Baidu", hosts: ["baidu.com"] },
  { kind: "search", name: "Naver", hosts: ["naver.com"] },
  { kind: "search", name: "Google", apps: ["com.google.android.googlequicksearchbox"] },
];

/** google.com and every country's Google (google.co.uk, google.com.br, google.gr). */
const GOOGLE = /(^|\.)google\.(com|[a-z]{2,3})(\.[a-z]{2})?$/;
/** yandex.ru, yandex.com, yandex.com.tr. */
const YANDEX = /(^|\.)yandex\.[a-z]{2,3}(\.[a-z]{2})?$/;
/** Pinterest keeps a domain per country. */
const PINTEREST = /(^|\.)pinterest\.[a-z.]{2,6}$/;

/**
 * The browser built into an app names the app in its user agent. Read only
 * when the referrer said nothing, which inside these browsers is usual.
 */
const IN_APP: [RegExp, Source][] = [
  [/\bInstagram\b/, { kind: "social", name: "Instagram" }],
  [/\b(FBAN|FBAV|FB_IAB|FBIOS)\b/, { kind: "social", name: "Facebook" }],
  [/musical_ly|BytedanceWebview|\bTikTok\b/i, { kind: "social", name: "TikTok" }],
  [/\bSnapchat\b/, { kind: "social", name: "Snapchat" }],
  [/\bPinterest\b/, { kind: "social", name: "Pinterest" }],
  [/\bLinkedInApp\b/, { kind: "social", name: "LinkedIn" }],
  [/\bTwitter(Android| for iPhone)?\b/, { kind: "social", name: "X" }],
  [/\bBarcelona\b/, { kind: "social", name: "Threads" }],
  [/\bGSA\//, { kind: "search", name: "Google" }],
];

const under = (host: string, name: string) => host === name || host.endsWith(`.${name}`);

function parse(referrer: string): { scheme: string; host: string } | null {
  try {
    const url = new URL(referrer.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return host ? { scheme: url.protocol.replace(/:$/, "").toLowerCase(), host } : null;
  } catch {
    return null;
  }
}

function fromReferrer(referrer: string | null | undefined): Source | null {
  if (!referrer) return null;
  const at = parse(referrer);
  if (!at) return null;

  // On Android the referrer can be the app a link was opened from.
  if (at.scheme === "android-app" || at.scheme === "ios-app") {
    const place = PLACES.find((p) => p.apps?.includes(at.host));
    return place ? { kind: place.kind, name: place.name } : { kind: "site", name: "Another app" };
  }
  // Inside the store apps every page's own origin is "localhost" or a
  // capacitor address. A page of ours is not where the reader came from.
  if (at.scheme !== "http" && at.scheme !== "https") return null;
  if (OWN_HOSTS.some((own) => under(at.host, own))) return null;
  if (PASSING_THROUGH.some((via) => under(at.host, via))) return null;

  const place = PLACES.find((p) => p.hosts?.some((h) => under(at.host, h)));
  if (place) return { kind: place.kind, name: place.name };
  if (PINTEREST.test(at.host)) return { kind: "social", name: "Pinterest" };
  if (YANDEX.test(at.host)) return { kind: "search", name: "Yandex" };
  if (GOOGLE.test(at.host)) return { kind: "search", name: "Google" };
  return { kind: "site", name: at.host };
}

/** Where one session came from. `userAgent` is only asked which app's browser it is. */
export function classifySource(referrer: string | null | undefined, userAgent?: string | null): Source {
  const named = fromReferrer(referrer);
  if (named) return named;
  const ua = userAgent ?? "";
  for (const [mark, source] of IN_APP) if (mark.test(ua)) return source;
  return DIRECT;
}

/** A source in a few words: "Google", "Instagram", "Direct". */
export function sourceName(source: Source): string {
  return source.name ?? SOURCE_LABEL[source.kind];
}
