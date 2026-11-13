// A surface follows the reader's palette and look (build 95 note 20).
//
// His word, 2026-11-13 about 08:00 UTC, with a screenshot of the shop on the
// Holy Mountain look: "this doesn't match the them the users uses". The page
// was the look's navy; the shop's feast card and the piece inside it were
// near black, drawn in fixed colours (#0a0a0a, #141414) that no palette and no
// look can reach. The house rule is that a surface is drawn from the palette's
// tokens (app/globals.css), so Light, True black and every look re-ink it with
// nothing written per screen.
//
// So the app's code is read for surfaces in fixed colours:
//
//   - the pages and components (app/, components/): a background named by a
//     literal colour in a class (bg-[#0a0a0a], bg-black/20, from-[#...]) or in
//     a style (background: "#..." or "rgb(...)"). White light laid over a
//     surface, and nothing at all (transparent), are not a ground and are not
//     counted;
//   - the stylesheet: a rule outside any palette's or look's own block whose
//     ground (its last background or background-color) is a literal colour,
//     solid, with no token in it. A rule that writes a literal first and a
//     token after it (the fallback for an old WebView) follows the palette.
//
// Each one found is named in NAMED (the code) or RULES (the stylesheet), with
// its reason: a picture or a printed thing that has its own colours, a dim or
// a scrim that must stay dark, a signal colour that is the same on every
// palette, a well that is see-through and takes the colour beneath it, a set
// piece kept dark by his word, or one that ignores a look and waits to be
// mended (WAITING). Anything found and not named fails here, and a name whose
// surface is gone fails until it is taken off, so the list stays the truth.
//
// The shop's own pieces are held by name below: the feast card and the stores'
// doors stand on the shop's token surfaces (.shop-feature, .shop-vitrine).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(ROOT, dir))) {
    if (name === "node_modules" || name === "__tests__") continue;
    const rel = path.join(dir, name);
    if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(name)) out.push(rel);
  }
  return out;
}

/** White light over a surface, nothing at all (any colour at no strength), or a token: not a fixed ground. */
const NOT_A_GROUND = (c: string) =>
  /^#(fff|ffffff)([0-9a-f]{2})?$/i.test(c) ||
  /^rgba?\(\s*255[ ,]+255[ ,]+255\b/i.test(c) ||
  /[,/]\s*0(\.0+)?\s*\)$/.test(c) ||
  c.includes("var(");

/** Comments out of the code, so a note that names a colour is not a surface. */
const uncomment = (code: string) => code.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

