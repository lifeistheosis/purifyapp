// Purify Plus, try each feature: the owner's pick A of r3-07 ("a live look",
// locked 2026-10-30; boards/purify-master/variants/r3-07-plus-try.png), from
// his notes 8 and 39 of build 80: every row of the Plus page ends in Try it,
// and Try it shows that feature's own screen, working, for a moment.
//
// What a reader would notice if this broke: a row with no Try it, or one
// that opens nothing; Next skipping a feature or leading nowhere; a preview
// that changes their palette, their notes, their plans or their Discord
// status, or keeps a sound playing after the minute; an example entry in
// words nobody wrote, or not marked as an example; the Candlelight tile on
// black again; the Listen offline row missing; or English in their language.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { TRY_PREVIEW_IDS } from "@/components/billing/PlusTry";
import { PLUS_ROWS, plusRowsLedBy } from "@/lib/premium/plusRows";
import {
  TRY_DISCORD_PLACE,
  TRY_EXAMPLES,
  TRY_GATHERING,
  TRY_MINUTE_MS,
  TRY_PALETTES,
  TRY_PALETTE_ORDER,
  TRY_SAVE_MS,
  TRY_SOUND,
  TRY_WORDS,
  WORD_FADE_MS,
  nextTryRow,
  paletteVars,
  savedSoFar,
  startWordSwitch,
  stepWordSwitch,
  trySoundOf,
  type WordSwitch,
} from "@/lib/premium/plusTry";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const code = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/** Source with its comments taken out: a comment may say what the code may not. */
const bare = (p: string) =>
  code(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const MESSAGES = path.join(ROOT, "lib/i18n/messages");
const CATALOGS = Object.fromEntries(
  fs
    .readdirSync(MESSAGES)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.replace(/\.json$/, ""), JSON.parse(fs.readFileSync(path.join(MESSAGES, f), "utf8")) as Record<string, string>]),
);

const TRY_DIR = "components/billing/plusTry";
const PREVIEW_FILES = fs
  .readdirSync(path.join(ROOT, TRY_DIR))
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => `${TRY_DIR}/${f}`);
const TRY_FILES = ["components/billing/PlusTry.tsx", "lib/premium/plusTry.ts", "lib/premium/plusTrySound.ts", ...PREVIEW_FILES];

/** The words this build added, each in every language. */
const NEW_KEYS = ["plus.try.open", "plus.try.next", "plus.try.minute", "plus.try.example"];

describe("every row, in depth (his note 39)", () => {
  it("has a live look of its own: all fourteen, not a sample", () => {
    expect(PLUS_ROWS).toHaveLength(14);
    expect([...TRY_PREVIEW_IDS].sort()).toEqual(PLUS_ROWS.map((r) => r.id).sort());
    const host = code("components/billing/PlusTry.tsx");
    const files = new Map([...host.matchAll(/^\s*"?([a-z-]+)"?: lazy\(\(\) => import\("\.\/plusTry\/(Try\w+)"\)\),?\s*$/gm)].map((m) => [m[1], m[2]]));
    expect(files.size).toBe(14);
    // Each its own screen: no two rows share one.
    expect(new Set(files.values()).size).toBe(14);
    for (const id of TRY_PREVIEW_IDS) {
      const file = files.get(id);
      expect(file, id).toBeTruthy();
      expect(fs.existsSync(path.join(ROOT, TRY_DIR, `${file}.tsx`)), `${id} ${file}`).toBe(true);
      expect(code(`${TRY_DIR}/${file}.tsx`), file).toMatch(/export default function Try\w+\(\{ row \}: TryProps\)/);
    }
  });

  it("walks on with Next in the order the list shows, and stops at its end", () => {
    const rows = plusRowsLedBy(null);
    for (let i = 0; i < rows.length - 1; i += 1) expect(nextTryRow(rows, rows[i].id)?.id).toBe(rows[i + 1].id);
    expect(nextTryRow(rows, rows[rows.length - 1].id)).toBeNull();
    expect(nextTryRow(rows, "no-such-row")).toBeNull();
    // A lock's own feature leads the list, and Next follows the list as led.
    const led = plusRowsLedBy("ambience");
    expect(nextTryRow(led, "ambience")?.id).toBe(PLUS_ROWS[0].id);
  });

  it("gives Ambience its minute of Rain, as drawn, and every page no clock", () => {
    expect(TRY_MINUTE_MS).toBe(60_000);
    expect(TRY_SOUND).toEqual({ ambience: "rain" });
    expect(trySoundOf("ambience")).toBe("rain");
    for (const r of PLUS_ROWS) if (r.id !== "ambience") expect(trySoundOf(r.id), r.id).toBeNull();
    expect(trySoundOf(null)).toBeNull();
  });
});

