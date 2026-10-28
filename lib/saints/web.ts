import "server-only";

import { COUNCILS, type Council } from "@/lib/councils/councils";
import { publishedEvents } from "@/lib/history/events";

import { segmentNames } from "./nameLinks";
import { SAINTS, type Saint } from "./saints";
import type { SaintWebData, TimelineRow, WebCouncilNode, WebNode, WebPerson, WebSaintNode } from "./webLayout";

/**
 * A saint's web (1.8): who taught whom, who sat at which council, who stood
 * in the same moment of the Church's history, and whose Life names whom. The
 * owner's brief for it: "Who taught whom, who was at which council, who wrote
 * about whom. The name links already in the texts are the start." Every tie
 * is read from data the app already carries, and nothing is written for it:
 *
 *  - Saint.disciples (lib/saints/saints.ts): a teacher and the disciples the
 *    registry names, with the registry's own line on each;
 *  - Council.principalFathers (lib/councils/councils.ts): the council, and
 *    each father's part in it as the council's page tells it;
 *  - the published events of Orthodox History (lib/history/events.ts) and
 *    the saints each names (rel.saints);
 *  - the Lives: a saint named in another's Life, by the same name links the
 *    Life itself draws (lib/saints/nameLinks.ts), with the sentence he is
 *    named in.
 *
 * The family, the friends and the letters the design round drew for St Basil
 * are not in the app's data, so they are not on the web. A saint none of these
 * joins to anyone has no web, and his page offers no door to one.
 *
 * The Timeline is the same web down his life: the sentences of his Life that
 * carry a year or name a saint of the web, the councils he sat at and the
 * events he is in, with his birth and repose where the registry gives a year.
 *
 * On the server only: it reads the whole registry, which the app's script
 * must never carry. The screen is handed the result (webLayout.ts).
 */

const BY_SLUG = new Map(SAINTS.map((s) => [s.slug, s]));

/** The name without its "St." or "Sts.": the web's labels. */
export function shortName(name: string): string {
  return name.replace(/^(?:Saints?|Sts?\.|Ss\.)\s+/, "").trim();
}

/* ---- Years ---- */

const MONTH = "January|February|March|April|May|June|July|August|September|October|November|December";
const DAY_AFTER_MONTH = new RegExp(`\\b(?:${MONTH})\\s+$`);
const DAY_BEFORE_MONTH = new RegExp(`^\\s+(?:${MONTH})\\b`);
const APPROX = /\b(?:c\.|ca\.|circa|around|about|perhaps|probably|tradition)/i;

export type DatedLine = { at: number; year: string; note?: string };

/**
 * The year in a registry date line ("c. 330 (Caesarea in Cappadocia)",
 * "January 1, 379", "December 13, 1836 or 1837 (Spruce Island, Alaska)"),
 * as the year column shows it, with what the brackets add. Null when there is
 * no year to stand on: a century, a date before Christ, two saints' years in
 * one line, or a year the line itself leaves open.
 */
export function dateYear(line: string | undefined): DatedLine | null {
  if (!line || line.includes(";") || /\bBC\b|B\.C\./.test(line)) return null;
  // A range of years is its first year.
  const text = line.replace(/(\d{3,4})\s*[–-]\s*\d{2,4}/g, "$1");
  const years: number[] = [];
  for (const m of text.matchAll(/(?<![\p{L}\p{N}])(\d{1,4})(?![\p{L}\p{N}])/gu)) {
    const at = m.index ?? 0;
    const before = text.slice(0, at);
    const after = text.slice(at + m[1].length);
    const n = Number(m[1]);
    // "January 1, 379" and "12 March 604": the day is not the year. "May 381" is.
    if (n <= 31 && (DAY_AFTER_MONTH.test(before) || DAY_BEFORE_MONTH.test(after))) continue;
    if (n >= 30 || /(?:\bAD|c\.)\s*$/.test(before)) years.push(n);
  }
  const distinct = [...new Set(years)];
  if (distinct.length === 0) return null;
  const open = / or /.test(text);
  if (distinct.length > 1 && !open) return null;
  const approx = open || APPROX.test(text);
  const note = /\(([^)]+)\)/.exec(line)?.[1]?.trim();
  return { at: distinct[0], year: `${approx ? "c. " : ""}${distinct[0]}`, ...(note ? { note } : {}) };
}

