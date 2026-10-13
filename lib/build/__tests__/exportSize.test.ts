import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  EXPORT_LIMITS,
  judgeSize,
  measureExport,
  sizeLines,
  type ExportSize,
  type SizeLimits,
} from "@/lib/build/exportSize";

const MB = 1024 ** 2;
const GB = 1024 ** 3;

/** A small stand-in for out/: a front door, two page folders and _next. */
let dir = "";
const LINE = "In the beginning was the Word, and the Word was with God. ";

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "purify-export-size-"));
  const put = (rel: string, text: string) => {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  put("index.html", "<!doctype html><title>Purify</title>");
  put("bible/john/1/index.txt", LINE.repeat(400));
  put("bible/john/2/index.txt", LINE.repeat(200));
  put("prayers/index.txt", LINE.repeat(10));
  put("_next/static/chunks/app.js", "export const a = 1;\n".repeat(300));
  put("_next/static/chunks/el.js", "export const el = {};\n".repeat(100));
});

afterAll(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

describe("weighing an export", () => {
  it("counts every file, _next included, and keeps _next's share apart", () => {
    const size = measureExport(dir);
    expect(size.total.files).toBe(6);
    expect(size.next.files).toBe(2);
    const onDisk = (rel: string) => fs.statSync(path.join(dir, rel)).size;
    expect(size.next.bytes).toBe(onDisk("_next/static/chunks/app.js") + onDisk("_next/static/chunks/el.js"));
    expect(size.total.bytes).toBe(
      onDisk("index.html") +
        onDisk("bible/john/1/index.txt") +
        onDisk("bible/john/2/index.txt") +
        onDisk("prayers/index.txt") +
        size.next.bytes,
    );
  });

  it("lists the top folders heaviest first, with loose files as their own row", () => {
    const { folders, total } = measureExport(dir);
    expect(folders.map((f) => f.name)).toEqual(["bible", "_next", "prayers", "(files)"]);
    expect(folders.reduce((n, f) => n + f.bytes, 0)).toBe(total.bytes);
    expect(folders.reduce((n, f) => n + f.files, 0)).toBe(total.files);
  });

  it("gives the packed weight too, and it is the smaller one for text", () => {
    const size = measureExport(dir);
    expect(size.total.packed).toBeGreaterThan(0);
    expect(size.total.packed).toBeLessThan(size.total.bytes / 5);
    expect(size.next.packed).toBeGreaterThan(0);
    expect(size.next.packed).toBeLessThan(size.next.bytes);
  });

  it("can skip the packing, and then says 0 instead of guessing", () => {
    const size = measureExport(dir, { pack: false });
    expect(size.total.packed).toBe(0);
    expect(size.total.bytes).toBe(measureExport(dir).total.bytes);
  });

  it("weighs a folder that is not there as nothing", () => {
    expect(measureExport(path.join(dir, "no-such-export")).total).toEqual({ files: 0, bytes: 0, packed: 0 });
  });
});

/** A measure with the numbers that matter set by hand. */
function measure(diskMb: number, packedMb: number, nextMb = 15): ExportSize {
  return {
    total: { files: 10_000, bytes: diskMb * MB, packed: packedMb * MB },
    next: { files: 250, bytes: nextMb * MB, packed: (nextMb * MB) / 3 },
    folders: [],
  };
}

describe("holding a weight to the limits", () => {
  const open: SizeLimits = { warnWithoutNextBytes: 0.6 * GB, stopDiskBytes: null, stopPackedBytes: null };

  it("stops nothing while no ceiling is set, however heavy", () => {
    expect(judgeSize(measure(5_000, 2_000), open).stop).toEqual([]);
  });

  it("warns over the old budget, which is counted without _next", () => {
    // 620 MB in all with 15 MB of _next is 605 MB without it: under 0.6 GB (614.4 MB).
    expect(judgeSize(measure(620, 150), open).warn).toEqual([]);
    expect(judgeSize(measure(640, 150), open).warn).toHaveLength(1);
    // The same 640 MB with 40 MB of it in _next is back under.
    expect(judgeSize(measure(640, 150, 40), open).warn).toEqual([]);
  });

  it("stops over a disk ceiling, counting everything", () => {
    const limits = { ...open, stopDiskBytes: 400 * MB };
    expect(judgeSize(measure(400, 100), limits).stop).toEqual([]);
    const over = judgeSize(measure(401, 100), limits).stop;
    expect(over).toHaveLength(1);
    expect(over[0]).toContain("on disk");
    expect(over[0]).toContain("400.0 MB");
  });

  it("stops over a packed ceiling", () => {
    const limits = { ...open, stopPackedBytes: 110 * MB };
    expect(judgeSize(measure(350, 110), limits).stop).toEqual([]);
    const over = judgeSize(measure(350, 111), limits).stop;
    expect(over).toHaveLength(1);
    expect(over[0]).toContain("packed");
  });

  it("names both when both are passed", () => {
    const limits = { ...open, stopDiskBytes: 300 * MB, stopPackedBytes: 90 * MB };
    expect(judgeSize(measure(350, 100), limits).stop).toHaveLength(2);
  });
});

describe("what the build prints", () => {
  it("gives both numbers for the whole export and for _next", () => {
    const lines = sizeLines(measure(348.6, 100));
    expect(lines[0]).toContain("348.6 MB on disk");
    expect(lines[0]).toContain("10,000 files");
    expect(lines[0]).toContain("100.0 MB packed");
    expect(lines[1]).toContain("_next");
    expect(lines[1]).toContain("15.0 MB on disk");
  });

  it("says plainly when no ceiling is set, and names them when one is", () => {
    const none = { warnWithoutNextBytes: 0.6 * GB, stopDiskBytes: null, stopPackedBytes: null };
    expect(sizeLines(measure(348.6, 100), none).join("\n")).toContain("ceiling: none set");
    const set = sizeLines(measure(348.6, 100), { warnWithoutNextBytes: 0.6 * GB, stopDiskBytes: 400 * MB, stopPackedBytes: null });
    expect(set.join("\n")).toContain("ceiling: 400.0 MB on disk, none packed");
    // The ones in force, as a build prints them.
    expect(sizeLines(measure(222.7, 79.8)).join("\n")).toContain("ceiling: 235.0 MB on disk, 85.0 MB packed");
  });

  it("lists as many folders as it is asked for", () => {
    const size = measureExport(dir, { pack: false });
    expect(sizeLines(size)).toHaveLength(4);
    expect(sizeLines(size, EXPORT_LIMITS, 2)).toHaveLength(6);
  });

  it("carries no em dash", () => {
    const text = [...sizeLines(measure(700, 200)), ...judgeSize(measure(700, 200)).warn].join("\n");
    expect(text).not.toContain(String.fromCharCode(0x2014));
  });
});

describe("the limits in force", () => {
  it("keeps the warning where 1.5.1 put it", () => {
    expect(EXPORT_LIMITS.warnWithoutNextBytes).toBe(0.6 * GB);
  });

  // The two ceilings are the owner's. He set them on 2026-10-12: 235 MB on
  // disk and 85 MB packed. A different number here is a decision somebody
  // made, so this test has to be changed with it, on purpose.
  it("holds the owner's two ceilings", () => {
    expect(EXPORT_LIMITS.stopDiskBytes).toBe(235 * MB);
    expect(EXPORT_LIMITS.stopPackedBytes).toBe(85 * MB);
  });

  // What they were set against, measured that day with the stand-in: 255.4 MB
  // and 90.7 MB with the unused content package in the export, and that less
  // its 32.7 MB and 10.9 MB without. The ceilings pass the app as it is and
  // stop the package coming back unnoticed.
  it("lets the app through as it weighs, and not with the content package back in it", () => {
    expect(judgeSize(measure(222.7, 79.8)).stop).toEqual([]);
    expect(judgeSize(measure(255.4, 90.7)).stop).toHaveLength(2);
  });
});

describe("the build that runs it", () => {
  const build = fs.readFileSync("scripts/native-build.mjs", "utf8");
  const tool = fs.readFileSync("scripts/export-size.mjs", "utf8");

  it("weighs the export last, as a guard, after the two that can change nothing", () => {
    const leak = build.lastIndexOf("guardExportAgainstI18nLeaks(path.join(ROOT");
    const collide = build.lastIndexOf("guardExportAgainstCaseCollisions(path.join(ROOT");
    const weigh = build.indexOf("scripts/export-size.mjs out --guard");
    expect(leak).toBeGreaterThan(-1);
    expect(collide).toBeGreaterThan(leak);
    expect(weigh).toBeGreaterThan(collide);
  });

  it("has no budget of its own any more", () => {
    expect(build).not.toContain("OUT_SIZE_BUDGET_BYTES");
  });

  it("reads the limits from this module and stops only when asked to guard", () => {
    expect(tool).toContain('from "../lib/build/exportSize.ts"');
    expect(tool).toMatch(/flag\("guard"\) && verdict\.stop\.length > 0\) process\.exit\(1\)/);
  });
});
