// Theology, revamped (1.8, round 3 r3-13): the owner's pick of 2026-10-30, a
// hybrid of B and C, not A: "I like the images that are on B, but I like C's
// design" (Homebase/boards/purify-master/variants/r3-13-theology-revamp,
// INDEX.md; his note 47 of build 80). C's structure: the path of nine in the
// Creed's order, a head by the reader's own answer to Familiarity, a step,
// the library after the ninth and Go deeper, a study one part at a time.
// B's images: each icon whole in its own light, a step as a room over its
// icon, a Father's words over his portrait, his words as picture cards.
//
// What a reader would notice if this broke: the same hub for everyone, a
// subject's icon cropped, the search pill floating back over the hub, a
// study's passages back behind a door, motion while Purify's motion is off,
// or a label printed as its key. Read as text: the built pages are measured
// in the export walk.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { shouldShowBack } from "@/lib/nav/backBar";
import { screenOf } from "@/lib/analytics/screens";
import { headFor } from "@/lib/theology/path";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (file: string) =>
  read(file)
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (selector: string) => {
  const at = css.indexOf(`\n${selector} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
};
const MESSAGES = path.join(ROOT, "lib/i18n/messages");
const catalogs = fs
  .readdirSync(MESSAGES)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ lang: f.replace(/\.json$/, ""), messages: JSON.parse(read(`lib/i18n/messages/${f}`)) as Record<string, string> }));
const EN = catalogs.find((c) => c.lang === "en")!.messages;

const HUB_PAGE = "app/(app)/theology/page.tsx";
const HUB = "components/theology/TheologyHub.tsx";
const PLATES = "components/theology/PathPlates.tsx";
const STEP_PAGE = "app/(app)/theology/path/[subject]/page.tsx";
const STEP = "components/theology/StepView.tsx";
const DOCTRINE = "app/(app)/theology/[topic]/page.tsx";
const TOPIC = "components/theology/TopicReader.tsx";
const COVER = "components/theology/StudyCover.tsx";
const CONTENTS = "components/theology/StudyContents.tsx";
const READ_PAGE = "app/(app)/theology/[topic]/read/page.tsx";
const READER = "components/theology/StudyReader.tsx";
const DECK = "components/theology/PassageDeck.tsx";
const ICON = "components/theology/WholeIcon.tsx";

describe("the hub, transitionary (C)", () => {
  it("gives each reader the head their answer to Familiarity asks for; one who never answered is learning", () => {
    expect(headFor("inquirer")).toBe("first");
    expect(headFor("learning")).toBe("resume");
    expect(headFor("practicing")).toBe("library");
    expect(headFor(null)).toBe("resume");
    const hub = code(HUB);
    // Read on the device, so the export carries all three and nothing is fetched.
    expect(hub).toContain("const { level } = useSpace();");
    expect(hub).toContain("const progress = usePathProgress();");
    expect(hub).not.toMatch(/\bfetch\(/);
  });

  it("opens a new reader on the first step and its short answer, a learning one where they left off", () => {
    const hub = code(HUB);
    expect(hub).toContain('t("study.theology.beginWhereChurchBegins")');
    expect(hub).toContain('t("prayers.today.whereYouLeftOff")');
    expect(hub).toMatch(/short && read\.kind === "question" && step\.short/);
    expect(hub).toContain('fresh ? t("onboard.day1.open") : t("common.continue")');
    // The learning card: the step's medallion ringed by the path of nine, and the next read lit.
    expect(hub).toMatch(/<PathMedal[^>]*size=\{82\}[^>]*inner=\{66\}[^>]*states=\{states\}/);
    expect(hub).toContain("path-lit ");
  });

  it("gives a practicing reader the library first, the search's field in it, and the path folded at the foot", () => {
    const hub = code(HUB);
    const library = hub.slice(hub.indexOf('if (head === "library")'), hub.indexOf('return (\n    <div data-theology-head={head}>'));
    expect(library).toMatch(/onClick=\{\(\) => openSearch\("theology"\)\}/);
    expect(library.indexOf("{slots.recent}")).toBeLessThan(library.indexOf("{slots.waysTiles}"));
    expect(library.indexOf("{slots.councils}")).toBeLessThan(library.indexOf("<FoldedPath"));
    expect(hub).toMatch(/<details data-path-folded="" className="group mt-8">/);
  });

  it("shows the nine as plates wherever all nine show at once, then the path's end and Go deeper", () => {
    const hub = code(HUB);
    const rest = hub.slice(hub.indexOf('return (\n    <div data-theology-head={head}>'));
    const order = ["<PathPlates", 'id="go-deeper"', 't("discover.eyebrow")', 't("study.apologetics.goDeeper")', "{slots.waysRows}", "{slots.councils}", "{slots.more}"].map((s) =>
      rest.indexOf(s),
    );
    for (const at of order) expect(at).toBeGreaterThan(-1);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    const plates = code(PLATES);
    expect(plates).toContain("<WholeIcon");
    expect(plates).toContain("className={`grid grid-cols-3 ");
    expect(plates).toContain('aria-current={state === "current" ? "step" : undefined}');
  });

  it("keeps the four ways, the Seven Councils by their pictures, the Fathers and Church History", () => {
    const page = code(HUB_PAGE);
    for (const part of ["<WaysRows", "<WaysTiles", "<CouncilFilm", "<RecentStudies", "<FathersShelf", 'href="/history"']) expect(page, part).toContain(part);
    const library = code("components/theology/TheologyLibrary.tsx");
    for (const href of ['"/theology/doctrine"', '"/topics"', '"/heresies"', '"/apologetics"']) expect(library, href).toContain(href);
    expect(library).toContain('className="council-film ');
  });

  it("drops the floating search pill and the bands, and asks the app's one search, turned to Theology", () => {
    const page = code(HUB_PAGE);
    expect(page).not.toContain("TheologySearch");
    expect(page).not.toContain("FaithMap");
    expect(page).toMatch(/<MobileTopBar titleKey="nav\.discoverMenu\.theology" back backFallback="\/discover" searchPlace="theology" \/>/);
    for (const file of ["components/theology/FaithMap.tsx", "components/theology/DoctrineDoors.tsx", "components/theology/FathersDeck.tsx"]) {
      expect(fs.existsSync(path.join(ROOT, file)), file).toBe(false);
    }
  });
});

