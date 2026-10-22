// Historical-data integrity gate for the Orthodox History timeline.
//
// This suite is the release gate the History feature ships behind: it fails
// CI if any published event is missing sources, mislabeled, misdated,
// pointing at content that doesn't exist, or otherwise below the editorial
// bar. Content edits that break history fail the build, by design.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";
import { SAINTS } from "@/lib/saints/saints";
import { THEOLOGY_TOPICS } from "@/lib/theology/topics";

import {
  CERTAINTY_LEVELS,
  EVENT_CATEGORIES,
  HISTORY_ERAS,
  HISTORY_EVENTS,
  eventParams,
  publishedEvents,
} from "../events";
import { TEST_RECORD_PREFIX } from "./fixtures";

const DATA_DIR = path.join(process.cwd(), "data", "history");

const ERA_IDS = new Set(HISTORY_ERAS.map((e) => e.id));
const CATEGORY_IDS = new Set(EVENT_CATEGORIES.map((c) => c.id));
const CERTAINTY_IDS = new Set(CERTAINTY_LEVELS.map((c) => c.id));
const PRECISIONS = new Set(["exact", "year", "approximate", "traditional", "disputed"]);

const SAINT_SLUGS = new Set(SAINTS.map((s) => s.slug));
const COUNCIL_SLUGS = new Set(COUNCILS.map((c) => c.slug));
const THEOLOGY_SLUGS = new Set(
  THEOLOGY_TOPICS.filter((t) => !t.planned).map((t) => t.slug),
);
const HERESY_SLUGS = new Set(HERESIES.map((h) => h.slug));

const EVENT_SLUGS = new Set(HISTORY_EVENTS.map((e) => e.slug));
const PUBLISHED_SLUGS = new Set(publishedEvents().map((e) => e.slug));

function bodyPath(slug: string) {
  return path.join(DATA_DIR, `${slug}.json`);
}

/** A JPEG's, PNG's or WebP's own pixels, read from its header; null for anything else. */
function pictureSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const kind = buf.toString("ascii", 12, 16);
    if (kind === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    if (kind === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (kind === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) };
    }
    return null;
  }
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  // Walk the JPEG's segments to the frame header.
  let at = 2;
  while (at + 9 < buf.length) {
    if (buf[at] !== 0xff) return null;
    const marker = buf[at + 1];
    const length = buf.readUInt16BE(at + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(at + 5), width: buf.readUInt16BE(at + 7) };
    }
    at += 2 + length;
  }
  return null;
}

describe("era model", () => {
  it("eras are chronological, contiguous, and non-overlapping", () => {
    for (let i = 1; i < HISTORY_ERAS.length; i++) {
      const prev = HISTORY_ERAS[i - 1];
      const cur = HISTORY_ERAS[i];
      expect(cur.from, `${cur.id} must start where ${prev.id} ends`).toBe(prev.to);
      expect(cur.to, `${cur.id} must run forward`).toBeGreaterThan(cur.from);
    }
    expect(HISTORY_ERAS[0].from).toBe(33);
  });
});