/** "c. 329–390": a life from both ends, or nothing. */
export function lifeSpan(saint: Pick<Saint, "born" | "reposed">): string | undefined {
  const born = dateYear(saint.born);
  const reposed = dateYear(saint.reposed);
  return born && reposed ? `${born.year}–${reposed.year}` : undefined;
}

/* ---- Sentences ---- */

/** Words a full stop ends without ending the sentence. */
const ABBREVIATIONS = new Set(["St", "Sts", "Ss", "c", "ca", "cf", "Mt", "Fr", "Dr", "Rev", "vol", "Vol", "p", "pp", "no", "No", "ed", "eds", "trans", "Bp", "Abp", "i.e", "e.g", "viz", "A.D", "B.C", "vs"]);

/** A Life's paragraph, sentence by sentence, never cut after "St." or an initial. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (const m of text.matchAll(/[.!?]["'’”)\]]*(\s+)(?=["'‘“(]?\p{Lu})/gu)) {
    const at = m.index ?? 0;
    const word = /([\p{L}.]+)$/u.exec(text.slice(start, at))?.[1] ?? "";
    if (ABBREVIATIONS.has(word) || /^\p{Lu}$/u.test(word)) continue;
    const end = at + m[0].length - m[1].length;
    out.push(text.slice(start, end).trim());
    start = at + m[0].length;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** Counted things a number may stand before, so "about 300 monks" is never a year. */
const COUNTED = "years?|months?|days?|nights?|men|women|monks|nuns|bishops|fathers|priests|people|martyrs|soldiers|miles|stadia|pages|chapters|homilies|letters|sermons|lines|verses|souls|disciples|brethren|members|houses|churches|times";
const SENTENCE_YEAR = new RegExp(
  `(?<![\\p{L}])(in|c\\.|ca\\.|circa|around|about|by|until|till|from|after|before|of|year|since|spring|summer|autumn|winter|lent|${MONTH})\\s+(\\d{3,4})(?![\\p{L}\\p{N}])(?!\\s*(?:BC\\b|B\\.C\\.|(?:${COUNTED})\\b))`,
  "iu",
);

/**
 * The year a sentence of a Life stands at, and how the year column says it:
 * "Made bishop of Caesarea in 370" is 370, "born around 296" is "c. 296".
 * Only a year after a word that dates it, between AD 30 and today.
 */
export function sentenceYear(sentence: string): { at: number; year: string } | null {
  const m = SENTENCE_YEAR.exec(sentence);
  if (!m) return null;
  const at = Number(m[2]);
  if (at < 30 || at > new Date().getUTCFullYear()) return null;
  const lead = sentence.slice(Math.max(0, (m.index ?? 0) - 16), m.index ?? 0);
  const approx = /^(?:c\.|ca\.|circa|around|about)$/i.test(m[1]) || /\b(?:perhaps|probably)\s*$/i.test(lead);
  return { at, year: `${approx ? "c. " : ""}${at}` };
}

/* ---- The Lives, read once ---- */

type LifeSentence = { text: string; named: string[] };

/**
 * A name that stands for a place or a day and not for the saint: "the
 * monastery of St. John the Theologian", "the feast of the Entry of the
 * Theotokos", "churches to the Mother of God", "the Kursk Root icon of the
 * Mother of God". The Life still links it; the web does not count it as a
 * tie between two saints.
 */
const DEDICATION =
  /\b(?:monaster(?:y|ies)|church(?:es)?|cathedral|chapel|skete|convent|lavra|hermitage|icons?|feast|entry|entrance|dormition|nativity|protection|annunciation|synaxis|presentation)\s+(?:of|to)\s+(?:(?:the|our|all|holy|most|blessed)\s+)*$/i;

/** The saints a sentence names, each once, leaving out a name that is a dedication. */
export function namedIn(text: string, skip: string): string[] {
  const out: string[] = [];
  let before = "";
  for (const part of segmentNames(text, skip)) {
    if (part.slug && BY_SLUG.has(part.slug) && !DEDICATION.test(before)) out.push(part.slug);
    before += part.text;
  }
  return out;
}

let LIVES: Map<string, LifeSentence[]> | null = null;