const CLASS = /(?<![\w-])(?:[\w-]+:)*(?:bg|from|via|to)-(?:\[(#[0-9a-fA-F]{3,8}|rgba?\([^\]]*\))\](?:\/\d+)?|black(?:\/(?:\d+|\[[\d.]+\]))?)(?![\w-])/g;
const STYLE = /\b(?:background|backgroundColor|backgroundImage)\s*:\s*([`"'])([^`"']*)\1/g;

/** Every literal ground in the pages and components, as "file: literal". */
function codeGrounds(): string[] {
  const found = new Set<string>();
  for (const file of [...walk("app"), ...walk("components")]) {
    const code = uncomment(read(file));
    for (const m of code.matchAll(CLASS)) if (!(m[1] && NOT_A_GROUND(m[1]))) found.add(`${file}: ${m[0].replace(/^(?:[\w-]+:)+/, "")}`);
    for (const m of code.matchAll(STYLE)) {
      // A colour written as a token's fallback, var(--color-night, #0b0b0e), is the token.
      const value = m[2].replace(/var\(--[\w-]+\s*,[^)]*\)/g, "var()");
      for (const c of value.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) ?? []) if (!NOT_A_GROUND(c)) found.add(`${file}: ${c.replace(/\s+/g, " ")}`);
    }
  }
  return [...found].sort();
}

type Named = Record<string, string>;
const PICTURE = "a picture with colours of its own, not a surface the palette paints";
const SHARE_PICTURE = "a picture the server draws for other sites to show (a share card, the app's icon): it has no palette";
const WELL = "a well a shade below what it sits on: see-through black, so it takes the palette's or the look's own colour beneath it (Light softens it, app/globals.css)";
const DIM = "the dim behind a sheet or a photograph, which stays dark on every palette";
const SCRIM = "a picture's scrim, fading into the page's own night (var(--color-night)), so the words over the picture are read";
const LM_CARD = "Dark's graphite under lm-card, which every look paints with its own surface (--surface-card), and Light and True black with theirs (app/globals.css, the lm-* surfaces)";
const LM_FEATURE = "Dark's graphite under lm-feature, which every look paints with its own band (--surface-band), and Light and True black with theirs (app/globals.css)";
const LM_HERO = "Dark's own ground under lm-hero, which every look and Light paint over (app/globals.css, the lm-* surfaces)";
const GIFT = "the gift's reveal, a set piece dark by design on every palette (app/globals.css, the dark-island's note), and its own warm light";
const EIKON_ROOM =
  "EIKON's room: obsidian on every palette by his word of 2026-09-30 (components/shop/eikon/EikonBoutique.tsx), so walking into it reads as another room. On a look it ignores the look, as the feast card did: whether the room follows the look too is his to say (build 95 note 20)";

/** The literal grounds of the pages and components, each with its reason. */
const NAMED: Named = {
  "app/(app)/p/[id]/opengraph-image.tsx: #101013": SHARE_PICTURE,
  "app/(app)/p/[id]/opengraph-image.tsx: rgba(16,16,19,0.55)": SHARE_PICTURE,
  "app/(app)/p/[id]/opengraph-image.tsx: rgba(16,16,19,0.92)": SHARE_PICTURE,
  "app/(app)/u/[handle]/opengraph-image.tsx: #1d1d20": SHARE_PICTURE,
  "app/apple-icon.tsx: #101013": SHARE_PICTURE,
  "app/apple-icon.tsx: #0a0a0a": SHARE_PICTURE,
  "app/icon.tsx: #0a0a0a": SHARE_PICTURE,
  "components/desktop/DiscordPreviewCard.tsx: bg-[#1b1c1f]": "Discord's own colours: a picture of a message in Discord, on the website",
  "components/desktop/DiscordPreviewCard.tsx: bg-[#111214]": "Discord's own colours: a picture of a message in Discord, on the website",
  "components/desktop/DiscordPreviewCard.tsx: bg-[#4e5058]": "Discord's own colours: a picture of a message in Discord, on the website",
  "components/layout/Footer.tsx: bg-[#5865F2]": "Discord's own blue, on the website's button to it",
  "components/layout/Footer.tsx: bg-[#E1306C]": "Instagram's own pink, on the website's button to it",
  "components/layout/Footer.tsx: bg-[#FF4500]": "Reddit's own orange, on the website's button to it",
  "components/marketing/storeBits.tsx: bg-[#0d0d0f]": "a phone's own frame, drawn round a store picture on the website",
  "components/marketing/storeBits.tsx: bg-[#101013]": "a phone's own screen behind a store picture on the website",
  "components/marketing/storeBits.tsx: bg-black": "a phone's camera and its island, drawn on the website",
  "components/mobile/BookSpine.tsx: bg-[#c4c4c9]": "a book's spine band in its group's own colour: " + PICTURE,
  "components/mobile/BookSpine.tsx: bg-[#eaeaec]": "a book's spine band in its group's own colour: " + PICTURE,
  "components/mobile/BookSpine.tsx: bg-[#6b85b5]": "a book's spine band in its group's own colour: " + PICTURE,
  "components/mobile/BookSpine.tsx: bg-[#4f6b8c]": "a book's spine band in its group's own colour: " + PICTURE,
  "components/mobile/BookSpine.tsx: bg-[#a86c6c]": "a book's spine band in its group's own colour: " + PICTURE,
  "components/mobile/BookSpine.tsx: bg-[#9b9ba3]": "a book's spine band in its group's own colour: " + PICTURE,
  "components/mobile/BookSpine.tsx: bg-[#7a7a82]": "a book's spine band in its group's own colour: " + PICTURE,
  "components/mobile/BookSpine.tsx: bg-[#6b6470]": "a book's spine band in its group's own colour: " + PICTURE,
  "components/mobile/BookSpine.tsx: bg-[#7400bb]": "a book's spine band in its group's own colour: " + PICTURE,
  "components/prayers/PrayerIcon.tsx: bg-[#1a1219]": "the ground of an icon's frame, under the icon itself, which covers it",
  "components/prayers/PrayerSlideshow.tsx: bg-[#1a1219]": "the ground of an icon's frame, under the icons themselves, which cover it",
  "components/ui/PurifyBadge.tsx: #0a0a0a": "Purify's own mark, white on black, the same everywhere it stands",
  "components/auth/PasswordInput.tsx: bg-[#e3a7a7]": "a step of the password's strength meter: a signal, the same on every palette",
  "components/profile/ProfileDanger.tsx: bg-[#a31f24]": "the Church's red a step darker under the pointer, on the button that wipes this device: one red on every palette",
  "components/bible/VerseRow.tsx: rgba(183,176,163,0.45)": "a matched word's pill in the verse: a warm grey that reads on every palette, with the palette's own ink on it (its own note)",
  "components/calendar/FastBadge.tsx: rgb(${meta.rgb} / 0.08)": "the fast's own tone, the Church's register, laid thin over the page",
  "components/calendar/PhoneCalendar.tsx: rgb(${meta.rgb} / 0.13)": "the fast's own tone, the Church's register, laid thin over the page",
  "components/streak/StreakFlame.tsx: rgb(255 90 79 / ${strength})": "the streak's flame, its own red",
  "components/bible/ChapterDiscussions.tsx: bg-black/15": WELL,
  "components/community/ActionMenu.tsx: bg-black/20": WELL,
  "components/community/CommunityClient.tsx: bg-black/20": WELL,
  "components/community/CommunityClient.tsx: bg-black/30": WELL,
  "components/community/moderation/ModerationClient.tsx: bg-black/20": WELL,
  "components/community/moderation/ModerationClient.tsx: bg-black/25": WELL,
  "components/community/profile/ClergyRequestCard.tsx: bg-black/20": WELL,
  "components/community/profile/ProfileEditor.tsx: bg-black/55": DIM,
  "components/player/NowPlayingSheet.tsx: bg-black/55": DIM,
  "components/profile/ImageCropSheet.tsx: bg-black": "the ground a photograph is cropped on: " + DIM,
  "components/councils/DocumentsDoor.tsx: to-black/75": "a picture's scrim, so the words over the picture are read",
  "components/onboarding/RoadCards.tsx: #101013": LM_HERO,
  "components/onboarding/OnboardingFlow.tsx: #101013": LM_HERO,
  "components/onboarding/OnboardingFlow.tsx: #2a2a2f": LM_CARD,
  "components/onboarding/OnboardingFlow.tsx: #18181b": LM_CARD,
  "components/ui/Graphite.tsx: #26262b": LM_CARD,
  "components/ui/Graphite.tsx: #1a1a1d": LM_CARD,
  "components/ui/Graphite.tsx: #151518": LM_CARD,
  "app/(app)/discover/page.tsx: #26262b": LM_CARD,
  "app/(app)/discover/page.tsx: #1a1a1d": LM_CARD,
  "app/(app)/discover/page.tsx: #151518": LM_CARD,
  "app/page.tsx: bg-black":
    "the website's front page on a computer: one verse held on a band (lm-band), black on Dark's own palettes; Light sets it as a deeper paper and every look on its own second ground (app/globals.css)",
  "app/page.tsx: #26262b": LM_CARD,
  "app/page.tsx: #1a1a1d": LM_CARD,
  "app/page.tsx: #151518": LM_CARD,
  "components/prayers/PrayerBookContents.tsx: #26262b": LM_CARD,
  "components/prayers/PrayerBookContents.tsx: #1b1b1e": LM_CARD,
  "components/prayers/PrayerBookContents.tsx: #161619": LM_CARD,
  "components/mobile/SoftTiles.tsx: #34343a": LM_FEATURE,
  "components/mobile/SoftTiles.tsx: #232327": LM_FEATURE,
  "components/mobile/SoftTiles.tsx: #1a1a1d": LM_FEATURE,
  "components/gifts/GiftBox.tsx: #101013": GIFT,
  "components/gifts/GiftBox.tsx: rgba(234,234,236,0.10)": GIFT,
  "components/gifts/GiftBox.tsx: rgba(234,234,236,0.18)": GIFT,
  "components/gifts/GiftBox.tsx: rgba(234,234,236,0.42)": GIFT,
  "components/gifts/GiftBox.tsx: rgba(247,236,217,0.55)": GIFT,
  "components/gifts/GiftBox.tsx: rgba(247,236,217,${ 0.55 + light.floodScale * 0.18 })": GIFT,
  "components/player/NowPlayingSheet.tsx: rgba(11,11,14,0.55)": SCRIM,
  "components/billing/KeptPaywall.tsx: rgb(16 16 19 / 0.4)": SCRIM,
  "components/premium/PlanScreen.tsx: rgb(16 16 19 / 0.5)": SCRIM,
  "components/premium/PlanScreen.tsx: rgb(16 16 19 / 0.45)": SCRIM,
  "components/ui/ConfirmDialog.tsx: rgba(0,0,0,0.45)": "the dim round the confirm dialog: " + DIM,
  "components/ui/ConfirmDialog.tsx: rgba(183,176,163,0.45)": "a hairline in the confirm dialog that fades at both ends: a warm grey that reads on every palette",
  "components/shop/eikon/EikonBoutique.tsx: bg-[#0a0a0a]": EIKON_ROOM,
  "components/shop/eikon/EikonBoutique.tsx: bg-[#141414]": EIKON_ROOM,
  "components/shop/eikon/EikonStory.tsx: bg-[#0a0a0a]": EIKON_ROOM,
  "components/shop/eikon/EikonStory.tsx: from-[#0a0a0a]": EIKON_ROOM,
  "components/shop/eikon/EikonStory.tsx: via-[#0a0a0a]/40": EIKON_ROOM,
  "components/shop/eikon/EikonStory.tsx: to-[#0a0a0a]": EIKON_ROOM,
};

/**
 * Fixed colours that ignore a look and are not mended here, each named for
 * the arbiter to route (build 95 note 20: "mend what is in reach and name the
 * rest"). Taken off when mended.
 */
const WAITING: Named = {
  "components/premium/PremiumUI.tsx: #1f1f22": "the Plus page's graphite cards (premiumCardBg, worn with dark-island): on a dark look they stay graphite, as the feast card did",
  "components/premium/PremiumUI.tsx: #18181b": "the Plus page's graphite cards (premiumCardBg, worn with dark-island): on a dark look they stay graphite, as the feast card did",
  "components/premium/PremiumUI.tsx: #131315": "the Plus page's graphite cards (premiumCardBg, worn with dark-island): on a dark look they stay graphite, as the feast card did",
  "components/marketing/ComingSoonLink.tsx: rgba(22, 18, 25, 0.92)": "the Coming soon plate over a sign-in button that is not ready, shown for a moment on a tap: dark on every palette and look",
};

describe("the pages and components draw no surface in a fixed colour that is not named", () => {
  const found = codeGrounds();

  it("names every literal ground, with its reason", () => {
    const named = { ...NAMED, ...WAITING };
    expect(found.filter((f) => !named[f])).toEqual([]);
  });

  it("keeps no name whose ground is gone (a mended one comes off the list)", () => {
    // A named file set aside by a native build in progress (.native-export-stash,
    // scripts/native-build.mjs) is not on disk for a moment; its name is not gone,
    // so a name whose file is absent is skipped here, never failed.
    const onDisk = (n: string) => existsSync(path.join(ROOT, n.slice(0, n.lastIndexOf(": "))));
    expect(Object.keys({ ...NAMED, ...WAITING }).filter((n) => onDisk(n) && !found.includes(n))).toEqual([]);
  });

  it("gives each name a reason", () => {
    for (const [name, why] of Object.entries({ ...NAMED, ...WAITING })) expect(why.length, name).toBeGreaterThan(20);
  });
});

// ── The stylesheet ──────────────────────────────────────────────────────────

const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
/** A rule inside a palette's or a look's own block, or an island that puts a palette's tokens back. */
const SCOPED = /html\[data-(reading-mode|look)|\[data-look|\[data-reading-mode|data-candle-season|\.dark-island|\.theme-island|data-try-look|data-palette=|:root|@theme/;
/** A solid literal colour: a hex of three or six digits, or rgb() with no alpha. */
const SOLID = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b|rgba?\(\s*\d+(?:\s*,\s*|\s+)\d+(?:\s*,\s*|\s+)\d+\s*\)/g;

/** Every rule whose own ground is a solid literal colour, by its selector. */
function sheetGrounds(): string[] {
  const found = new Set<string>();
  for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].split(";").pop()!.trim().replace(/\s+/g, " ");
    if (!selector || selector.startsWith("@") || /^(from|to|\d+%)\b/.test(selector) || SCOPED.test(selector)) continue;
    const grounds = m[2]
      .split(/;(?![^(]*\))/)
      .map((d) => d.trim())
      .filter((d) => /^background(-color)?\s*:/.test(d));
    const ground = grounds.at(-1);
    if (!ground || ground.includes("var(")) continue;
    if ((ground.match(SOLID) ?? []).some((c) => !NOT_A_GROUND(c))) found.add(selector);
  }
  return [...found].sort();
}

/** Has a look a rule of its own for this selector's first class? */
function lookRule(selector: string): boolean {
  const cls = /\.[a-z][\w-]*/.exec(selector)?.[0];
  if (!cls) return false;
  return [...CSS.matchAll(/([^{}]+)\{/g)].some((m) => /data-look/.test(m[1]) && new RegExp(`\\${cls}(?![\\w-])`).test(m[1]));
}

const PRINTED = "a printed thing, black on every palette (app/globals.css, the shop's own note: EIKON's seal and its box are printed things)";
const ATLAS = "the councils' atlas, Purify's own dark on every palette by his pick of 2026-10-24 (app/globals.css, the atlas's note)";
const EFFECT = "a speck of a profile's effect (gold dust, embers) over the reader's own banner";

/** The stylesheet's solid literal grounds with no look rule, each with its reason. */
const RULES: Named = {
  ".eikon-seal": PRINTED,
  ".eikon-box-lid": PRINTED,
  ".eikon-box-edge": PRINTED,
  ".atlas": ATLAS,
  ".atlas-door": ATLAS,
  ".atlas-door-foot": ATLAS,
  ".atlas-panel": ATLAS,
  ".pfx-gold-dust .pfx-p": EFFECT,
  ".pfx-paschal-embers .pfx-p": EFFECT,
  ".pfx-paschal-embers .pfx-p.pfx-alt": EFFECT,
};

describe("the stylesheet draws no surface in a fixed colour that a look cannot reach, unless it is named", () => {
  const found = sheetGrounds();

  it("each solid literal ground has a look's rule, or is named with its reason", () => {
    expect(found.filter((s) => !lookRule(s) && !RULES[s])).toEqual([]);
  });

  it("keeps no name it no longer needs", () => {
    expect(Object.keys(RULES).filter((s) => !found.includes(s) || lookRule(s))).toEqual([]);
  });
});

// ── The front page's verse band ────────────────────────────────────────────

describe("the website's front-page verse band is the look's own on every look", () => {
  // It was painted by the light looks alone (html[data-look][data-reading-mode=
  // "parchment"] .lm-band): on a dark look it stayed bg-black, a black band
  // across a forest or a mosaic (the arbiter, 2026-11-13).
  it("one rule for every look, dark and light, on the look's second ground", () => {
    const at = CSS.indexOf("\nhtml[data-look] .lm-band {");
    expect(at, "html[data-look] .lm-band").toBeGreaterThan(-1);
    expect(CSS.slice(at, CSS.indexOf("}", at))).toContain("background: var(--color-night-soft) !important;");
  });

  it("no rule narrows it back to the light looks", () => {
    expect(CSS).not.toMatch(/html\[data-look\]\[data-reading-mode="parchment"\] \.lm-band/);
  });

  it("the band on the page still wears the class the looks reach", () => {
    expect(uncomment(read("app/page.tsx"))).toMatch(/bg-black text-center lm-band/);
  });

  it("the verse's citation under it is 44 tall to the touch, its words where they stood", () => {
    // checkMock on the band failed its link, "NAHUM 1:7, BRENTON'S SEPTUAGINT", at 20px tall (2026-11-13).
    // Its box starts 12px higher (mt-4 from mt-7) and centres its line in 44, so the words do not move.
    expect(uncomment(read("app/page.tsx"))).toContain(
      'className="lm-ink-gold mt-4 inline-flex min-h-11 items-center font-sans text-detail font-semibold uppercase tracking-[1.5px]',
    );
  });
});

// ── The shop ───────────────────────────────────────────────────────────────

describe("the shop's feast card and its doors stand on the shop's own surfaces", () => {
  it("the feast card and the piece inside it: the shop's featured surface and its vitrine, no fixed colour, no dark island", () => {
    const band = uncomment(read("components/shop/FeastBand.tsx"));
    expect(band).toContain('className="shop-feature relative overflow-hidden rounded-2xl');
    expect(band).toContain('className="shop-vitrine group flex items-center gap-3 rounded-xl');
    expect(band).not.toMatch(/dark-island|bg-\[#|rgba?\(/);
  });

  it("every store's door, EIKON's too: the shop's surfaces, and its hairline drawn in the palette's ink", () => {
    const door = uncomment(read("components/shop/StoreDoor.tsx"));
    expect(door).toContain('"shop-feature text-paper ring-1 ring-inset ring-paper/12 hover:ring-paper/30"');
    expect(door).toContain('eikon ? "shop-vitrine ring-1 ring-inset ring-paper/[0.06]" : "shop-vitrine"');
    expect(door).toContain("color-mix(in srgb, var(--color-paper) 55%, transparent)");
    expect(door).not.toMatch(/dark-island|bg-\[#|rgba?\(/);
  });

  it("the two surfaces are tokens only, so every palette and look paints them", () => {
    for (const cls of [".shop-feature", ".shop-vitrine"]) {
      const at = CSS.indexOf(`\n${cls} {`);
      expect(at, cls).toBeGreaterThan(-1);
      const body = CSS.slice(at, CSS.indexOf("}", at));
      expect(body, cls).toContain("var(--color-night-soft)");
      expect(body.match(SOLID) ?? [], cls).toEqual([]);
    }
  });
});
