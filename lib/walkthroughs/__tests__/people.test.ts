// Who a walk's note introduces (lib/walkthroughs/people.ts), held to what the
// app carries. The words are ours and wait for a future clergy review, so what
// can be checked mechanically is checked here: each person is introduced once,
// on the first note that names them; every feast is the one the calendar
// writes; every fact rests on a line of text the app ships (the calendar, the
// saints' pages, the day's readings, the Bible, St. Gregory's Morals, the
// prayers), and that line says it; every picture is one the app already shows,
// with its rights recorded, cut inside its own edges and large enough to be
// sharp; the words are in every language with no em dash; and the sheet draws
// the icon beside the name, then the feast and the lines.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { NoteFigures } from "@/components/walkthrough/NoteFigures";
import { orthodoxPascha } from "@/lib/calendar/pascha";
import { getMessages } from "@/lib/i18n";
import { FIGURES } from "@/lib/readAloud/covers";
import { COVER_ART } from "@/lib/reading/coverArt";
import { feastDayIn } from "@/lib/saints/feastDay";
import { getSaint } from "@/lib/saints/saints";
import { WALKTHROUGHS } from "@/lib/walkthroughs";
import {
  NOTE_PEOPLE,
  NOTE_PLACES,
  WALK_PEOPLE,
  WALK_PEOPLE_REVIEW,
  WALK_PLACES,
  portraitPlacement,
  type Evidence,
} from "@/lib/walkthroughs/people";
import type { ContextCard, Walkthrough } from "@/lib/walkthroughs/types";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const json = <T>(rel: string) => JSON.parse(read(rel)) as T;
const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const EM_DASH = String.fromCharCode(0x2014);
const PD = /^(public domain|cc0)$/i;

const DAILY = json<Record<string, { name: string; note?: string }[]>>("data/calendar/daily-saints.json");
const READINGS = json<{ days: Record<string, [string, string][]> }>("data/calendar/official-readings.json").days;
const CATALOGS = fs
  .readdirSync(path.join(ROOT, "lib/i18n/messages"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ code: f.replace(/\.json$/, ""), words: json<Record<string, string>>(`lib/i18n/messages/${f}`) }));

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "May 6" as the calendar's day key, "05-06". */
function dayKey(feast: string): string {
  const [month, day] = feast.split(" ");
  return `${String(MONTHS.indexOf(month) + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Every note of every walk, in the order a reader meets them. */
function notesInOrder(): { walk: Walkthrough; card: ContextCard }[] {
  return Object.values(WALKTHROUGHS).flatMap((walk) => walk.chapters.flatMap((c) => c.cards.map((card) => ({ walk, card }))));
}

/** What a note says that names a person: its line, its note, and the credit of the Father's line it gives. */
function namesIn(walk: Walkthrough, card: ContextCard): string {
  return [card.hook, card.body, card.father ? walk.fatherSource : ""].join(" ");
}

/** A JPEG's pixel size, read from its frame header. */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

const PAULINE = /^(Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews)\b/;

/** Why a piece of evidence does not hold, or null when it does. */
function fails(e: Evidence): string | null {
  switch (e.kind) {
    case "calendar": {
      const hit = (DAILY[e.day] ?? []).find((x) => x.name === e.name);
      if (!hit) return `the calendar has no "${e.name}" on ${e.day}`;
      if (e.note && !(hit.note ?? "").includes(e.note)) return `the calendar's note on ${e.day} does not say "${e.note}"`;
      return null;
    }
    case "profile": {
      const s = getSaint(e.slug);
      if (!s) return `no saint ${e.slug}`;
      return squash([s.epithet, s.shortBio, ...s.life].join(" ")).includes(squash(e.says)) ? null : `${e.slug}'s page does not say "${e.says}"`;
    }
    case "profileFeast": {
      const s = getSaint(e.slug);
      return s ? null : `no saint ${e.slug}`;
    }
    case "scripture": {
      const ch = json<{ verses: { n: number; text: string }[] }>(`data/bible/${e.book}/${e.chapter}.json`);
      const v = ch.verses.find((x) => x.n === e.verse);
      return v && v.text.includes(e.says) ? null : `${e.book} ${e.chapter}:${e.verse} does not say "${e.says}"`;
    }
    case "father": {
      const c = json<Record<string, { text: string }[]>>(`data/bible/commentary/${e.book}/${e.chapter}.json`);
      const entry = c[String(e.verse)]?.[e.index];
      return entry && squash(entry.text).includes(squash(e.says)) ? null : `${e.book} ${e.chapter}:${e.verse}[${e.index}] does not say "${e.says}"`;
    }
    case "reading": {
      const day = READINGS[e.date] ?? [];
      return day.some(([ref, label]) => ref === e.reading && label === e.label) ? null : `${e.date} does not appoint ${e.reading} (${e.label})`;
    }
    case "file":
      return read(e.path).includes(e.says) ? null : `${e.path} does not say "${e.says}"`;
    case "epistles": {
      const days = Object.values(READINGS).map((rs) => rs.filter(([, label]) => label === "Epistle")).filter((eps) => eps.length > 0);
      const pauline = days.filter((eps) => eps.some(([ref]) => PAULINE.test(ref))).length;
      return pauline / days.length >= e.atLeast ? null : `only ${pauline} of ${days.length} days read St. Paul`;
    }
  }
}