describe("event identity", () => {
  it("ids and slugs are unique", () => {
    const ids = HISTORY_EVENTS.map((e) => e.id);
    const slugs = HISTORY_EVENTS.map((e) => e.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("slugs are canonical kebab-case", () => {
    for (const e of HISTORY_EVENTS) {
      expect(e.slug, e.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("no real event uses the structural-test prefix", () => {
    for (const e of HISTORY_EVENTS) {
      expect(e.slug.startsWith(TEST_RECORD_PREFIX), e.slug).toBe(false);
      expect(e.id.startsWith(TEST_RECORD_PREFIX), e.id).toBe(false);
      expect(e.title.startsWith("Structural Test Record"), e.slug).toBe(false);
    }
  });
});

describe("chronology", () => {
  it("years are sane integers inside the declared era", () => {
    for (const e of HISTORY_EVENTS) {
      expect(Number.isInteger(e.yearStart), e.slug).toBe(true);
      const era = HISTORY_ERAS.find((x) => x.id === e.era);
      expect(era, `${e.slug} has unknown era ${e.era}`).toBeTruthy();
      expect(e.yearStart, `${e.slug} starts before era ${e.era}`).toBeGreaterThanOrEqual(era!.from);
      expect(e.yearStart, `${e.slug} starts after era ${e.era}`).toBeLessThanOrEqual(era!.to);
      if (e.yearEnd !== undefined) {
        expect(Number.isInteger(e.yearEnd), e.slug).toBe(true);
        expect(e.yearEnd, `${e.slug} range runs backwards`).toBeGreaterThanOrEqual(e.yearStart);
      }
    }
  });

  it("calendar dates only exist on exact-precision events and are valid", () => {
    for (const e of HISTORY_EVENTS) {
      if (!e.calendar) continue;
      expect(e.precision, `${e.slug}: calendar requires exact precision`).toBe("exact");
      expect(e.calendar.month, e.slug).toBeGreaterThanOrEqual(1);
      expect(e.calendar.month, e.slug).toBeLessThanOrEqual(12);
      expect(e.calendar.day, e.slug).toBeGreaterThanOrEqual(1);
      expect(e.calendar.day, e.slug).toBeLessThanOrEqual(31);
      expect(["julian", "gregorian", "conventional"]).toContain(e.calendar.basis);
    }
  });
});

describe("classification", () => {
  it("era, categories, certainty, precision are known values", () => {
    for (const e of HISTORY_EVENTS) {
      expect(ERA_IDS.has(e.era), `${e.slug} era`).toBe(true);
      expect(e.categories.length, `${e.slug} needs a category`).toBeGreaterThan(0);
      for (const c of e.categories) {
        expect(CATEGORY_IDS.has(c), `${e.slug} category ${c}`).toBe(true);
      }
      expect(CERTAINTY_IDS.has(e.certainty), `${e.slug} certainty`).toBe(true);
      expect(PRECISIONS.has(e.precision), `${e.slug} precision`).toBe(true);
      expect([1, 2, 3]).toContain(e.importance);
    }
  });

  it("display fields are present", () => {
    for (const e of HISTORY_EVENTS) {
      expect(e.title.trim(), e.slug).not.toBe("");
      expect(e.displayDate.trim(), e.slug).not.toBe("");
      expect(e.preview.trim(), e.slug).not.toBe("");
      expect(e.summary.trim(), e.slug).not.toBe("");
    }
  });
});

describe("relationships", () => {
  it("saint / council / theology / heresy links resolve", () => {
    for (const e of HISTORY_EVENTS) {
      for (const s of e.rel?.saints ?? []) {
        expect(SAINT_SLUGS.has(s), `${e.slug} → saint ${s}`).toBe(true);
      }
      for (const c of e.rel?.councils ?? []) {
        expect(COUNCIL_SLUGS.has(c), `${e.slug} → council ${c}`).toBe(true);
      }
      for (const t of e.rel?.theology ?? []) {
        expect(THEOLOGY_SLUGS.has(t), `${e.slug} → theology ${t}`).toBe(true);
      }
      for (const h of e.rel?.heresies ?? []) {
        expect(HERESY_SLUGS.has(h), `${e.slug} → heresy ${h}`).toBe(true);
      }
    }
  });

  it("event links resolve, published→published, and are temporally sane", () => {
    for (const e of HISTORY_EVENTS) {
      for (const p of e.rel?.precededBy ?? []) {
        expect(EVENT_SLUGS.has(p), `${e.slug} precededBy ${p}`).toBe(true);
        if (e.status === "published") {
          expect(PUBLISHED_SLUGS.has(p), `${e.slug} (published) precededBy draft ${p}`).toBe(true);
        }
        const target = HISTORY_EVENTS.find((x) => x.slug === p)!;
        expect(
          target.yearStart,
          `${e.slug} precededBy ${p} which is later`,
        ).toBeLessThanOrEqual(e.yearEnd ?? e.yearStart);
      }
      for (const r of e.rel?.resultedIn ?? []) {
        expect(EVENT_SLUGS.has(r), `${e.slug} resultedIn ${r}`).toBe(true);
        if (e.status === "published") {
          expect(PUBLISHED_SLUGS.has(r), `${e.slug} (published) resultedIn draft ${r}`).toBe(true);
        }
        const target = HISTORY_EVENTS.find((x) => x.slug === r)!;
        expect(
          target.yearEnd ?? target.yearStart,
          `${e.slug} resultedIn ${r} which is earlier`,
        ).toBeGreaterThanOrEqual(e.yearStart);
      }
    }
  });

  it("preceding/resulting graph is acyclic", () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (slug: string, trail: string[]) => {
      if (done.has(slug)) return;
      expect(visiting.has(slug), `cycle: ${[...trail, slug].join(" → ")}`).toBe(false);
      visiting.add(slug);
      const e = HISTORY_EVENTS.find((x) => x.slug === slug);
      for (const next of e?.rel?.resultedIn ?? []) visit(next, [...trail, slug]);
      visiting.delete(slug);
      done.add(slug);
    };
    for (const e of HISTORY_EVENTS) visit(e.slug, []);
  });
});

describe("editorial gate: sources & publication", () => {
  it("every published event has a parseable body with at least one real source", () => {
    for (const e of publishedEvents()) {
      const p = bodyPath(e.slug);
      expect(fs.existsSync(p), `${e.slug} missing body file data/history/${e.slug}.json`).toBe(true);
      const body = JSON.parse(fs.readFileSync(p, "utf8"));
      expect(body.slug, `${e.slug} body slug mismatch`).toBe(e.slug);
      expect(Array.isArray(body.narrative) && body.narrative.length > 0, `${e.slug} needs narrative`).toBe(true);
      expect(Array.isArray(body.sources), `${e.slug} needs sources[]`).toBe(true);
      expect(body.sources.length, `${e.slug}: published events require ≥1 source`).toBeGreaterThan(0);
      for (const s of body.sources) {
        expect(typeof s.label === "string" && s.label.trim() !== "", `${e.slug} source label`).toBe(true);
        expect(["primary", "secondary"]).toContain(s.kind);
      }
    }
  });

  it("chronology steps carry a date and a claim, and run forwards", () => {
    for (const e of publishedEvents()) {
      const body = JSON.parse(fs.readFileSync(bodyPath(e.slug), "utf8"));
      if (body.chronology === undefined) continue;
      expect(Array.isArray(body.chronology), `${e.slug} chronology must be an array`).toBe(true);
      expect(body.chronology.length, `${e.slug}: an empty chronology should be omitted`).toBeGreaterThan(0);
      // A chronology deliberately reaches outside the event's own years (the
      // run-up and the aftermath are the point), so there is no window to
      // check. What must hold is that it reads forwards: an out-of-order
      // step is an editing slip that looks perfectly fine on the page.
      let lastYear = -Infinity;
      for (const [i, step] of body.chronology.entries()) {
        expect(typeof step.date === "string" && step.date.trim() !== "", `${e.slug} chronology[${i}].date`).toBe(true);
        expect(typeof step.text === "string" && step.text.trim() !== "", `${e.slug} chronology[${i}].text`).toBe(true);
        if (step.pivotal !== undefined) {
          expect(typeof step.pivotal, `${e.slug} chronology[${i}].pivotal`).toBe("boolean");
        }
        // Year is read off the printed date line; a step phrased without one
        // ("the following spring") simply does not constrain its neighbours.
        const year = step.date.match(/\b(\d{3,4})\b/);
        if (!year) continue;
        const y = Number(year[1]);
        expect(
          y,
          `${e.slug} chronology[${i}] "${step.date}" goes backwards`,
        ).toBeGreaterThanOrEqual(lastYear);
        lastYear = y;
      }
    }
  });

  it("no orphan body files", () => {
    if (!fs.existsSync(DATA_DIR)) return;
    for (const f of fs.readdirSync(DATA_DIR)) {
      if (!f.endsWith(".json")) continue;
      const slug = f.replace(/\.json$/, "");
      expect(EVENT_SLUGS.has(slug), `data/history/${f} has no registry entry`).toBe(true);
    }
  });

  it("media, when present, is rights-complete with an allowed license, a real file and its true size", () => {
    const ALLOWED = /^(public domain|pd-art|cc0|cc by(-sa)?( \d\.\d)?)$/i;
    // Hero and gallery pictures meet the identical rights bar.
    const checkImage = (
      slug: string,
      where: string,
      img: {
        alt: string; work: string; artist: string; workDate: string;
        source: string; license: string; evidenceUrl: string;
        width: number; height: number;
      },
      filePath: string,
    ) => {
      expect(filePath.startsWith("/history/media/"), `${slug} ${where} path`).toBe(true);
      const onDisk = path.join(process.cwd(), "public", filePath.replace(/^\//, ""));
      expect(fs.existsSync(onDisk), `${slug} ${where} file missing: ${filePath}`).toBe(true);
      // Guard against HTML error pages saved as pictures, and hold the
      // registry's pixels to the file's, so a plate reserves the right box.
      const size = pictureSize(fs.readFileSync(onDisk));
      expect(size, `${slug} ${where} is not a real JPEG, PNG or WebP`).not.toBeNull();
      expect([img.width, img.height], `${slug} ${where} width and height`).toEqual([size!.width, size!.height]);
      for (const field of ["alt", "work", "artist", "workDate", "source", "license", "evidenceUrl"] as const) {
        expect(String(img[field]).trim(), `${slug} ${where}.${field}`).not.toBe("");
      }
      expect(ALLOWED.test(img.license), `${slug} ${where} license '${img.license}' not in the allowed set`).toBe(true);
      expect(img.evidenceUrl.startsWith("https://"), `${slug} ${where} evidenceUrl`).toBe(true);
    };
    for (const e of HISTORY_EVENTS) {
      if (!e.media) continue;
      expect(["wide", "whole"], `${e.slug} media.shape`).toContain(e.media.shape);
      checkImage(e.slug, "media", e.media, e.media.hero);
      if (e.media.shape === "wide") {
        expect(Math.abs(e.media.width / e.media.height - 16 / 9), `${e.slug}: a wide picture is cut 16:9`).toBeLessThan(0.02);
      }
      for (const [i, g] of (e.media.gallery ?? []).entries()) {
        checkImage(e.slug, `gallery[${i}]`, g, g.src);
      }
    }
  });

  it("drafts are never routed or listed", () => {
    const routed = new Set(eventParams().map((p) => p.slug));
    for (const e of HISTORY_EVENTS) {
      if (e.status === "draft") {
        expect(routed.has(e.slug), `draft ${e.slug} would get a route`).toBe(false);
        expect(PUBLISHED_SLUGS.has(e.slug), `draft ${e.slug} listed`).toBe(false);
      }
    }
    expect(routed.size).toBe(publishedEvents().length);
  });
});

// The 1.7 standard (the owner's note 20 of 2026-10-16: every section "barely
// written", it "needs better structure and photos"). An event marked
// depth: "full" is in the four parts every event page has, with enough of
// each to read as an account, its people, two primary sources or more (one
// of them a public-domain text to open), a picture, and the mark for a
// future clergy review (no priest reviews Purify yet: each text is made as
// canonical as possible now, and stays findable). docs/editorial-standards.md
// item 12 says what a reviewer should read first.
const WAVE_ONE = [
  "pentecost",
  "council-of-jerusalem",
  "great-persecution",
  "anthony-and-the-desert",
  "edict-of-milan",
  "first-council-of-nicaea",
  "first-council-of-constantinople",
  "council-of-ephesus",
  "council-of-chalcedon",
  "second-council-of-nicaea",
  "triumph-of-orthodoxy",
  "mission-of-cyril-and-methodius",
  "conversion-of-kievan-rus",
  "great-schism-1054",
  "sack-of-constantinople-1204",
  "hesychast-councils",
  "fall-of-constantinople",
  "philokalia-published",
  "alaska-mission",
  "bolshevik-persecution",
  // 1.8, the second wave (the owner's list: "enhancing the orthodox history
  // section and adding more content"), written in the same four parts.
  "martyrdom-of-ignatius",
  "martyrdom-of-polycarp",
  "apologies-of-justin-martyr",
  "missions-of-apostle-paul",
];

type Block = { kind: string; text?: string; items?: string[]; source?: string };
const readBody = (slug: string) => JSON.parse(fs.readFileSync(bodyPath(slug), "utf8"));
const wordsIn = (blocks?: Block[]) =>
  (blocks ?? [])
    .flatMap((b) => (b.kind === "list" ? (b.items ?? []) : [b.text ?? ""]))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

describe("events written in full (1.7)", () => {
  const FULL = HISTORY_EVENTS.filter((e) => e.depth === "full");

  it("are the first wave, every era among them", () => {
    expect(FULL.map((e) => e.slug).sort()).toEqual([...WAVE_ONE].sort());
    for (const era of HISTORY_ERAS) {
      expect(FULL.some((e) => e.era === era.id), `no event of ${era.id} written in full`).toBe(true);
    }
  });

  for (const slug of WAVE_ONE) {
    describe(slug, () => {
      const meta = HISTORY_EVENTS.find((e) => e.slug === slug)!;
      const body = readBody(slug);

      it("tells what happened and why it matters, at length", () => {
        const happened = wordsIn(body.context) + wordsIn(body.narrative);
        const matters = wordsIn(body.significance) + wordsIn(body.consequences);
        expect(happened, "What happened, in words").toBeGreaterThanOrEqual(450);
        expect(happened, "What happened, in words").toBeLessThanOrEqual(1000);
        expect(matters, "Why it matters, in words").toBeGreaterThanOrEqual(120);
        expect(matters, "Why it matters, in words").toBeLessThanOrEqual(360);
        expect(body.significance?.length ?? 0, "significance").toBeGreaterThan(0);
      });

      it("names its people, linking only saints the app has", () => {
        expect(Array.isArray(body.people) && body.people.length >= 3, "three people or more").toBe(true);
        expect(body.people.length).toBeLessThanOrEqual(8);
        for (const p of body.people) {
          expect(String(p.name ?? "").trim(), "a person's name").not.toBe("");
          expect(String(p.role ?? "").trim(), `${p.name}'s line`).not.toBe("");
          if (p.saint !== undefined) expect(SAINT_SLUGS.has(p.saint), `${p.name} -> saint ${p.saint}`).toBe(true);
        }
      });

      it("rests on two primary sources or more, one of them a public-domain text to open", () => {
        const primary = body.sources.filter((s: { kind: string }) => s.kind === "primary");
        expect(primary.length).toBeGreaterThanOrEqual(2);
        expect(primary.some((s: { url?: string }) => typeof s.url === "string" && s.url.startsWith("https://"))).toBe(true);
        for (const s of body.sources) {
          if (s.url !== undefined) expect(s.url.startsWith("https://"), s.label).toBe(true);
        }
      });

      it("has its picture and is marked for a future clergy review", () => {
        expect(meta.media, "a picture").toBeTruthy();
        expect(body.review?.status).toBe("awaiting-clergy-review");
        expect(body.review?.drafted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(String(body.review?.basis ?? "").trim()).not.toBe("");
      });
    });
  }
});

describe("every account's words", () => {
  const BIBLE = path.join(process.cwd(), "data", "bible");
  /** The app's own words for a reference such as "Acts 2:1-4", or null. */
  const verses = (book: string, chapter: number, from: number, to: number): string | null => {
    const file = path.join(BIBLE, book.toLowerCase().replace(/\s+/g, "-"), `${chapter}.json`);
    if (!fs.existsSync(file)) return null;
    const ch = JSON.parse(fs.readFileSync(file, "utf8")) as { verses: { n: number; text: string }[] };
    return ch.verses.filter((v) => v.n >= from && v.n <= to).map((v) => v.text).join(" ");
  };
  const fold = (s: string) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ").trim();

  it("carry no em dash", () => {
    for (const e of publishedEvents()) {
      const raw = fs.readFileSync(bodyPath(e.slug), "utf8");
      expect(raw.includes(String.fromCharCode(0x2014)), `${e.slug} has an em dash`).toBe(false);
    }
  });

  it("quote Scripture in the app's own words, verse for verse", () => {
    for (const e of publishedEvents()) {
      const body = readBody(e.slug);
      const blocks: Block[] = [
        ...(body.context ?? []),
        ...(body.narrative ?? []),
        ...(body.significance ?? []),
        ...(body.consequences ?? []),
      ];
      for (const b of blocks) {
        if (b.kind !== "blockquote" || !b.source) continue;
        const ref = /^((?:[1-3] )?[A-Z][A-Za-z ]+?) (\d+):(\d+)(?:-(\d+))? \(/.exec(b.source);
        if (!ref) continue;
        const text = verses(ref[1], Number(ref[2]), Number(ref[3]), Number(ref[4] ?? ref[3]));
        if (text === null) continue;
        // A quotation may leave words out with an ellipsis; each part is the Bible's.
        for (const part of fold(b.text ?? "").split(/\s*\.\.\.\s*|\s*\u2026\s*/).filter((p) => p.length > 3)) {
          expect(fold(text).includes(part.replace(/^"|"$/g, "")), `${e.slug}: "${part.slice(0, 60)}" is not ${b.source}`).toBe(true);
        }
      }
    }
  });
});