/** Every Life, sentence by sentence, with the saints each sentence names. */
function lives(): Map<string, LifeSentence[]> {
  if (LIVES) return LIVES;
  LIVES = new Map();
  for (const s of SAINTS) {
    const rows: LifeSentence[] = [];
    for (const paragraph of s.life) {
      for (const text of splitSentences(paragraph)) rows.push({ text, named: namedIn(text, s.slug) });
    }
    LIVES.set(s.slug, rows);
  }
  return LIVES;
}

/* ---- The web ---- */

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];

/** "Nicaea, 325": a council's place and year, from its own location line. */
export function councilTag(c: Pick<Council, "location" | "year">): string {
  const place = c.location.split(/\s+(?:in|on)\s+|[,(]/)[0].trim();
  return `${place}, ${c.year}`;
}

function councilMark(c: Council): string {
  if (c.ordinal) return ROMAN[c.ordinal];
  return (c.location.trim()[0] ?? "C").toUpperCase();
}

function personOf(s: Saint): WebPerson {
  const short = shortName(s.name);
  const years = lifeSpan(s);
  return {
    slug: s.slug,
    name: s.name,
    short,
    ...(s.iconUrl ? { icon: s.iconUrl } : {}),
    initial: (short.replace(/^The\s+/, "")[0] ?? "?").toUpperCase(),
    ...(years ? { years } : {}),
    pronoun: s.pronoun === "her" ? "her" : "his",
  };
}

/** How strong a node's ties are, for the order the web fills its places in. */
function weight(node: WebNode): number {
  const kinds = new Set(node.ties.map((t) => t.kind));
  const best = Math.min(
    ...node.ties.map((t) => ({ disciple: 0, teacher: 0, council: node.kind === "council" ? 0 : 2, history: 3, life: 4 })[t.kind]),
  );
  return best * 10 - kinds.size;
}

/** A saint's web, or null when nothing in the app's data joins him to anyone. */
export function saintWeb(slug: string): SaintWebData | null {
  const center = BY_SLUG.get(slug);
  if (!center) return null;
  const nodes = new Map<string, WebNode>();
  const saintNode = (s: Saint): WebSaintNode => {
    const id = `saint:${s.slug}`;
    let node = nodes.get(id);
    if (!node) {
      node = { kind: "saint", id, person: personOf(s), ties: [] };
      nodes.set(id, node);
    }
    return node as WebSaintNode;
  };
  const timeline: TimelineRow[] = [];

  // Who taught whom: his disciples, and the saints who name him theirs.
  for (const d of center.disciples ?? []) {
    const s = BY_SLUG.get(d.slug);
    if (s && s.slug !== slug) saintNode(s).ties.push({ kind: "disciple", title: d.relation, text: d.blurb });
  }
  for (const t of SAINTS) {
    if (t.slug === slug) continue;
    for (const d of t.disciples ?? []) {
      if (d.slug === slug) saintNode(t).ties.push({ kind: "teacher", title: d.relation, text: d.blurb });
    }
  }

  // The councils he sat at, and the fathers beside him there.
  const councils = COUNCILS.filter((c) => c.principalFathers?.some((f) => f.slug === slug));
  for (const c of councils) {
    const id = `council:${c.slug}`;
    const href = `/councils/${c.slug}`;
    const title = `${c.byname}, ${c.year}`;
    const role = c.principalFathers?.find((f) => f.slug === slug)?.role ?? c.shortBio;
    const node: WebCouncilNode = {
      kind: "council",
      id,
      slug: c.slug,
      name: c.byname,
      year: c.year,
      mark: councilMark(c),
      ties: [{ kind: "council", title, text: role, href }],
    };
    nodes.set(id, node);
    const people: string[] = [id];
    for (const f of c.principalFathers ?? []) {
      const s = f.slug ? BY_SLUG.get(f.slug) : undefined;
      if (!s || s.slug === slug) continue;
      saintNode(s).ties.push({ kind: "council", tag: councilTag(c), title, text: f.role, href, via: id });
      people.push(`saint:${s.slug}`);
    }
    timeline.push({ kind: "council", at: c.year, year: String(c.year), council: id, text: role, href, people });
  }

  // The moments of the Church's history he is named in, with the others in
  // them. An event that is one of his councils is that council's moment.
  for (const e of publishedEvents()) {
    if (!e.rel?.saints?.includes(slug)) continue;
    const same = councils.find((c) => e.rel?.councils?.includes(c.slug) && c.year === e.yearStart);
    const people: string[] = [];
    for (const other of e.rel.saints) {
      const s = BY_SLUG.get(other);
      if (!s || s.slug === slug) continue;
      const node = saintNode(s);
      people.push(node.id);
      if (same && node.ties.some((t) => t.via === `council:${same.slug}`)) continue;
      node.ties.push({
        kind: "history",
        tag: e.shortTitle ?? String(e.yearStart),
        title: `${e.title}, ${e.displayDate}`,
        text: e.preview,
        href: `/history/${e.slug}`,
      });
    }
    if (same) {
      const row = timeline.find((r) => r.kind === "council" && r.council === `council:${same.slug}`);
      if (row && row.kind === "council") for (const p of people) if (!row.people.includes(p)) row.people.push(p);
    } else {
      timeline.push({ kind: "event", at: e.yearStart, year: e.displayDate, title: e.title, text: e.preview, href: `/history/${e.slug}`, people });
    }
  }

  // The Lives: the saints his names, and the saints whose Lives name him.
  const all = lives();
  const own = all.get(slug) ?? [];
  const firstIn = new Map<string, string>();
  for (const row of own) for (const other of row.named) if (!firstIn.has(other)) firstIn.set(other, row.text);
  for (const [other, text] of firstIn) {
    const s = BY_SLUG.get(other);
    if (s) saintNode(s).ties.push({ kind: "life", life: { slug, name: center.name }, text });
  }
  for (const s of SAINTS) {
    if (s.slug === slug) continue;
    const row = all.get(s.slug)?.find((r) => r.named.includes(slug));
    if (row) saintNode(s).ties.push({ kind: "life", life: { slug: s.slug, name: s.name }, text: row.text });
  }

  if (nodes.size === 0) return null;
  const ordered = [...nodes.values()].sort(
    (a, b) => weight(a) - weight(b) || label(a).localeCompare(label(b)),
  );

  // His Life down the line: the sentences with a year or a saint of the web
  // in them, each where his Life tells it. A sentence with no year of its own
  // stands with the one before it, and never past his repose.
  const born = dateYear(center.born);
  const reposed = dateYear(center.reposed);
  let at = born?.at ?? 0;
  const years = new Set<number>();
  for (const row of own) {
    const dated = sentenceYear(row.text);
    const people = row.named.map((s) => `saint:${s}`).filter((id) => nodes.has(id));
    if (!dated && people.length === 0) continue;
    if (dated) {
      at = dated.at;
      years.add(dated.at);
      timeline.push({ kind: "life", at, year: dated.year, text: row.text, people });
    } else {
      timeline.push({ kind: "life", at: reposed ? Math.min(at, reposed.at) : at, text: row.text, people });
    }
  }
  if (born && !years.has(born.at)) timeline.push({ kind: "born", at: born.at, year: born.year, ...(born.note ? { note: born.note } : {}) });
  if (reposed && !years.has(reposed.at)) timeline.push({ kind: "reposed", at: reposed.at, year: reposed.year, ...(reposed.note ? { note: reposed.note } : {}) });
  const ORDER: Record<TimelineRow["kind"], number> = { born: 0, life: 1, council: 2, event: 3, reposed: 4 };
  const sorted = timeline
    .map((row, i) => ({ row, i }))
    .sort((a, b) => a.row.at - b.row.at || ORDER[a.row.kind] - ORDER[b.row.kind] || a.i - b.i)
    .map(({ row }) => row);

  const placed = new Set(sorted.flatMap((r) => ("people" in r ? r.people : [])));
  return {
    center: personOf(center),
    nodes: ordered,
    timeline: sorted,
    ...(reposed ? { reposedAt: reposed.at } : {}),
    undated: ordered.map((n) => n.id).filter((id) => !placed.has(id)),
  };
}

function label(node: WebNode): string {
  return node.kind === "saint" ? node.person.short : node.name;
}

let WEBBED: Set<string> | null = null;

/** The saints who have a web: the pages the app builds for it. */
export function webSlugs(): string[] {
  if (!WEBBED) WEBBED = new Set(SAINTS.filter((s) => saintWeb(s.slug) !== null).map((s) => s.slug));
  return [...WEBBED];
}

/** Whether a saint's page offers the door into his web. */
export function hasWeb(slug: string): boolean {
  if (!WEBBED) webSlugs();
  return WEBBED!.has(slug);
}
