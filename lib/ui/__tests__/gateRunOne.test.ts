import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { discInitial } from "@/lib/community/discInitial";

/**
 * The pre-build gate's first run (docs/1.9-build/notes/gate-run-1.md,
 * 2026-11-11), the part of its list that fell to the Themes chat, with the
 * fresh-eyes looks beside it (docs/1.9-build/notes/fresh-eyes.md, M5 and L5).
 * The owner's word the gate comes from (CLAUDE.md, "No test build reaches him
 * until it passes the pre-build gate"): "ensure our next build doesn't have
 * any similar issues or any other issues of this nature."
 *
 * The walk on the export is what measures a screen
 * (scripts/guardrail-walk.mjs). This holds each mend in the code, so the next
 * edit to one of these files cannot put its finding back before a walk is
 * run: every case here fails on the code the gate walked.
 *
 * What would go wrong if this broke: a button a finger cannot find (two
 * downloads 22px tall, thirty fasting marks 29px tall, a tab 18px wide); a
 * line of words too faint to read on Light (2.31:1 and 2.05:1); a play mark
 * that keeps to the right in Arabic; a reader's disc drawn empty; or the walk
 * failing on a star a reader typed in their own post.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note is not read as the page. */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
/** The class of the first element whose opening tag holds `mark`. */
function classNear(src: string, mark: string): string {
  const at = src.indexOf(mark);
  expect(at, mark).toBeGreaterThan(-1);
  const from = src.lastIndexOf("<", at);
  const tag = src.slice(from, src.indexOf(">\n", at) + 1 || undefined);
  const cls = tag.match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}]*)\})/);
  expect(cls, `${mark}: no class`).not.toBeNull();
  return cls![1] ?? cls![2] ?? cls![3] ?? "";
}