describe("the app's one search, opened from Theology", () => {
  it("is asked by an event on window, with the place it opens turned to", () => {
    const open = code("lib/search/open.ts");
    expect(open).toContain("export function openSearch(place?: string): void");
    // One file, the search job's (r3-12): the event's name and the place it carries.
    expect(open).toContain('SEARCH_OPEN_EVENT = "purify:search-open"');
    expect(open).toContain("const detail: SearchOpenDetail = place ? { place } : {};");
    expect(open).toContain("new CustomEvent<SearchOpenDetail>(SEARCH_OPEN_EVENT, { detail })");
  });

  it("is what the bar's magnifier asks for on every Theology screen this round draws", () => {
    const bar = code("components/nav/MobileTopBar.tsx");
    expect(bar).toMatch(/searchPlace \? \([\s\S]*?openSearch\(searchPlace\);[\s\S]*?\) : \(\s*<SearchTrigger \/>/);
    for (const file of [HUB_PAGE, STEP_PAGE, DOCTRINE, READ_PAGE]) expect(code(file), file).toContain('searchPlace="theology"');
    for (const file of [HUB_PAGE, STEP_PAGE, DOCTRINE, READ_PAGE, HUB, STEP, TOPIC, READER]) expect(code(file), file).not.toContain("TheologySearch");
  });
});

describe("a subject's icon, whole in its own light (B)", () => {
  it("is never cropped: the icon at its own proportions over its own light", () => {
    const icon = code(ICON);
    expect(icon).toContain('className="whole-icon-light" style={{ backgroundImage: `url(${src})` }}');
    expect(icon).toContain('className="whole-icon-picture"');
    expect(rule(".whole-icon-picture")).toContain("object-fit: contain;");
    const light = rule(".whole-icon-light");
    expect(light).toMatch(/filter: blur\(22px\) grayscale\(1\)/);
    expect(light).not.toMatch(/animation|transition/);
  });
});

describe("a step, as a room over its icon (B) with C's line", () => {
  it("is a page of its own for each of the nine, its bar clear over the room", () => {
    const page = code(STEP_PAGE);
    expect(page).toContain("export const dynamicParams = false;");
    expect(page).toContain("THEOLOGY_SUBJECTS.map((s) => ({ subject: s.id }))");
    expect(page).toMatch(/<MobileTopBar title=\{step\.title\} back backFallback="\/theology" revealTitleOn="step-title" overlay/);
    expect(page).toContain('id="step-title"');
    expect(page).toContain('className="step-room saint-icon-in"');
    expect(page).toContain('className="step-body relative z-[1] ');
  });

  it("keeps the icon behind the page on a phone only, and the page rises over it on its own ground", () => {
    const phone = css.slice(css.indexOf("@media (max-width: 767.98px) {\n .step-room {"));
    expect(phone).toMatch(/^@media \(max-width: 767\.98px\) \{\n \.step-room \{\n  position: fixed;/);
    expect(rule(".step-room")).toContain("position: relative;");
    expect(rule(".step-body")).toContain("background-color: var(--color-night);");
  });

  it("reads the question first, then the studies, the errors and the councils, the next lit, Up next at its end", () => {
    const step = code(STEP);
    expect(step).toContain('const KINDS: readonly ReadKind[] = ["question", "study", "error", "council"];');
    expect(step).toContain('s === "next" ? "path-lit"');
    expect(step).toContain("updatePathProgress((p) => withAt(p, step.id));");
    expect(step).toMatch(/data-step-next=""[\s\S]*?t\("walk\.upNext"\)[\s\S]*?onClick=\{walkOn\}/);
    expect(step).toContain('"/theology#go-deeper"');
  });
});

describe("a doctrine's page: B's cover, C's before you read", () => {
  it("opens on a Father's words over his portrait, the subject's icon whole behind them", () => {
    const topic = code(TOPIC);
    expect(topic).toContain("const epigraph = passages[epigraphIndex(passages, body.epigraph)] ?? null;");
    expect(topic).toContain("<StudyCover");
    const cover = code(COVER);
    expect(cover).toContain('className="study-cover saint-icon-in under-topbar ');
    expect(cover).toMatch(/<WholeIcon src=\{subject\.src\}/);
    expect(cover).toMatch(/data-card-words=""\s*className="post-fold doctrine-shadow /);
  });

  it("says how long the study is, its parts and its Fathers, then its parts with their Fathers by face, then Begin", () => {
    const topic = code(TOPIC);
    expect(topic).toContain('<T k="bible.minRead" replacements={{ minutes }} />');
    expect(topic).toContain('<T k="study.theology.partCount" count={parts.length} />');
    expect(topic).toContain('<T k="study.theology.fatherCount" count={fathers.length} />');
    const contents = code(CONTENTS);
    expect(contents).toContain("href={`/theology/${slug}/read#part-${resume}`}");
    expect(contents).toContain('begun ? t("common.continue") : t("onboard.day1.open")');
    expect(contents).toContain('t("paths.part", { n: resume, total })');
    expect(contents).toContain('t("study.theology.fromTheFathers")');
  });

  it("drops the doors and the deck as a place to browse, and keeps Scripture and Related", () => {
    const topic = code(TOPIC);
    for (const gone of ["DoctrineDoors", "FathersDeck", "ReadTheStudy"]) expect(topic, gone).not.toContain(gone);
    expect(topic).toContain("<ScripturePart body={body} />");
    expect(topic).toContain("<RelatedPart body={body} groups={groups} events={events} />");
  });
});

describe("a study read one part at a time (C) on the icon's light (B)", () => {
  it("is a page of its own for each study, every part in it, one shown", () => {
    const page = code(READ_PAGE);
    expect(page).toContain("export const dynamicParams = false;");
    expect(page).toContain("return topicParams();");
    expect(page).toContain("subtitle={<ReaderPartLine total={placed.parts.length} />}");
    const reader = code(READER);
    expect(reader).toContain("hidden={n !== part}");
    expect(reader).toContain('className="part-segment w-full"');
    expect(reader).toContain('className="reader-light"');
  });

  it("sets the part's Fathers as a deck at its end; the last part closes with the councils, the rest of the Fathers and who curated it", () => {
    const page = code(READ_PAGE);
    expect(page).toMatch(/<StudyPartText blocks=\{part\.blocks\} summary=\{i === 0 \? body\.summary : undefined\} \/>/);
    expect(page).toContain("<PassageDeck passages={[...part.passages, ...(i === last ? placed.end : [])].map((j) => passages[j])} />");
    expect(page).toContain("<StudyCouncils councils={body.councils ?? []} />");
    expect(page).toContain("<StudyCurated body={body} />");
  });

  it("keeps the furthest part, and the study once its last part is reached, on the device", () => {
    const reader = code(READER);
    expect(reader).toMatch(/const reached = withPart\(p, slug, part\);\s*return part === total \? withRead\(reached, readIdOf\.study\(slug\)\) : reached;/);
    // The part in the address, replaced and never pushed: back leaves the reading.
    expect(reader).toContain("window.history.replaceState(window.history.state, ");
    expect(reader).not.toContain("pushState");
  });

  it("lets the tab bar step away while the study is read on, as in the Bible", () => {
    expect(code(READER)).toContain("useScrollAway();");
  });

  it("deals the passages as B's picture cards, his portrait above his words", () => {
    const deck = code(DECK);
    expect(deck).toContain('className="theology-card relative flex w-full flex-col overflow-hidden rounded-[22px] pb-5"');
    expect(deck).toContain('<span className="theology-card-picture absolute inset-0 overflow-hidden">');
    expect(deck).toMatch(/data-card-words=""\s*className="post-fold /);
    expect(deck).toContain('"--fold-lines": CARD_LINES');
    expect(deck).toMatch(/className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory items-stretch /);
  });
});

describe("the new screens' addresses", () => {
  it("wear their own bar, so the apps show one", () => {
    for (const route of ["/theology", "/theology/path/salvation", "/theology/essence-energies/read", "/theology/essence-energies"]) {
      expect(shouldShowBack(route), route).toBe(false);
    }
    expect(shouldShowBack("/theology/doctrine")).toBe(true);
  });

  it("are each a screen of their own in the counts", () => {
    expect(screenOf("/theology")).toBe("theology");
    expect(screenOf("/theology/path/salvation")).toBe("theology-step");
    expect(screenOf("/theology/essence-energies/read")).toBe("theology-reading");
    expect(screenOf("/theology/essence-energies")).toBe("theology-topic");
  });
});

describe("the revamp's look", () => {
  it("lights what is in hand white, and steps the glow aside on Parchment", () => {
    for (const selector of [".path-lit", '.path-plate[data-state="current"]', '.path-node[data-state="next"]', '.part-segment[data-state="current"]']) {
      expect(rule(selector), selector).toMatch(/rgb\(255 255 255 \/ 0\.\d+\)/);
      expect(css, selector).toContain(`html[data-reading-mode="parchment"] ${selector} {`);
    }
  });

  it("keeps every motion behind Purify's motion switch", () => {
    for (const selector of [".path-plate", ".part-segment"]) {
      expect(rule(selector), selector).toMatch(/transition: /);
      expect(css, selector).toContain(`:where([data-motion="reduce"]) ${selector} {\n transition: none;\n}`);
    }
    expect(code(HUB)).toContain("group-open:rotate-180 motion-reduce:transition-none");
  });

  it("draws its surfaces from the ground and the ink, with a plain value first for an old WebView", () => {
    for (const selector of [".path-lit", ".path-node", ".theology-entry", ".council-film::after"]) {
      const body = rule(selector);
      expect(body, selector).toContain("color-mix(in srgb, var(--color-");
      // The plain value comes first, the mix after it, which an old WebView skips.
      expect(body.indexOf("rgb("), selector).toBeLessThan(body.indexOf("color-mix("));
    }
  });
});

describe("the revamp's words", () => {
  const NEW = ["study.theology.partCount", "study.theology.fatherCount"];

  it("are in all 21 catalogs, each form printing the count, none of them the English copied", () => {
    expect(catalogs).toHaveLength(21);
    for (const key of NEW) {
      expect(EN[`${key}.one`], key).toContain("{count}");
      expect(EN[`${key}.other`], key).toContain("{count}");
      for (const { lang, messages } of catalogs) {
        expect(messages[`${key}.one`], `${lang}: ${key}`).toBeTruthy();
        expect(messages[`${key}.other`], `${lang}: ${key}`).toContain("{count}");
        if (lang !== "en") expect(messages[`${key}.other`], `${lang}: ${key}`).not.toBe(EN[`${key}.other`]);
      }
    }
  });

  it("are inserted beside Theology's own keys, not at a catalog's end", () => {
    for (const { lang } of catalogs) {
      const text = read(`lib/i18n/messages/${lang}.json`);
      const after = text.indexOf('"study.theology.tray.councils.other"');
      const at = text.indexOf('"study.theology.partCount.one"');
      expect(at, lang).toBeGreaterThan(after);
      expect(text.slice(after, at).split("\n").length, lang).toBe(2);
    }
  });

  it("reuse the catalogs' own words for everything else the screens say", () => {
    const used = [HUB, STEP, CONTENTS, READER, DECK, COVER, "components/theology/PathRead.tsx", "components/theology/PathPlates.tsx"]
      .map(code)
      .join("\n");
    const keys = [...used.matchAll(/\btn?\("([a-zA-Z0-9_.]+)"/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys) {
      const known = EN[key] !== undefined || EN[`${key}.one`] !== undefined || EN[`${key}.singular`] !== undefined;
      expect(known, key).toBe(true);
    }
  });
});

describe("the revamp's own files", () => {
  it("carry no em dash", () => {
    const files = [
      HUB_PAGE, HUB, PLATES, STEP_PAGE, STEP, DOCTRINE, TOPIC, COVER, CONTENTS, READ_PAGE, READER, DECK, ICON,
      "components/theology/PathMedal.tsx", "components/theology/PathRead.tsx", "components/theology/FatherFace.tsx",
      "components/theology/PassageTools.tsx", "components/theology/RecentStudies.tsx", "components/theology/StudyPartText.tsx",
      "components/theology/TheologyLibrary.tsx", "components/theology/useFolds.ts", "lib/theology/path.ts", "lib/theology/parts.ts",
      "lib/theology/pathSteps.ts", "lib/theology/passages.ts", "lib/theology/usePathProgress.ts", "lib/theology/page.ts", "lib/search/open.ts",
    ];
    for (const file of files) expect(read(file).includes(String.fromCharCode(0x2014)), file).toBe(false);
  });
});
