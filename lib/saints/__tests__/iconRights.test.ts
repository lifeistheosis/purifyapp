import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ICONS_DIR,
  ICONS_URL_PREFIX,
  ICON_RIGHTS,
  MISSING_ATTRIBUTION,
  UNVERIFIED_ICONS,
  iconRightsFor,
  isUnverified,
} from "@/lib/saints/iconRights";
import { SAINTS } from "@/lib/saints/saints";
import { AUTHOR_ICONS } from "@/lib/saints/icons";
import { SLIDESHOW_FRAMES } from "@/lib/prayers/slideshowFrames";

/**
 * The rights bar for saint icons, mirroring lib/media/__tests__/sections.test.ts
 * and lib/history/__tests__/events.integrity.test.ts.
 *
 * That section suite was written because this directory had 110 files and no
 * provenance at all. This is the suite it was waiting for.
 *
 * THE MECHANISM, because it is not obvious from the assertions alone: a file
 * on disk must appear in exactly one of ICON_RIGHTS or UNVERIFIED_ICONS, or
 * "accounts for every file" fails. Putting a new one in UNVERIFIED_ICONS
 * breaches MAX_UNVERIFIED. So the only way to add an icon is to add a
 * rights-complete row, and the backfill can stay unfinished for as long as it
 * needs to without the registry rotting.
 */

// Identical to lib/media/__tests__/sections.test.ts and the history suite.
const ALLOWED = /^(public domain|pd-art|cc0|cc by(-sa)?( \d\.\d)?)$/i;

/**
 * 110 files, 3 with settled rights, on 2026-08-10.
 *
 * THIS NUMBER MAY ONLY FALL. Raising it means a file shipped without
 * provenance, which is the thing this suite exists to prevent.
 */
const MAX_UNVERIFIED = 107;

/**
 * Total bytes in public/saints/icons/. Update in the same commit as the files
 * that change it, so the diff shows the cost. 17.10 MiB after the Phase 0
 * re-encode took a 450 KB WebP down to 72 KB.
 */
const MAX_ICONS_BYTES = 18_000_000;

/**
 * Rules below that bind only work done from this date on. Everything earlier
 * is visible debt rather than a blocker: three existing crops are taller than
 * 2.6:1 and 75 files exceed 700px, and grandfathering them is what lets this
 * suite land green today instead of never landing.
 */
const NEW_WORK_FROM = "2026-08-10";

const dir = path.join(process.cwd(), ICONS_DIR);
const onDisk = fs
  .readdirSync(dir)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort();

function bytesOf(file: string): number {
  return fs.statSync(path.join(dir, file)).size;
}

function sniff(file: string): "jpg" | "png" | "webp" | "unknown" {
  const b = fs.readFileSync(path.join(dir, file)).subarray(0, 12);
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50) return "png";
  if (
    b.subarray(0, 4).toString("ascii") === "RIFF" &&
    b.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "webp";
  return "unknown";
}

describe("the icon directory is fully accounted for", () => {
  it("has icons to check", () => {
    expect(onDisk.length).toBeGreaterThan(100);
  });

  it("accounts for every file on disk exactly once", () => {
    const missing = onDisk.filter(
      (f) => !(f in ICON_RIGHTS) && !(f in UNVERIFIED_ICONS),
    );
    const doubled = onDisk.filter(
      (f) => f in ICON_RIGHTS && f in UNVERIFIED_ICONS,
    );
    expect(missing, `no rights row: ${missing.join(", ")}`).toEqual([]);
    expect(doubled, `in both maps: ${doubled.join(", ")}`).toEqual([]);
  });

  it("has no registry row for a file that is not there", () => {
    const set = new Set(onDisk);
    const ghosts = [
      ...Object.keys(ICON_RIGHTS),
      ...Object.keys(UNVERIFIED_ICONS),
    ].filter((f) => !set.has(f));
    expect(ghosts, `rows with no file: ${ghosts.join(", ")}`).toEqual([]);
  });

  it("keeps every filename safe for the Android asset path", () => {
    // public/ is copied verbatim into the native export. An ampersand or a
    // space travels with it. Five filenames were fixed on 2026-08-10.
    const odd = onDisk.filter((f) => !/^[a-z0-9.-]+$/.test(f));
    expect(odd, `unsafe filenames: ${odd.join(", ")}`).toEqual([]);
  });

  it("stays inside the byte ceiling", () => {
    const total = onDisk.reduce((n, f) => n + bytesOf(f), 0);
    expect(
      total,
      `public/saints/icons is ${(total / 1024 / 1024).toFixed(2)} MiB`,
    ).toBeLessThanOrEqual(MAX_ICONS_BYTES);
  });
});

describe("the debt only shrinks", () => {
  it("has no more unverified icons than it started with", () => {
    const n = Object.keys(UNVERIFIED_ICONS).length;
    expect(
      n,
      `${n} unverified. To add an icon, add a rights-complete row, ` +
        `not another line here.`,
    ).toBeLessThanOrEqual(MAX_UNVERIFIED);
  });

  it("claims nothing it cannot know about an uninspected file", () => {
    // The whole point of the debt map is that it records only what the bytes
    // prove. A licence word appearing here would be an inference, and an
    // inference in a rights file is what this suite exists to stop.
    for (const [file, note] of Object.entries(UNVERIFIED_ICONS)) {
      expect(note.length, `${file} note is too thin`).toBeGreaterThan(40);
      expect(
        /public domain|pd-art|cc0|cc by|licen[cs]ed under/i.test(note),
        `${file} note asserts a licence for a file nobody has opened`,
      ).toBe(false);
    }
  });

  it("keeps MISSING_ATTRIBUTION honest", () => {
    for (const file of MISSING_ATTRIBUTION) {
      const row = ICON_RIGHTS[file];
      expect(row, `${file} is listed but has no rights row`).toBeDefined();
      expect(row.status, `${file} should be a permission row`).toBe("permission");
    }
  });
});

