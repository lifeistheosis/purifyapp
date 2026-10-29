import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The pages under Prayers (1.7), held to the owner's words of 2026-10-16.
 *
 *  - Note 16: the pages under Prayers were desktop pages shrunk. Each is a
 *    phone page now, with its own bar that takes the page's name once its
 *    heading has scrolled away.
 *  - The prayer reader reads like the player's live lyrics: line by line in
 *    the reader's font, the line being read bright and the rest a step back,
 *    driven by the scroll and only behind the motion switch; the sign of the
 *    Cross drawn with the app's own cross beside the lines its rubric names.
 *  - No retention loops inside prayers: no step path, no "continue from", no
 *    counter at the end, no bar, no count, no fraction. Each prayer keeps its
 *    Mark prayed, as before.
 *  - Pray with on every prayer page: chant for everyone, ambience with Plus,
 *    shown with the Plus mark and never hidden.
 *  - The house rules: no character as an icon, no side stripe, no short gold
 *    rule, no tinted box, no gold ink, no all-caps label, no gradient words,
 *    no retired display face.
 *
 * This reads the source; scripts/export-walk.mjs walks the built pages.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note about the old page is not read as the page. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\{\s*\}/g, "");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(e.name)) out.push(rel);
  }
  return out;
}

const READER = "components/prayers/PrayerRuleReader.tsx";
const SERVICE = walk("components/prayers/service");
const PAGES = walk("app/(app)/prayers").filter((f) => f.endsWith("/page.tsx") && f !== "app/(app)/prayers/page.tsx");
const DRAWN = [
  READER,
  ...SERVICE,
  ...PAGES,
  ...walk("components/prayers/mine"),
  "components/prayers/ArtPlate.tsx",
  "components/prayers/DayTimeline.tsx",
  "components/prayers/LessonList.tsx",
  "components/prayers/LessonEnd.tsx",
  "components/prayers/Diptychs.tsx",
  "components/prayers/TodayDiptychs.tsx",
  "components/prayers/TodayHourRule.tsx",
  "components/player/PrayWith.tsx",
];

