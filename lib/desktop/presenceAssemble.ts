"use client";

// The browser half of the Discord modes: find the facts a mode needs (the
// patron, the favorite saint's words, where the reader is on the page, the
// church season) and hand them to the pure builder in presenceModes.ts.
//
// The saints registry and the calendar are large, and this runs on every
// page of the desktop app, so both are imported only when a mode asks for
// them. Nothing here runs outside the desktop app.

import { apiFetch } from "@/lib/api/client";
import { getBook } from "@/lib/bible/books";
import {
  POSITION_UNITS,
  buildPresence,
  dayNumber,
  effectiveMode,
  nextNameDay,
  quoteOfTheDay,
  scriptureAuthor,
  type PositionUnit,
  type PresencePrefs,
  type PresenceRequest,
  type Quote,
  type ReadingPlace,
  type SaintFacts,
  type SeasonColor,
} from "@/lib/desktop/presenceModes";
import { liturgicalColorOn, type SeasonReason } from "@/lib/desktop/seasonColor";

type T = (key: string, vars?: Record<string, string | number>) => string;

export type SaintRecord = SaintFacts & { feastDays: string[]; quotes: Quote[]; byname?: string; iconUrl?: string };

const saints = new Map<string, SaintRecord | null>();

export async function loadSaint(slug: string): Promise<SaintRecord | null> {
  if (saints.has(slug)) return saints.get(slug) ?? null;
  const { getSaint } = await import("@/lib/saints/saints");
  const s = getSaint(slug);
  const rec: SaintRecord | null = s
    ? {
        slug: s.slug,
        name: s.name,
        pronoun: s.pronoun === "her" ? "her" : "his",
        feastDays: s.feastDays ?? [],
        quotes: (s.quotes ?? []).map((q) => ({ text: q.text, source: q.source, href: q.href })),
        byname: s.byname,
        iconUrl: s.iconUrl,
      }
    : null;
  saints.set(slug, rec);
  return rec;
}

/** Every saint, for the favorite picker. */
export async function allSaints(): Promise<{ slug: string; name: string }[]> {
  const { SAINTS } = await import("@/lib/saints/saints");
  return SAINTS.map((s) => ({ slug: s.slug, name: s.name })).sort((a, b) => a.name.localeCompare(b.name));
}

let patron: { at: number; slug: string | null; signedIn: boolean } | null = null;

/** The reader's patron saint (profiles.patron_saint), a minute at most old. */
export async function patronSlug(fresh = false): Promise<{ slug: string | null; signedIn: boolean }> {
  if (!fresh && patron && Date.now() - patron.at < 60_000) return patron;
  try {
    const res = await apiFetch("/api/profile/patron-saint");
    const slug = res.ok ? ((await res.json()) as { slug: string | null }).slug : null;
    patron = { at: Date.now(), slug, signedIn: res.status !== 401 };
  } catch {
    patron = { at: Date.now(), slug: patron?.slug ?? null, signedIn: patron?.signedIn ?? false };
  }
  return patron;
}

/** Today as the reader's own calendar day, at UTC noon. */
export function localDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12));
}

export async function seasonToday(
  style: "new" | "old",
  now = new Date(),
): Promise<{ color: SeasonColor; reason: SeasonReason }> {
  const { orthodoxPascha } = await import("@/lib/calendar/orthodox");
  return liturgicalColorOn(localDay(now), style, orthodoxPascha);
}

/** Where Discord fetches the pictures from, whatever page the app shows
 *  (presence.rs builds every picture URL on this origin). */
const ART_ORIGIN = "https://purifyapp.net";
let artProbe: { at: number; ok: Promise<boolean> } | null = null;

/**
 * Whether purifyapp.net draws the Discord pictures yet. A desktop app can
 * reach readers before the site deploys the route, or run against a branch
 * that has it while production does not; either way a picture Discord cannot
 * fetch is a broken square on the reader's profile. So the route is tried
 * once (an <img>, which needs no CORS), and until it answers, the status
 * keeps Purify's own uploaded picture and loses nothing else. Asked again
 * every half hour, so a deploy is picked up without a restart.
 */
export function artAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (artProbe && Date.now() - artProbe.at < 30 * 60_000) return artProbe.ok;
  const ok = new Promise<boolean>((resolve) => {
    const img = new Image();
    let timer = 0;
    const done = (v: boolean) => {
      window.clearTimeout(timer);
      resolve(v);
    };
    timer = window.setTimeout(() => done(false), 8000);
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = `${ART_ORIGIN}/api/discord/art?badge=gold`;
  });
  artProbe = { at: Date.now(), ok };
  return ok;
}

function clamp01(n: number): number {
  return Math.min(Math.max(Number.isFinite(n) ? n : 0, 0), 1);
}