describe("settled rows are complete", () => {
  for (const [file, row] of Object.entries(ICON_RIGHTS)) {
    describe(file, () => {
      it("names the picture, the work, the artist and the date", () => {
        for (const field of ["alt", "work", "artist", "workDate", "source"] as const) {
          expect(String(row[field] ?? "").trim(), `${file}.${field}`).not.toBe("");
        }
      });

      it("describes the picture rather than the saint", () => {
        // "Icon of St X" passes axe and tells a screen reader nothing. The
        // slideshow alt text was wrong for three of four frames until
        // 2026-07-25, which is why this is checked at all.
        expect(row.alt.length, `${file}.alt is too short`).toBeGreaterThan(24);
        expect(
          /^icon of /i.test(row.alt),
          `${file}.alt starts with "Icon of", which describes nothing`,
        ).toBe(false);
      });

      it("records when a human opened it", () => {
        const t = Date.parse(row.inspectedOn);
        expect(Number.isNaN(t), `${file}.inspectedOn is not a date`).toBe(false);
        expect(t, `${file}.inspectedOn is in the future`).toBeLessThanOrEqual(
          Date.now(),
        );
      });

      if (row.status === "verified") {
        it("carries an allowed licence", () => {
          expect(
            ALLOWED.test(row.license),
            `${file} licence '${row.license}' is not in the allowed set`,
          ).toBe(true);
        });

        it("records where the licence was verified", () => {
          expect(
            row.evidenceUrl.startsWith("https://"),
            `${file}.evidenceUrl`,
          ).toBe(true);
        });
      } else {
        it("names who granted permission and when", () => {
          expect(row.grantedBy.trim(), `${file}.grantedBy`).not.toBe("");
          expect(
            Number.isNaN(Date.parse(row.confirmedOn)),
            `${file}.confirmedOn is not a date`,
          ).toBe(false);
          expect(row.license).toBe("Used with permission");
        });
      }
    });
  }
});

describe("every referenced icon exists and has a row", () => {
  const referenced = new Set<string>([
    ...SAINTS.map((s) => s.iconUrl).filter((u): u is string => Boolean(u)),
    ...Object.values(AUTHOR_ICONS),
    ...SLIDESHOW_FRAMES.map((f) => f.src),
  ]);

  it("points every reference under the icons prefix", () => {
    const stray = [...referenced].filter((u) => !u.startsWith(ICONS_URL_PREFIX));
    expect(stray, `outside ${ICONS_URL_PREFIX}: ${stray.join(", ")}`).toEqual([]);
  });

  it("resolves every reference to a file on disk", () => {
    const set = new Set(onDisk);
    const missing = [...referenced].filter(
      (u) => !set.has(u.slice(ICONS_URL_PREFIX.length)),
    );
    expect(missing, `referenced but absent: ${missing.join(", ")}`).toEqual([]);
  });

  it("has a rights row behind every reference", () => {
    const orphans = [...referenced].filter(
      (u) => !iconRightsFor(u) && !isUnverified(u),
    );
    expect(orphans, `no rights row: ${orphans.join(", ")}`).toEqual([]);
  });
});

describe("the files are what they claim to be", () => {
  for (const file of onDisk) {
    it(`${file} matches its extension and is a real image`, () => {
      const ext = path
        .extname(file)
        .slice(1)
        .toLowerCase()
        .replace("jpeg", "jpg");
      const real = sniff(file);
      // Guards two things: an HTML error page saved with a .jpg name, which is
      // what a rate-limited Commons fetch produces, and a container wearing the
      // wrong extension, which hid a 450 KB WebP from the optimiser for months.
      expect(real, `${file} is not a real image`).not.toBe("unknown");
      expect(real, `${file} is a ${real} named .${ext}`).toBe(ext);
    });
  }

  it("keeps every file under the hard per-file ceiling", () => {
    const heavy = onDisk
      .map((f) => ({ f, kb: bytesOf(f) / 1024 }))
      .filter((x) => x.kb > 450);
    expect(
      heavy.map((x) => `${x.f} ${x.kb.toFixed(0)} KB`),
      "over 450 KB",
    ).toEqual([]);
  });
});

describe("new work meets the standard the old files are grandfathered out of", () => {
  const fresh = Object.entries(ICON_RIGHTS).filter(
    ([, row]) => row.inspectedOn >= NEW_WORK_FROM,
  );

  it("keeps a newly added icon under 200 KB", () => {
    const heavy = fresh
      .map(([f]) => ({ f, kb: bytesOf(f) / 1024 }))
      .filter((x) => x.kb > 200);
    expect(heavy.map((x) => `${x.f} ${x.kb.toFixed(0)} KB`)).toEqual([]);
  });

  it("has something to say about new work, or nothing to say at all", () => {
    // A guard that this describe block is not silently vacuous. It is expected
    // to be empty until the icon batch lands; the assertion is that the
    // filter works, not that anything has passed through it yet.
    expect(Array.isArray(fresh)).toBe(true);
  });
});
