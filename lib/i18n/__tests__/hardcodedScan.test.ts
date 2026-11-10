// The hardcoded-string scan (npm run i18n:check, scripts/i18n/scan.mjs), held
// both ways (the arbiter, 2026-11-10). On the branch it failed on six
// "hardcoded strings" that were code read as words, so it had stopped
// meaning anything: nobody could tell a real one from the noise. It now
// reads the source around each match, and these hold it to its job: it passes
// the code it once flagged, and still catches words a reader would see.
//
// What would go wrong if this broke: a check that fails on code (and is
// ignored), or one that passes a screen with English nailed into it.
//
// And it runs here, over the folders already in the catalog (the arbiter's
// yes of 2026-11-10): npm run i18n:check sat outside the unit tests, which is
// how six false findings piled up unseen. Words a reader sees belong in the
// catalogs, so a chat that types English into one of these screens is stopped
// here, with the file, the words and what to do.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CONVERTED_DIRS, scanDirs, scanSource } from "@/scripts/i18n/scan.mjs";

const ROOT = path.resolve(__dirname, "..", "..", "..");

const texts = (source: string) => scanSource(source).map((h: { text: string }) => h.text);

describe("the hardcoded-string scan", () => {
  it("passes the six pieces of code it read as words on the branch", () => {
    const code = [
      // components/today/PrayNowCard.tsx: a ternary between two tags.
      `{tile.subKey ? <span>{t(tile.subKey)}</span> : tile.minutes != null ? <span>{t("today.minRead")}</span> : null}`,
      // components/today/SaintWindow.tsx: a type.
      `type WindowSaint = Pick<SaintBrief, "slug" | "name" | "epithet"> & Partial<Pick<SaintBrief, "feastDays" | "iconUrl">>;`,
      // components/saints/MobileWorkPill.tsx: an arrow, then a comparison.
      `const io = new IntersectionObserver(([e]) => setShow(e.boundingClientRect.bottom < 0), { threshold: 0 });`,
      // app/(app)/councils/[slug]/page.tsx: an arrow, then a comparison.
      `const sideBySide = facts.length === 2 && facts.every((f) => f.value.length <= SHORT_FACT);`,
      // components/onboarding/ClergySteps.tsx: a function's type.
      `function ParishFields({ typed, onPick, nameRef }: { typed: WrittenParish; onPick: (parish: ParishAnswer) => void; nameRef?: Ref<HTMLInputElement> }) {`,
      // components/reading/FeaturedWork.tsx: an arrow, then a generic.
      "const part = (name: string) => el.querySelector<HTMLElement>(`[data-stage-part=\"${name}\"]`);",
    ];
    for (const line of code) expect(texts(line), line).toEqual([]);
  });

  it("passes the other code it read as words across the site", () => {
    const code = [
      // components/admin/ActivityFeed.tsx
      `records.some((r) => t - r.receivedAt < dwellMs(r.kind) + EXIT_MS);`,
      // components/admin/map/HeatMap.tsx
      `const near = points.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) <= reach);`,
      // components/search/CommandPalette.tsx
      `const offDoors = useMemo<ReadonlySet<DoorId>>(() => (online ? new Set() : new Set<DoorId>(["shop"])), [online]);`,
      // components/whats-new/tour/TourLayer.tsx
      `const [crossSrc] = useState(() => document.querySelector<HTMLImageElement>(".launch-cross")?.src || CROSS_FILE);`,
      // components/owner/ProjectionChart.tsx
      `const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * plotW);`,
    ];
    for (const line of code) expect(texts(line), line).toEqual([]);
  });

  it("still catches words a reader would see", () => {
    expect(texts(`<p>Save your place in the reading</p>`)).toEqual(["Save your place in the reading"]);
    expect(texts(`<button\n  onClick={go}\n>\n  Begin the reading\n</button>`)).toEqual(["Begin the reading"]);
    expect(texts(`<button aria-label="Close the sheet" />`)).toEqual(["Close the sheet"]);
    expect(texts(`<p><b>{t("x")}</b>: read this before you begin</p>`)).toEqual([": read this before you begin"]);
    expect(texts(`<a href={u}>Read more (opens a new tab)</a>`)).toEqual(["Read more (opens a new tab)"]);
    expect(texts(`<>Nothing here yet</>`)).toEqual(["Nothing here yet"]);
  });

  it("gives each find its line", () => {
    expect(scanSource(`const a = 1;\n\n<p>Words on the third line</p>`)).toEqual([{ line: 3, text: "Words on the third line" }]);
  });

  it("lets through what the allowlist names", () => {
    expect(scanSource(`<p>Open Purify on your phone</p>`, ["Purify"])).toEqual([]);
  });
});

describe("the screens already in the catalog", () => {
  it("are all still where the list says", () => {
    // A folder renamed away from the list would be skipped without a word.
    expect(CONVERTED_DIRS.length).toBeGreaterThan(40);
    const missing = CONVERTED_DIRS.filter((dir: string) => !fs.existsSync(path.join(ROOT, dir)));
    expect(missing, "scripts/i18n/scan.mjs lists a folder that is gone: give it its new name").toEqual([]);
  });

  it("have no English typed into them", () => {
    const found = scanDirs(ROOT, CONVERTED_DIRS) as Array<{ file: string; hits: Array<{ line: number; text: string }> }>;
    const lines = found.flatMap(({ file, hits }) => hits.map((h) => `  ${file}, line ${h.line}: "${h.text}"`));
    const message = [
      "Words a reader sees, typed into a screen whose words live in the catalog:",
      ...lines,
      'Put them in the catalog: a key in lib/i18n/messages/en.json, shown with t("key") or <T k="key" />. A language without the line shows the English until it is translated.',
      "If a find is code and not words, teach scripts/i18n/scan.mjs to tell (and add the line to this file). A brand name or a citation goes in scripts/i18n/scan-allowlist.json.",
    ].join("\n");
    expect(lines, message).toEqual([]);
  });
});
