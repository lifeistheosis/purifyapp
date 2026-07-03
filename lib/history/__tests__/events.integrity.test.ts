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

  it("no orphan body files", () => {
    if (!fs.existsSync(DATA_DIR)) return;
    for (const f of fs.readdirSync(DATA_DIR)) {
      if (!f.endsWith(".json")) continue;
      const slug = f.replace(/\.json$/, "");
      expect(EVENT_SLUGS.has(slug), `data/history/${f} has no registry entry`).toBe(true);
    }
  });

  it("media, when present, is rights-complete with an allowed license and a bundled file", () => {
    const ALLOWED = /^(public domain|pd-art|cc0|cc by(-sa)?( \d\.\d)?)$/i;
    for (const e of HISTORY_EVENTS) {
      if (!e.media) continue;
      const m = e.media;
      expect(m.hero.startsWith("/history/media/"), `${e.slug} hero path`).toBe(true);
      const onDisk = path.join(process.cwd(), "public", m.hero.replace(/^\//, ""));
      expect(fs.existsSync(onDisk), `${e.slug} media file missing: ${m.hero}`).toBe(true);
      // Guard against HTML error pages saved as images.
      const head = fs.readFileSync(onDisk).subarray(0, 8);
      const isJpeg = head[0] === 0xff && head[1] === 0xd8;
      const isPng = head[0] === 0x89 && head[1] === 0x50;
      expect(isJpeg || isPng, `${e.slug} media is not a real image`).toBe(true);
      for (const field of ["alt", "work", "artist", "workDate", "source", "license", "evidenceUrl"] as const) {
        expect(String(m[field]).trim(), `${e.slug} media.${field}`).not.toBe("");
      }
      expect(ALLOWED.test(m.license), `${e.slug} license '${m.license}' not in the allowed set`).toBe(true);
      expect(m.evidenceUrl.startsWith("https://"), `${e.slug} evidenceUrl`).toBe(true);
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