const people = Object.values(WALK_PEOPLE);
const places = Object.values(WALK_PLACES);

describe("who a walk's note introduces", () => {
  it("is everyone in the registry, each once, on the first note of the walk that names them", () => {
    const ids = Object.values(NOTE_PEOPLE);
    expect(new Set(ids).size, "a person introduced twice").toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.keys(WALK_PEOPLE).sort());
    for (const [id, p] of Object.entries(WALK_PEOPLE)) expect(p.id).toBe(id);

    const notes = notesInOrder();
    for (const [cardId, id] of Object.entries(NOTE_PEOPLE)) {
      const person = WALK_PEOPLE[id];
      expect(notes.some((n) => n.card.id === cardId), `${cardId} is not a note`).toBe(true);
      const first = notes.find((n) => person.names.some((name) => namesIn(n.walk, n.card).includes(name)));
      expect(first?.card.id, `the first note to name ${id}`).toBe(cardId);
    }
  });

  it("introduces each place on a note that names it", () => {
    const notes = notesInOrder();
    for (const [cardId, id] of Object.entries(NOTE_PLACES)) {
      const note = notes.find((n) => n.card.id === cardId);
      expect(note, cardId).toBeTruthy();
      expect(WALK_PLACES[id].names.some((name) => `${note!.card.hook} ${note!.card.body}`.includes(name)), `${cardId} names ${id}`).toBe(true);
    }
  });

  it("gives each person's feast as the Church's calendar writes it", () => {
    for (const p of people) {
      expect(p.feastFrom.length, p.id).toBeGreaterThan(0);
      for (const e of p.feastFrom) {
        expect(fails(e), p.id).toBeNull();
        if (e.kind === "calendar") expect(dayKey(p.feast), `${p.id} feast`).toBe(e.day);
        if (e.kind === "profileFeast") expect(getSaint(e.slug)?.feastDays[0], `${p.id} feast`).toBe(p.feast);
      }
    }
  });

  it("rests every fact on a line the app carries, and the line says it", () => {
    for (const x of [...people, ...places]) {
      expect(x.facts.length, x.id).toBeGreaterThan(0);
      for (const f of x.facts) {
        expect(f.from.length, `${x.id}: ${f.claim}`).toBeGreaterThan(0);
        for (const e of f.from) expect(fails(e), `${x.id}: ${f.claim}`).toBeNull();
      }
    }
  });

  it("reads Job in Holy Week from the right days: Vespers each day, Monday to Friday", () => {
    const pascha = orthodoxPascha(2027);
    const week = [-6, -5, -4, -3, -2].map((n) => isoDay(addDays(pascha, n)));
    for (const day of week) {
      const job = (READINGS[day] ?? []).filter(([ref, label]) => ref.startsWith("Job ") && label.startsWith("Vespers"));
      expect(job.length, `${day} reads Job at Vespers`).toBe(1);
    }
    // The Presanctified Liturgy on the first three of them, St. Gregory's.
    for (const day of week.slice(0, 3)) {
      expect((READINGS[day] ?? []).some(([, label]) => label === "Gospel, Presanctified"), day).toBe(true);
    }
    // Every reading the registry names is from that week.
    for (const x of [...people, ...places]) {
      for (const f of x.facts) for (const e of f.from) if (e.kind === "reading") expect(week, `${x.id}: ${e.date}`).toContain(e.date);
    }
  });

  it("shows a picture the app already shows, with its rights recorded, cut sharp and inside its edges", () => {
    for (const p of people) {
      const { file, width, height, crop, registry } = p.portrait;
      if (registry.kind === "readAloud") {
        const figure = FIGURES[registry.figure];
        expect(figure?.file, p.id).toBe(file);
        expect(figure?.license, p.id).toMatch(PD);
      } else {
        const art = COVER_ART[registry.slug];
        expect(art?.kind, p.id).toBe("streamed");
        if (art?.kind !== "streamed") continue;
        expect(art.file, p.id).toBe(file);
        expect([art.width, art.height], p.id).toEqual([width, height]);
        expect(art.license, p.id).toMatch(PD);
      }
      expect(file, p.id).toMatch(/^\/covers\/.+\.v\d+\.jpg$/);
      expect(jpegSize(fs.readFileSync(path.join(ROOT, "public", file))), p.id).toEqual({ width, height });
      // Inside the picture, and at least three of its pixels to each of the
      // icon's 56 on the screen, so it is sharp on a phone.
      expect(crop.left, p.id).toBeGreaterThanOrEqual(0);
      expect(crop.top, p.id).toBeGreaterThanOrEqual(0);
      expect(crop.left + crop.size, p.id).toBeLessThanOrEqual(width);
      expect(crop.top + crop.size, p.id).toBeLessThanOrEqual(height);
      expect(crop.size, p.id).toBeGreaterThanOrEqual(168);
      const at = portraitPlacement(p.portrait);
      expect(at.width + at.left, p.id).toBeGreaterThanOrEqual(100);
      expect(at.height + at.top, p.id).toBeGreaterThanOrEqual(100);
    }
  });

  it("says it in every language, with no em dash and no quotation", () => {
    expect(CATALOGS.length).toBe(21);
    const keys = [...people.flatMap((p) => [p.nameKey, p.churchKey]), ...places.flatMap((x) => [x.nameKey, x.lineKey])];
    for (const { code, words } of CATALOGS) {
      for (const k of keys) {
        expect(words[k]?.trim(), `${code} ${k}`).toBeTruthy();
        expect(words[k].includes(EM_DASH), `${code} ${k}`).toBe(false);
      }
      // The references Job's lines give, in the language's own way of writing them.
      expect(words["walk.person.job.church"], code).toMatch(/5\s*[:,]\s*11/);
      expect(words["walk.person.job.church"], code).toMatch(/14\s*[:,]\s*14/);
    }
    const en = CATALOGS.find((c) => c.code === "en")!.words;
    for (const p of people) {
      // A sentence ends at a full stop, but not the one after "St".
      const sentences = en[p.churchKey].split(/(?<!\bSt\.)(?<=[.?!])\s+/).filter(Boolean);
      expect(sentences.length, p.id).toBeGreaterThanOrEqual(2);
      expect(sentences.length, p.id).toBeLessThanOrEqual(3);
      expect(en[p.churchKey], p.id).not.toMatch(/["“”]/);
    }
    expect(en["walk.person.job.church"]).toContain("(James 5:11)");
    expect(en["walk.person.job.church"]).toContain("(Ezekiel 14:14)");
  });

  it("is marked for a future clergy review, and the queue names it", () => {
    expect(WALK_PEOPLE_REVIEW.status).toBe("awaiting-clergy-review");
    expect(read("docs/editorial-standards.md")).toContain("WALK_PEOPLE_REVIEW");
  });
});

describe("the note sheet", () => {
  type ProviderProps = Parameters<typeof MessagesProvider>[0];
  const render = (cardId: string, code: string) =>
    renderToString(createElement(MessagesProvider, { locale: code, messages: getMessages(code) } as ProviderProps, createElement(NoteFigures, { cardId })));
  const html = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

  it("draws the icon beside the title, the feast under it, then the lines and the place, in the reader's language", () => {
    for (const code of ["en", "ru", "ar"]) {
      const words = getMessages(code);
      const job = WALK_PEOPLE.job;
      const out = render("job-1-1", code);
      const icon = out.indexOf(`src="${job.portrait.file}"`);
      // The name, as the text beside the icon.
      const name = out.indexOf(`>${html(words[job.nameKey])}</p>`);
      expect(icon, `${code} icon`).toBeGreaterThan(-1);
      expect(name, `${code} name`).toBeGreaterThan(icon);
      expect(out, code).toContain(`${html(words["saints.feastLabel"])} ${html(feastDayIn(job.feast, code))}`);
      expect(out.indexOf(html(words[job.churchKey])), `${code} lines`).toBeGreaterThan(name);
      expect(out.indexOf(html(words["walk.place.ausis.line"])), `${code} place`).toBeGreaterThan(out.indexOf(html(words[job.churchKey])));
      // The icon is beside the name it shows, so a screen reader hears the name once.
      expect(out, code).toMatch(/<span aria-hidden="true"[^>]*data-walk-portrait="waiting"/);
      expect(out, code).toContain('alt=""');
      expect(out, code).not.toMatch(/walk\.(person|place)\./);
    }
  });

  it("shows the person a later note introduces, and nothing on a note that introduces no one", () => {
    expect(render("job-1-5", "en")).toContain('data-walk-person="gregory"');
    expect(render("job-35-14", "en")).toContain('data-walk-person="chrysostom"');
    expect(render("job-1-12", "en")).toBe("");
    expect(render("job-2-9", "en")).toBe("");
  });
});