describe("the Plus page's rows", () => {
  const kept = bare("components/billing/KeptPaywall.tsx");

  it("end in Try it, named with the feature, the whole row its button", () => {
    expect(kept).toContain('{t("plus.try.open")}');
    expect(kept).toContain("aria-describedby={nameId}");
    expect(kept).toContain("after:absolute after:inset-0");
    expect(kept).toContain("onTry={onTry ? () => onTry(row.id) : undefined}");
  });

  it("are tried in all three places the Plus page stands", () => {
    expect(bare("components/billing/UpgradeModal.tsx")).toContain("<PlusFeatureRows lead={feature} onTry={tryer.start}");
    const screen = bare("components/billing/PlusPaywall.tsx");
    // The apps' screen and the website's /pricing (TierScreen), and the apps' screen signed out.
    expect(screen.match(/<PlusFeatureRows onTry=\{tryer\.start\} \/>/g)).toHaveLength(2);
    expect(bare("components/billing/WebPaywall.tsx")).toContain("<TierScreen");
  });

  it("keep the plans held at the foot while a feature is tried", () => {
    const sheet = bare("components/billing/UpgradeModal.tsx");
    // One dock, after the list and after a preview alike.
    expect(sheet.match(/<PlansDock\b/g)).toHaveLength(1);
    expect(sheet.indexOf("<PlusTryPage")).toBeLessThan(sheet.indexOf("<PlansDock"));
    const screen = bare("components/billing/PlusPaywall.tsx");
    expect(screen).toMatch(/<TryingOnScreen tryer=\{tryer\} \/>\s*\{children\}/);
    expect(screen).toMatch(/<TryingOnScreen tryer=\{tryer\} \/>[\s\S]*<SignedOutFoot place="store" \/>/);
  });

  it("wear one tile: the Candlelight row's Aa on the same grey as every other (his note 39)", () => {
    expect(kept).not.toContain("CANDLELIGHT");
    const picture = kept.slice(kept.indexOf("function FeaturePicture"), kept.indexOf("export function FeatureRow"));
    expect(picture).not.toContain("style=");
    expect(picture).toContain("bg-paper/[0.08]");
    // Every look of the tile is drawn from the one box.
    expect(picture.match(/className=\{box\}/g)?.length).toBe(2);
    expect(picture).toContain("className={cn(box,");
  });

  it("no longer rise one by one, so no row's showing waits on an animation (the gap where Listen offline stood)", () => {
    const row = kept.slice(kept.indexOf("export function FeatureRow"), kept.indexOf("export function PlusFeatureRows"));
    expect(row).not.toContain("paywall-in");
    expect(row).not.toContain("animationDelay");
    const rows = kept.slice(kept.indexOf("export function PlusFeatureRows"), kept.indexOf("/* ── What readers say"));
    expect(rows).toMatch(/<ul className="paywall-in flex flex-col gap-2\.5"/);
    expect(PLUS_ROWS.map((r) => r.id)).toContain("offline");
  });

  it("take the pills out: Ambience's sounds stand in its live look, as the ambience sheet draws them", () => {
    expect(kept).not.toContain("AMBIENCE_TRACKS");
    expect(bare(`${TRY_DIR}/TryAmbience.tsx`)).toContain("AMBIENCE_TRACKS.map");
  });
});