/**
 * Where the reader is, read off the page itself. A chapter of Scripture is
 * one page, so the page's own scroll says how far through it they are. A
 * saint's work marks its sections (#s1, #s2 ...) and describes itself on its
 * <article> (components/saints/WritingReader.tsx); the section crossing a
 * line a third of the way down the window is the one being read.
 */
export function readPlace(pathname: string): ReadingPlace | null {
  if (typeof document === "undefined") return null;
  const seg = pathname.split(/[?#]/)[0].split("/").filter(Boolean);

  if (seg[0] === "bible" && seg.length >= 3 && /^\d{1,3}$/.test(seg[2])) {
    const book = getBook(seg[1]);
    const chapter = Number(seg[2]);
    if (!book || chapter < 1 || chapter > book.chapters) return null;
    const el = document.scrollingElement ?? document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    return { kind: "scripture", book: book.slug, chapter, chapters: book.chapters, fraction: clamp01(max > 0 ? el.scrollTop / max : 0) };
  }

  if (seg[0] === "saints" && seg.length >= 3) {
    const article = document.querySelector<HTMLElement>("article[data-presence-work]");
    if (!article) return null;
    const sections = Array.from(article.querySelectorAll<HTMLElement>("section[id]")).filter((el) => /^s\d+$/.test(el.id));
    const total = Number(article.dataset.presenceSections) || sections.length;
    if (!total) return null;
    const line = window.innerHeight / 3;
    let current: HTMLElement | undefined = sections[0];
    for (const el of sections) {
      if (el.getBoundingClientRect().top <= line) current = el;
      else break;
    }
    const n = current ? Number(current.id.slice(1)) : 1;
    const rect = current?.getBoundingClientRect();
    const unit = article.dataset.presenceUnit;
    return {
      kind: "work",
      saint: { slug: seg[1], name: article.dataset.presenceAuthor ?? "", pronoun: "his" },
      path: `/saints/${seg[1]}/${seg[2]}`,
      title: article.dataset.presenceWork ?? "",
      unit: (POSITION_UNITS as readonly string[]).includes(unit ?? "") ? (unit as PositionUnit) : "section",
      section: Math.min(Math.max(n, 1), total),
      sections: total,
      fraction: rect && rect.height > 0 ? clamp01((line - rect.top) / rect.height) : 0,
    };
  }
  return null;
}

export type AssembleInput = {
  prefs: PresencePrefs;
  plusAllowed: boolean;
  pathname: string;
  title?: string | null;
  t: T;
  style: "new" | "old";
  locale: string;
  now?: Date;
  /** Reading, for the Settings preview: an example in place of the page. */
  place?: ReadingPlace | null;
  /** The Settings preview draws the pictures from this site itself, so it
   *  shows them whether or not purifyapp.net serves them yet. */
  preview?: boolean;
};

/** The request for the status to show now, or null for none. */
export async function assemblePresence(input: AssembleInput): Promise<PresenceRequest | null> {
  const { prefs, t, style } = input;
  const { base, plus } = effectiveMode(prefs, input.plusAllowed);
  if (base === "off") return null;
  const now = input.now ?? new Date();
  const today = localDay(now);
  const format = (d: Date) => d.toLocaleDateString(input.locale, { month: "long", day: "numeric", timeZone: "UTC" });

  let patronFacts: Parameters<typeof buildPresence>[0]["patron"] = null;
  let favoriteFacts: Parameters<typeof buildPresence>[0]["favorite"] = null;
  let place: ReadingPlace | null = null;

  if (base === "patron") {
    const { slug } = await patronSlug();
    const s = slug ? await loadSaint(slug) : null;
    if (s) patronFacts = { saint: s, nameDay: nextNameDay(s.feastDays, today, style, format) };
  } else if (base === "favorite" && prefs.favorite) {
    const s = await loadSaint(prefs.favorite);
    if (s) favoriteFacts = { saint: s, quote: quoteOfTheDay(s.quotes, dayNumber(now)), byname: s.byname };
  } else if (base === "reading") {
    place = input.place !== undefined ? input.place : readPlace(input.pathname);
    if (place?.kind === "scripture" && !place.authorName) {
      const author = scriptureAuthor(place.book);
      const s = author ? await loadSaint(author) : null;
      if (s) place = { ...place, authorName: s.name };
    }
  }

  let todayColor: { color: SeasonColor; reason: string } | null = null;
  if (plus && prefs.followSeason) {
    const c = await seasonToday(style, now);
    todayColor = { color: c.color, reason: t(`desktop.presence.season.${c.reason}`) };
  }

  const request = buildPresence({
    prefs,
    plusAllowed: input.plusAllowed,
    t,
    pathname: input.pathname,
    title: input.title,
    patron: patronFacts,
    favorite: favoriteFacts,
    place,
    today: todayColor,
  });
  if (!request || input.preview || (!request.art && !request.badge) || (await artAvailable())) return request;
  const plain: PresenceRequest = { ...request };
  delete plain.art;
  delete plain.badge;
  delete plain.smallText;
  return plain;
}