describe("a finger's 44px", () => {
  it("the export page's two downloads keep their own height on a phone", () => {
    const src = code("components/account/ExportLibrary.tsx");
    const buttons = [...src.matchAll(/className="(tap-press inline-flex h-12 [^"]*)"/g)].map((m) => m[1]);
    expect(buttons).toHaveLength(2);
    // Shared down a column (flex-1 in flex-col) a button gave up its height: 22 and 24px.
    for (const cls of buttons) {
      expect(cls).toContain("sm:flex-1");
      expect(` ${cls} `).not.toContain(" flex-1 ");
    }
    expect(src).toContain('className="mt-7 flex flex-col gap-3 sm:flex-row"');
  });

  it("the fasting marks reach 44px without growing: Kept, In part and Broke on every day", () => {
    // Redrawn for build 95 (note 3): the three marks are one switch, the house's carved track, whose
    // choices each lean on the same helper. The page draws that switch and no button of its own for a mark.
    const src = code("components/fasting/FastingTrackerClient.tsx");
    const control = src.slice(src.indexOf("function MarkSwitch"), src.indexOf("export function FastingTrackerClient"));
    expect(control).toMatch(/return <Track value=\{value \?\? null\}/);
    expect(control).not.toMatch(/<button\b/);
    const track = code("components/settings/LitPanel.tsx");
    expect(track.slice(track.indexOf("export function Track"))).toMatch(/role="radio"[\s\S]{0,160}className="hit-44"/);
    // The helper they lean on is still the house's.
    expect(read("app/globals.css")).toMatch(/\.hit-44::after \{[^}]*min-width: 44px;[^}]*min-height: 44px;/);
  });

  it("Community: Sign in and the feed's Try again are 44px tall", () => {
    const src = code("components/community/CommunityClient.tsx");
    expect(classNear(src, 'href="/signin?next=/community"')).toContain("min-h-11");
    expect(classNear(src, "onClick={reload}")).toContain("min-h-11");
  });

  it("Community: the small ways in a post reach 44px, each by the house's helper", () => {
    const src = code("components/community/CommunityClient.tsx");
    // The writer's picture, the day's link, the replies' Try again, and a waiting reply's two buttons.
    expect(src).toContain('<AuthorButton seed={seed} decorative className="hit-44 shrink-0 rounded-full">');
    expect(classNear(src, "href={`/saints/${post.feast_slug}`}")).toMatch(/^hit-44 /);
    expect(classNear(src, "onClick={() => void loadReplies()}")).toMatch(/^hit-44 /);
    expect(classNear(src, "onClick={() => void sendReply(p.body, p.tempId)}")).toMatch(/^hit-44 /);
    expect(classNear(src, "onClick={() => discardPending(p.tempId)}")).toMatch(/^hit-44 /);
  });

  it("Community: a name in a line stays under 44px by name, with its reason and the 44px ways beside it", () => {
    const src = code("components/community/CommunityClient.tsx");
    // A post's name, as a reply's already was: the picture and the menu's View profile are the 44px ways.
    const names = [...src.matchAll(/smallBecause="([^"]*)"/g)].map((m) => m[1]);
    expect(names).toHaveLength(2);
    for (const why of names) expect(why).toMatch(/the picture beside it and the menu's View profile are the 44px ways to the profile/);
    expect(src).toContain('menuItems.push({ label: t("community.viewProfile")');
    // A name inside a reader's sentence: a button, so checkMock's own leave for a link in a line does not reach it.
    const mention = src.slice(src.indexOf("function MentionText"));
    expect(mention).toMatch(/data-mock-allow="target"\s*data-mock-why="a name inside a sentence of a reader's own words, as a link in a line of text is"/);
  });

  it("Community: a short word over the feed reaches 44px, and the open word keeps its rule", () => {
    expect(code("components/community/FeedTabs.tsx")).toContain('"community-tab hit-44 relative min-h-11 ');
    const css = read("app/globals.css");
    // ::after is .hit-44's, so the lit rule under the open word is ::before.
    expect(css).toContain('.community-tab[aria-selected="true"]::before {');
    expect(css).not.toContain('.community-tab[aria-selected="true"]::after');
  });

  it("Prayers: Chants and the four quiet links are 44px to a finger", () => {
    const src = code("components/prayers/PrayersTodayClient.tsx");
    expect(src).toContain('const TALL = "inline-flex min-h-11 items-center";');
    expect(src).toContain('<Link href="/chants" className={`mt-6 inline-flex min-h-11 min-w-11 items-center ${QUIET_LINK}`}>');
    for (const href of ["/prayers/learning/jesus-prayer", "/bible/psalms/1", "/saints", "/prayers/learning"]) {
      expect(src, href).toContain(`<Link href="${href}" className={\`\${TALL} \${QUIET_LINK}\`}>`);
    }
    // None left as a bare line of 20px.
    expect(src).not.toMatch(/className=\{QUIET_LINK\}/);
  });
});