describe("a preview shows and never grants", () => {
  it("writes nothing of the reader's: no store, no account, no purchase, no setting", () => {
    const WRITERS = [
      /\blocalStorage\.setItem\b/,
      /\bwriteVerseAnnotation\b/,
      /\b(?:addRecord|updateRecord|removeRecord|restoreRecord|writeDraft|dismissPlanDay)\b/,
      /\b(?:startPlan|completeDay|uncompleteDay|resetPlan|startPlanSession)\b/,
      /\banswer\(/,
      /\bkeepTexts?\(/,
      /\b(?:addItem|setItemNote|useFlorilegia)\b/,
      /\b(?:saveMyProfile|syncCalendar|uploadBanner|uploadAvatar)\b/,
      /\b(?:setPrefs|writePresencePrefs|usePresencePrefs)\b/,
      /\b(?:saveChapters|removeBook|useSaveBook)\b/,
      /\b(?:useShowSupporterMark|pushProfilePrefs)\b/,
      /\b(?:emitEntitlementsChanged|purchase|restore|upsert_entitlement)\(/,
      /\bsetReadingTheme\b|data-reading-mode/,
    ];
    for (const file of TRY_FILES) {
      const src = bare(file);
      for (const w of WRITERS) expect(src, `${file}: ${w}`).not.toMatch(w);
    }
  });

  it("asks the server only for what any reader may read: the word study, a profile of their own", () => {
    const calls = TRY_FILES.flatMap((f) => [...bare(f).matchAll(/\b(apiFetch|fetch|fetchMyProfile)\(/g)].map((m) => `${f}: ${m[1]}`));
    expect(calls).toEqual([`${TRY_DIR}/TryProfile.tsx: fetchMyProfile`]);
    // The profile is read for a signed-in reader and never written back.
    expect(bare(`${TRY_DIR}/TryProfile.tsx`)).toContain("if (!readLocalSessionUser()) return;");
  });

  it("plays its sound through the one ambience player, for a minute, and lets it go on every way out", () => {
    const sound = bare("lib/premium/plusTrySound.ts");
    expect(sound).toContain("void playAmbience(sound);");
    expect(sound).toContain("}, TRY_MINUTE_MS);");
    expect(sound).toContain("fadeOutAmbience(FADE_AT_END);");
    const sheet = bare("components/billing/UpgradeModal.tsx");
    // Closed, opened again, or left by a link: the sound goes.
    expect(sheet.match(/endTrySound\(\);/g)?.length).toBeGreaterThanOrEqual(4);
    // The apps' screen going away, or going back to the list.
    const host = bare("components/billing/PlusTry.tsx");
    expect(host).toContain("useEffect(() => () => endTrySound(), []);");
  });
});

describe("the reader's own things, shown as examples", () => {
  const sayings = JSON.parse(code("data/plans/sayings.json")) as Record<string, Record<string, { text: string; author: string; work: string }>>;

  it("take their words from the app's own library, a Father's line with its author", () => {
    for (const [name, ex] of Object.entries(TRY_EXAMPLES)) {
      const s = sayings[ex.plan]?.[String(ex.day)];
      expect(s?.text, name).toBeTruthy();
      expect(s?.author, name).toMatch(/^St\. /);
      expect(fs.existsSync(path.join(ROOT, `data/bible/${ex.book}/${ex.chapter}.json`)), name).toBe(true);
    }
    expect(TRY_GATHERING.father).toBe(TRY_EXAMPLES.fromThisDay);
  });

  it("are marked Example wherever words not the reader's stand", () => {
    for (const f of ["TryJournal", "TryFlorilegium", "TryRemember", "TryMark"]) {
      expect(bare(`${TRY_DIR}/${f}.tsx`), f).toMatch(/<ExampleTag\b/);
    }
    expect(bare(`${TRY_DIR}/TryKit.tsx`)).toContain('t("plus.try.example")');
  });
});

describe("the palettes the Candlelight preview switches between", () => {
  const css = code("app/globals.css");
  const block = (selector: string) => {
    const re = new RegExp(`${selector.replace(/[[\]"()]/g, (c) => `\\${c}`)} \\{([^}]*)\\}`, "g");
    return [...css.matchAll(re)].map((m) => m[1]).join("\n");
  };
  const value = (src: string, token: string) => new RegExp(`${token}:\\s*(#[0-9a-f]{6})`, "i").exec(src)?.[1]?.toLowerCase();

  it("are app/globals.css's own, token for token", () => {
    const theme = /@theme \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    const sources = {
      default: theme,
      candlelight: block('html[data-reading-mode="candlelight"]'),
      monastery: block('html[data-reading-mode="monastery"]'),
    } as const;
    for (const [id, src] of Object.entries(sources) as [keyof typeof TRY_PALETTES, string][]) {
      const p = TRY_PALETTES[id];
      expect(value(src, "--color-night"), id).toBe(p.night);
      expect(value(src, "--color-night-soft"), id).toBe(p.nightSoft);
      expect(value(src, "--color-night-deep"), id).toBe(p.nightDeep);
      expect(value(src, "--color-paper"), id).toBe(p.paper);
    }
  });

  it("are set on the window alone, as variables, never on the page", () => {
    expect(paletteVars("candlelight")).toEqual({
      "--color-night": "#0a0a0a",
      "--color-night-soft": "#18181b",
      "--color-night-deep": "#050505",
      "--color-paper": "#d4d4d8",
    });
    expect(TRY_PALETTE_ORDER.map((p) => p.id)).toEqual(["default", "candlelight", "monastery"]);
    expect(bare(`${TRY_DIR}/TryReadingModes.tsx`)).toContain('useState<TryPalette>("candlelight")');
  });
});

describe("switching the word study's word (his note 43 of build 80: \"buggy in a couple frames and it's not smooth\")", () => {
  const [logos, zoe, phos] = TRY_WORDS.map((w) => w.strongs);
  const ready = (s: WordSwitch, ...words: string[]) => words.reduce((acc, w) => stepWordSwitch(acc, { type: "ready", strongs: w, y: 0 }), s);

  it("keeps the word shown until the chosen one's verses are here, then brings it in over it", () => {
    let s = ready(startWordSwitch(logos), logos);
    expect(s).toMatchObject({ chosen: logos, shown: logos, leaving: null });
    // Chosen before its verses came: the switch moves, the window keeps λόγος.
    s = stepWordSwitch(s, { type: "choose", strongs: zoe, y: 140 });
    expect(s).toMatchObject({ chosen: zoe, shown: logos, leaving: null });
    // Here: ζωή comes in, λόγος goes out from where it was scrolled to.
    s = stepWordSwitch(s, { type: "ready", strongs: zoe, y: 160 });
    expect(s).toMatchObject({ chosen: zoe, shown: zoe, leaving: { strongs: logos, y: 160 } });
    s = stepWordSwitch(s, { type: "left" });
    expect(s.leaving).toBeNull();
    // A word already here comes in at the tap.
    s = ready(s, phos);
    s = stepWordSwitch(s, { type: "choose", strongs: phos, y: 0 });
    expect(s).toMatchObject({ chosen: phos, shown: phos, leaving: { strongs: zoe, y: 0 } });
  });

  it("goes back without waiting, and never brings in a word no longer chosen", () => {
    let s = ready(startWordSwitch(logos), logos);
    s = stepWordSwitch(s, { type: "choose", strongs: zoe, y: 0 });
    s = stepWordSwitch(s, { type: "choose", strongs: logos, y: 0 });
    expect(s).toMatchObject({ chosen: logos, shown: logos, leaving: null });
    s = stepWordSwitch(s, { type: "ready", strongs: zoe, y: 0 });
    expect(s).toMatchObject({ chosen: logos, shown: logos, leaving: null });
  });

  it("shows the first word chosen while nothing has come yet, with nothing to keep", () => {
    const s = stepWordSwitch(startWordSwitch(logos), { type: "choose", strongs: phos, y: 0 });
    expect(s).toMatchObject({ chosen: phos, shown: phos, leaving: null });
  });

  it("loads all three as the preview opens, through the study's own asking, and waits in the window's own height", () => {
    const tryWord = bare(`${TRY_DIR}/TryWordStudy.tsx`);
    expect(tryWord).toMatch(/for \(const w of TRY_WORDS\) \{\s*void preloadWordStudy\(w\.strongs, "nt"\)/);
    expect(tryWord).toContain("loading={!state.ready.includes(shown)}");
    // The one going out stands where it was, out of the flow, so the study coming in sets the height inside.
    expect(tryWord).toContain('"plus-try-word-out pointer-events-none absolute inset-x-0"');
    expect(tryWord).toContain("style={out && leaving ? { top: -leaving.y } : undefined}");
    expect(tryWord).toContain("window.setTimeout(() => dispatch({ type: \"left\" }), WORD_FADE_MS)");
    // The window's height is its own, never the study's.
    expect(bare(`${TRY_DIR}/TryKit.tsx`)).toContain('tall ? "h-[clamp(220px,40dvh,340px)]"');
    // A study already here opens whole, not from "Finding every place".
    const study = bare("components/bible/WordStudySheet.tsx");
    expect(study).toContain("useState<Answer | null>(() => (strongs ? (answered.get(addressOf(strongs, startIn)) ?? null) : null))");
    expect(study).toContain("useState(() => answer === null)");
    expect(study).toMatch(/askFor\(strongs, tab\)\s*\.then/);
    // The going out lasts as long as it is kept.
    expect(code("app/globals.css")).toContain(`animation: plus-try-word-out ${WORD_FADE_MS}ms var(--ease-house) both;`);
  });
});

describe("the other previews' facts", () => {
  it("study the three words John 1 begins with", () => {
    expect(TRY_WORDS.map((w) => w.lemma)).toEqual(["λόγος", "ζωή", "φῶς"]);
    const strongs = JSON.parse(code("lib/bible/strongs-greek.json")) as Record<string, { l?: string }>;
    for (const w of TRY_WORDS) expect(strongs[`G${w.strongs}`]?.l, w.strongs).toBe(w.lemma);
  });

  it("show the Discord status as Settings' own example and swatches show it", () => {
    const modes = code("components/desktop/DiscordModes.tsx");
    expect(modes).toContain(
      `const EXAMPLE_PLACE: ReadingPlace = { kind: "scripture", book: "${TRY_DISCORD_PLACE.book}", chapter: ${TRY_DISCORD_PLACE.chapter}, chapters: ${TRY_DISCORD_PLACE.chapters}, fraction: ${TRY_DISCORD_PLACE.fraction} };`,
    );
    const theirs = /const SWATCH: Record<SeasonColor, string> = \{([\s\S]*?)\};/.exec(modes)?.[1].replace(/\s+/g, "");
    const ours = /export const SWATCH: Record<SeasonColor, string> = \{([\s\S]*?)\};/.exec(code(`${TRY_DIR}/TryDiscord.tsx`))?.[1].replace(/\s+/g, "");
    expect(ours).toBe(theirs);
  });

  it("count a book's chapters saving as the mark does, and finish", () => {
    expect(savedSoFar(0, 21)).toBe(0);
    expect(savedSoFar(TRY_SAVE_MS / 3, 21)).toBe(7);
    expect(savedSoFar(TRY_SAVE_MS, 21)).toBe(21);
    expect(savedSoFar(TRY_SAVE_MS * 2, 21)).toBe(21);
    expect(savedSoFar(100, 0)).toBe(0);
  });
});

describe("the words", () => {
  it("are in all twenty-one catalogs, translated, never the English copied", () => {
    expect(Object.keys(CATALOGS)).toHaveLength(21);
    const en = CATALOGS.en;
    for (const key of NEW_KEYS) {
      expect(en[key], key).toBeTruthy();
      for (const [lang, m] of Object.entries(CATALOGS)) {
        expect(m[key]?.trim(), `${lang} ${key}`).toBeTruthy();
        if (lang !== "en") expect(m[key], `${lang} ${key} is the English`).not.toBe(en[key]);
      }
    }
    expect(en["plus.try.open"]).toBe("Try it");
    expect(en["plus.try.minute"]).toBe("{sound} plays for a minute, then stops.");
  });

  it("keep their places to fill in every language", () => {
    for (const [lang, m] of Object.entries(CATALOGS)) {
      expect(m["plus.try.next"], lang).toContain("{feature}");
      expect(m["plus.try.minute"], lang).toContain("{sound}");
    }
  });

  it("stand together, after the paywall's own, not at the end of a catalog", () => {
    for (const [lang, m] of Object.entries(CATALOGS)) {
      const keys = Object.keys(m);
      const at = keys.indexOf("plus.kept.title");
      expect(keys.slice(at + 1, at + 1 + NEW_KEYS.length), lang).toEqual(NEW_KEYS);
    }
  });

  it("carry no em dash, in the catalogs or in the code", () => {
    const DASH = String.fromCharCode(0x2014);
    for (const [lang, m] of Object.entries(CATALOGS)) for (const key of NEW_KEYS) expect(m[key], `${lang} ${key}`).not.toContain(DASH);
    for (const file of TRY_FILES) expect(code(file), file).not.toContain(DASH);
  });
});

describe("the look", () => {
  it("is black, white and grey: no gold or yellow class, and no lamp", () => {
    for (const file of TRY_FILES) {
      const src = bare(file);
      expect(src, file).not.toMatch(/\b(?:text|bg|ring|border|from|to|via|shadow|fill|stroke)-(?:amber|yellow|gold|premium)\b/);
      expect(src, file).not.toMatch(/Lampada/);
    }
  });

  it("stands still with motion turned down", () => {
    const css = code("app/globals.css");
    for (const cls of ["plus-try-minute-fill", "plus-try-carry", "plus-try-rest", "plus-try-word-in", "plus-try-word-out"]) {
      expect(css, cls).toMatch(new RegExp(`\\.${cls} \\{[^}]*animation:`));
      expect(css, cls).toMatch(new RegExp(`:where\\(\\[data-motion="reduce"\\]\\) \\.${cls}[,\\s]`));
    }
  });
});