describe("the pages under Prayers", () => {
  it("are all drawn here", () => {
    // A positive control: an empty scan would pass everything below.
    expect(PAGES.length).toBeGreaterThanOrEqual(11);
    expect(SERVICE.length).toBeGreaterThanOrEqual(3);
  });

  it("each mount their own bar, which takes the page's name from a heading that is there", () => {
    for (const page of PAGES) {
      const src = code(page);
      const bar = /<MobileTopBar\b[^>]*revealTitleOn="([^"]+)"/.exec(src);
      expect(bar, `${page} has its own bar`).not.toBeNull();
      const id = bar![1];
      // The heading is the page's own, or a component's it renders, two
      // imports deep at most (today's prayers: page, body, masthead).
      const seen = new Set<string>([page]);
      let layer = [page];
      for (let depth = 0; depth < 2; depth++) {
        layer = layer
          .flatMap((f) => [...code(f).matchAll(/from "@\/(components\/[^"]+)"/g)].map((m) => `${m[1]}.tsx`))
          .filter((f) => !seen.has(f) && fs.existsSync(path.join(ROOT, f)));
        for (const f of layer) seen.add(f);
      }
      const where = [...seen, ...SERVICE].map(code).join("\n");
      expect(where.includes(`id="${id}"`) || where.includes(`titleId = "${id}"`), `${page}: a heading with the id ${id}`).toBe(true);
    }
  });

  it("draw no character as an icon and no em dash", () => {
    // By their numbers: a character set as an icon has no place in source either.
    const CHARS = [0x2605, 0x2606, 0x2713, 0x25cb, 0x2192, 0x2190, 0x2726, 0x25be, 0x2014].map((c) => String.fromCharCode(c));
    const found: string[] = [];
    for (const file of DRAWN) {
      const src = code(file);
      for (const c of CHARS) if (src.includes(c)) found.push(`${file}: ${c}`);
    }
    expect(found).toEqual([]);
  });

  it("keep to the house's quiet forms", () => {
    const BANNED: [RegExp, string][] = [
      [/\bborder-[ls]\b|\bborder-[ls]-(?!transparent)/, "a side stripe"],
      [/\bh-px w-10\b/, "the short gold rule"],
      [/\bbg-gold\/\[/, "a gold-tinted box"],
      [/\btext-gold\b/, "gold ink"],
      [/\bfont-display-serif\b/, "the retired display face"],
      [/\buppercase\b|\btracking-widest\b|\btracking-\[0\.[1-9]/, "an all-caps, letter-spaced label"],
      [/\bbg-clip-text\b/, "gradient words"],
    ];
    const found: string[] = [];
    for (const file of DRAWN) {
      const src = code(file);
      for (const [re, what] of BANNED) if (re.test(src)) found.push(`${file}: ${what}`);
    }
    expect(found).toEqual([]);
  });
});

describe("a prayer page", () => {
  const reader = code(READER);
  const step = code("components/prayers/service/PrayerStep.tsx");
  const header = code("components/prayers/service/ServiceHeader.tsx");

  it("keeps no score: no count, no fraction, no bar, no place kept, no 'continue'", () => {
    // The doctrine is written where the reader is, for the next hand.
    expect(read(READER)).toContain("NO COUNT, NO FRACTION, NO BAR, AND NO PLACE KEPT.");
    for (const src of [reader, step, header, code("components/prayers/service/useLitLine.ts")]) {
      expect(src).not.toMatch(/ProgressBar|<progress|role="progressbar"|aria-valuenow/);
      expect(src).not.toMatch(/common\.continue|continueFrom|\{done\}|\{total\}/);
      expect(src).not.toMatch(/\.at\.\$\{|purify\.prayers\.[^"`]*\.at\b/);
    }
  });

  it("still marks each prayer, and keeps the day when every one is marked", () => {
    expect(step).toContain('t("prayers.reader.markPrayed")');
    expect(reader).toContain("writeTodayDone(rule.id");
    expect(reader).toContain("markRuleCompletedToday(rule.id)");
    expect(reader).toContain("softTick()");
    // Begin always begins: it goes to the first prayer.
    expect(reader).toMatch(/const first = rule\.prayers\[0\]/);
  });

  it("sets each prayer's words line by line, one block to copy whole, in the reader's font", () => {
    expect(step).toContain("stanzasOf(");
    expect(step).toMatch(/data-copy\s+data-prayer-words/);
    expect(step).toContain("whitespace-pre-line");
    expect(step).toMatch(/<span key=\{l\} data-line/);
    expect(step).toContain("useReaderPrefs()");
    // Lines are spans: a paragraph inside would be copied alone.
    const words = step.slice(step.indexOf("data-prayer-words"), step.indexOf("{refrain ?"));
    expect(words).not.toMatch(/<p\b/);
  });

  it("draws the sign of the Cross with the app's own cross, and names it for a screen reader", () => {
    expect(step).toContain('import { Cross } from "@/components/ui/icons/Cross"');
    expect(step).toMatch(/line\.cross \? \(\s*<Cross/);
    expect(step).toContain('t("prayers.reader.signOfTheCross")');
  });

  it("lights the line being read only with motion on, and lets the scroll drive it", () => {
    const lit = code("components/prayers/service/useLitLine.ts");
    expect(lit).toContain("useReducedMotion()");
    expect(lit).toMatch(/if \(!root \|\| reduced\) return;/);
    expect(lit).toContain('addEventListener("scroll", schedule, { passive: true })');
    const css = read("app/globals.css");
    expect(css).toContain(':where([data-motion="full"]) [data-prayer-reader][data-following] [data-line] {');
    expect(css).toContain(':where([data-motion="full"]) [data-prayer-reader][data-following] [data-line][data-lit] {');
    expect(reader).toContain("data-prayer-reader");
  });

  it("offers Pray with: chant for everyone, ambience with Plus, never hidden", () => {
    expect(header).toContain("<PrayWith");
    const prayWith = code("components/player/PrayWith.tsx");
    expect(prayWith).toContain("<ChantPicker");
    expect(prayWith).toContain("openAmbience()");
    expect(prayWith).toContain('upgrade.open("ambience")');
    expect(prayWith).toContain("<PlusLock");
    // Shown to every reader: nothing about Plus decides whether it is drawn.
    expect(prayWith).not.toMatch(/locked \? null|!locked &&|plus \? </);
  });

  // The owner's note 6 of build 80: on opening Pray my rule the Ambience half
  // and its lock moved. The lock came with the Plus answer, after the first
  // frame, and widened the centred row. Its place is kept from the first
  // frame, from the answer expected (lib/entitlements/usePlusFeatures.ts),
  // and the lock itself is drawn only on the live answer, so a subscriber
  // still never meets one while it loads.
  it("keeps the Plus lock's place from the first frame, and draws the lock only on the answer", () => {
    const prayWith = code("components/player/PrayWith.tsx");
    expect(prayWith).toContain("const expectedPlus = useExpectedPlusFeatures();");
    expect(prayWith).toContain("const locked = plus === false;");
    expect(prayWith).toContain("const lockPlace = locked || (plus === null && expectedPlus !== true);");
    expect(prayWith).toMatch(/\{lockPlace \? \(\s*<PlusLock/);
    expect(prayWith).toContain('locked ? "opacity-70" : "opacity-0"');
    // Only the live answer names the lock and opens the upgrade sheet.
    expect(prayWith).toContain('aria-label={locked ? t("prayers.prayWith.ambienceLocked") : undefined}');
    expect(prayWith).toContain('if (locked) upgrade.open("ambience");');
    // Each answer is kept where the live one is asked; the expected one is
    // read once on the client, and is null where the markup is drawn.
    const hook = code("lib/entitlements/usePlusFeatures.ts");
    expect(hook).toMatch(/rememberPlusFeatures\(e\.plusFeatures\);\s*return e\.plusFeatures;/);
    expect(hook).toContain("useSyncExternalStore(noSubscribe, expectedPlusFeatures, () => null)");
  });
});