describe("words a reader can read", () => {
  /** Whether a class wears a share the house keeps for marks, not for words (app/globals.css, "Faint text on every palette"). */
  const tooFaint = (cls: string) => /(?:^|\s)text-paper\/(?:35|40)(?:\s|$)/.test(cls);

  it("the lines the gate found at 2.31:1 and 2.05:1 wear a share each palette draws at its own safe strength", () => {
    const lines: [file: string, mark: string][] = [
      ["components/fasting/FastingTrackerClient.tsx", 'style={{ animationDelay: "340ms" }}'],
      ["components/start/StartHere.tsx", "w-8 shrink-0 text-center font-serif text-title"],
      ["components/start/liturgy/GuideSteps.tsx", "w-4 shrink-0 text-end font-semibold tabular-nums"],
      ["components/start/liturgy/GuideSheets.tsx", "w-5 shrink-0 text-end font-sans text-caption"],
      ["app/(app)/councils/[slug]/[document]/page.tsx", '<p className="font-sans text-caption text-paper/'],
      ["components/account/ExportLibrary.tsx", '{t("ui.gathering")}'],
    ];
    for (const [file, mark] of lines) {
      const cls = classNear(code(file), mark);
      expect(tooFaint(cls), `${file}: ${cls}`).toBe(false);
      expect(cls, file).toMatch(/(?:^|\s)text-paper\/(?:45|50)(?:\s|$)/);
    }
    // Community's house rules, under the feed and beside it.
    const community = code("components/community/CommunityClient.tsx");
    const rules = [...community.matchAll(/<p className="([^"]*)">\s*\{t\("community\.houseRules"\)\}/g)].map((m) => m[1]);
    expect(rules).toHaveLength(2);
    for (const cls of rules) expect(cls).toMatch(/(?:^|\s)text-paper\/45(?:\s|$)/);
  });

  it("the chant's closed tabs are 4.5:1 on Light's deeper ground", () => {
    const css = read("app/globals.css");
    const light = css.slice(css.indexOf('html[data-reading-mode="parchment"] {'));
    const hex = (name: string) => {
      const m = light.match(new RegExp(`${name}: (#[0-9a-f]{6});`));
      expect(m, name).not.toBeNull();
      return [1, 3, 5].map((i) => parseInt(m![1].slice(i, i + 2), 16));
    };
    const ink = hex("--color-paper");
    const ground = hex("--color-night-deep");
    const share = css.match(/:where\(html\[data-reading-mode="parchment"\]\) \.chant-doors > button \{\s*color: color-mix\(in srgb, var\(--color-paper\) (\d+)%, transparent\);/);
    expect(share).not.toBeNull();
    const a = Number(share![1]) / 100;
    const lin = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
    const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const drawn = ink.map((c, i) => c * a + ground[i] * (1 - a));
    const ratio = (lum(ground) + 0.05) / (lum(drawn) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    // The strip's own 62 percent is what fell short there: 3.9:1.
    const was = ink.map((c, i) => c * 0.62 + ground[i] * 0.38);
    expect((lum(ground) + 0.05) / (lum(was) + 0.05)).toBeLessThan(4.5);
    // It only follows the plain rule, so the open door's ink and a hover still win.
    expect(css.indexOf(share![0])).toBeGreaterThan(css.indexOf('.chant-doors > button[aria-selected="true"] {'));
  });
});

describe("a fasting mark that is on", () => {
  it("wears no tone of its own: lit as the house's switch lights a choice, and a word that can be read", () => {
    // Walked with marks on, which a walk at rest cannot see: Broke's word (the red at 80 percent) was
    // 2.3:1 on Dark, and Kept's green on Light 4.25:1 over its own fill. Kept was a fixed emerald before that.
    // Redrawn for build 95 (note 3), a mark that is on is the switch's raised plate, the same for Kept, In
    // part and Broke: none is green and none is red, so none reads as a verdict, and none can fall short of
    // its ground on a palette. A recent day says its mark in the page's own ink.
    const src = code("components/fasting/FastingTrackerClient.tsx");
    expect(src).not.toMatch(/\b(?:text|bg|border|ring)-(?:emerald|crimson|sage|gold)/);
    expect(src).toMatch(/data-fast-day-mark="" className="[^"]*\btext-paper\/85\b/);
    // The calendar's own mark for the day is its own tone, never alone: beside the day's name (fastMeta.tsx).
    expect(src).toContain("const { Icon, rgb } = FAST_META[kind];");
  });

  it("moves nothing when it changes: the two summary lines keep the taller line's height", () => {
    const src = code("components/fasting/FastingTrackerClient.tsx");
    // Both wordings stand in one grid cell and one is seen, so a line never changes height under the finger (it moved the marks 19px).
    expect(src.match(/<span className="grid min-w-0 flex-1 font-sans text-detail leading-snug text-paper\/70">/g)).toHaveLength(2);
    expect(src.match(/className=\{`col-start-1 row-start-1 \$\{/g)).toHaveLength(4);
    expect(src).not.toMatch(/\{streak === 0\s*\?\s*t\("fasting\.streakNone"\)/);
    // With nothing kept the second line keeps its room and is not seen: it is never taken out of the page.
    expect(src).toMatch(/<p aria-hidden=\{keptInAll === 0\} className=\{cn\("flex items-baseline gap-3 py-3", keptInAll === 0 && "invisible"\)\}>/);
    // A recent day's switch opens and shuts on its own, so no row moves up under a finger as another shuts.
    expect(src).toContain("const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());");
  });
});

describe("a play mark in Arabic", () => {
  it("is drawn centred on its own box on a chant's page and in the player, with no nudge to a side", () => {
    // As Prayers' own were (lib/prayers/__tests__/prayersMirror.test.ts): a play mark points right in every
    // language, so it is not turned, and a nudge to the right stayed on the right.
    const marks: [file: string, play: RegExp][] = [
      ["components/chants/ChantPlay.tsx", /<Play size=\{size === "lg" \? 18 : 15\} centered \/>/],
      ["components/chants/ChantVersions.tsx", /<Play size=\{18\} centered \/>/],
      ["components/player/Transport.tsx", /<Play size=\{28\} centered \/>/],
    ];
    for (const [file, play] of marks) {
      const src = code(file);
      expect(src, file).toMatch(play);
      expect(src, file).not.toMatch(/translate-x-\[\d+px\]/);
    }
    // The player's triangle is the house's, not a second drawing of it.
    expect(code("components/player/Transport.tsx")).not.toContain('d="M7 4.5v15l12.5-7.5L7 4.5z"');
    expect(read("components/ui/icons/Play.tsx")).toContain('centered ? "M7.83 4.5v15l12.5-7.5L7.83 4.5z" : "M7 4.5v15l12.5-7.5L7 4.5z"');
  });
});

describe("no empty round frame", () => {
  it("a reader's disc always holds a letter where it has no picture", () => {
    expect(discInitial("maria")).toBe("M");
    expect(discInitial("Иван")).toBe("И");
    // A name that begins with a space drew nothing, an empty disc.
    expect(discInitial("  anna")).toBe("A");
    // A name that begins with an emoji drew the first half of it, a broken mark.
    expect(discInitial("\u{2728}Sophia\u{2728}")).toBe("S");
    expect(discInitial("\u{1F54A}\u{FE0F} dove")).toBe("D");
    expect(discInitial("7th hour")).toBe("7");
    // A script with no capitals keeps its letter.
    expect(discInitial("გიორგი")).toBe("გ");
    // No letter at all, or no name: a reader.
    expect(discInitial("\u{2728}\u{2728}")).toBe("R");
    expect(discInitial("")).toBe("R");
    expect(discInitial(null)).toBe("R");
    // One whole character, whatever its capital is.
    expect(Array.from(discInitial("ßen"))).toHaveLength(1);
  });

  it("the disc draws that letter, and says on itself that it is never empty", () => {
    const src = code("components/community/CommunityAvatar.tsx");
    expect(src).toContain("{discInitial(name)}");
    expect(src).not.toContain("name[0]");
    expect(src).toMatch(/data-community-avatar=""\s*data-mock-allow="picture"\s*data-mock-why="a reader's face: their picture, or the first letter of their name where they have none, never empty"/);
  });

  it("the play disc on a feature card says it is a sign, not a frame waiting for a picture", () => {
    const src = code("components/mobile/SoftTiles.tsx");
    expect(src).toMatch(/data-mock-allow="picture"\s*data-mock-why="the card's own sign \(a play mark\) on its disc, not a frame waiting for a picture"\s*className="shrink-0 inline-flex h-12 w-12 /);
  });
});

describe("a reader's own words", () => {
  it("are named where Community draws them, so a star or a long dash a reader typed is not read as the app's", () => {
    const src = code("components/community/CommunityClient.tsx");
    expect(src).toContain('const READERS_WORDS = { "data-mock-allow": "sparkle emdash", "data-mock-why": "a reader\'s own words" } as const;');
    // A post's title and words, a reply's words, a reply on its way, and the names readers chose.
    expect(src).toMatch(/<h3 dir="auto" \{\.\.\.READERS_WORDS\} /);
    // The post's words: whatever else its tag carries, it carries the name.
    const body = src.slice(src.indexOf("ref={bodyFold}"), src.indexOf("<MentionText text={post.body} />"));
    expect(body.slice(0, body.indexOf("className="))).toContain("{...READERS_WORDS}");
    expect(src).toMatch(/<p dir="auto" \{\.\.\.READERS_WORDS\} className="[^"]*">\s*<MentionText text=\{r\.body\} \/>/);
    expect(src.match(/\{\.\.\.READERS_WORDS\}/g)!.length).toBeGreaterThanOrEqual(7);
    // The same leave the code's own test gives them (lib/ui/__tests__/noSparkle.test.ts).
    expect(read("lib/ui/__tests__/noSparkle.test.ts")).toContain("lib/community/symbols.ts");
  });
});
