// Build 98 note 2, the owner (2026-11-15): "make the listen system the same
// as the Bible listening system (UI/ux) one so there isn't a floating
// button". On build 98 (78c5297e1) every text read aloud beside the Bible
// had Listen as a button in the page under its title, and while it played
// the mini player floated over the tab bar, under the work's own pill on a
// work and a council: two bars one over the other. On a phone and a tablet
// they now listen as a chapter does: Listen in the foot pill beside the
// sound, and while anything plays the reader's dock, one bar.

import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { entriesNow as currentEntries, forgetListenOnPage, listenFor, registerListen, type ListenOnPage } from "@/lib/listen/onPage";
import { listenId } from "@/lib/listen/texts";

/** A file's source; empty where it does not exist (build 98 had no TextPill), so each claim fails on its own. */
const read = (rel: string) => {
  const file = path.resolve(__dirname, "../../..", rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
};

/** The five texts read aloud beside the Bible, and the pill each listens from. */
const TEXTS: { page: string; pill: string }[] = [
  { page: "components/saints/SaintLife.tsx", pill: "<TextPill" },
  { page: "components/saints/WritingReader.tsx", pill: "<MobileWorkPill" },
  { page: "components/councils/CouncilReader.tsx", pill: "<MobileWorkPill" },
  { page: "components/theology/StudyReader.tsx", pill: "<TextPill" },
  { page: "components/history/EventArticle.tsx", pill: "<TextPill" },
];

const HERE = read("components/reading/ListenHere.tsx");
const WORK = read("components/saints/MobileWorkPill.tsx");
const TEXT = read("components/reading/TextPill.tsx");
const DOCK = read("components/bible/ReaderDock.tsx");

describe("one way to listen, the Bible's (build 98 note 2)", () => {
  afterEach(() => forgetListenOnPage());

  it("draws no Listen button in the page on a phone or a tablet: the page's own is the computer's", () => {
    // Where the pills stand (md:hidden native-md-flex) the page's button does not, and the other way round.
    expect(HERE).toContain('<ReaderPill onClick={tap} className={cn("hidden md:inline-flex native-md-hidden", className)}');
    // What it does stays in the page: the paragraph lit, the page following, the roll into the next part.
    expect(HERE).toMatch(/\{playing \? spokenHere \? <SpokenFollow src=\{src\} \/> : <ListenFollow id=\{id\} \/> : null\}/);
    expect(HERE).toContain("void startListening(next).then((began) => {");
    // And says what it would read, for the pill.
    expect(HERE).toContain("useEffect(() => registerListen({ id, title, by, art }), [id, title, by, art]);");
  });

  it("listens from each text's foot pill, beside the sound, as a chapter does", () => {
    for (const { page, pill } of TEXTS) expect(read(page), page).toContain(pill);
    for (const [name, src] of [["MobileWorkPill", WORK], ["TextPill", TEXT]]) {
      expect(src, name).toMatch(/<AmbienceButton variant="pill" \/>\s*<ListenPillButton text=\{text\} \/>/);
    }
    // The Bible's own pill button: the same face as its Listen (components/bible/ReadAloud.tsx).
    const bible = read("components/bible/ReadAloud.tsx");
    const face = "reader-lit tap-press hit-44 ms-1 inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-pill bg-paper px-3";
    expect(bible).toContain(face);
    expect(HERE).toContain(face);
  });

  it("shows one bar while anything plays: the dock in the pill's place, and the mini player steps aside", () => {
    expect(WORK).toContain("useOwnPlayer(dockShows ? HOSTS_EVERYTHING : NOTHING);");
    expect(WORK).toMatch(/if \(docked\) \{\s*return \(\s*<ReaderDock/);
    expect(TEXT).toContain("useOwnPlayer(shows ? HOSTS_EVERYTHING : NOTHING);");
    expect(TEXT).toMatch(/\{docked \? \(\s*<ReaderDock/);
    // The dock is the Bible's, which wears the foot player's name, so a tab switch morphs it (note 14).
    expect(DOCK).toContain('"reader-dock relative bg-night-soft');
    expect(read("app/globals.css")).toMatch(/\.mini-player,\s*\.reader-dock \{\s*view-transition-name: foot-player;/);
  });

  it("keeps a text's arrows and names where it has parts, and its name alone where it has none", () => {
    // A work's chapters and a council's sections turn from the dock as from the pill, and the name opens the contents.
    expect(WORK).toMatch(/prev=\{prev \? \{ onGo: \(\) => onGo\(prev\.n\) \} : null\}/);
    expect(WORK).toContain("onPick={openWorkContents}");
    // A study's parts turn from its pill.
    expect(read("components/theology/StudyReader.tsx")).toMatch(/prev=\{part > 1 \? \{ onGo: \(\) => showPart\(part - 1\)/);
    // A text with no parts: no arrows, its name in the chapter's place, and no title at the top while drawn in.
    // (A work's dock draws its arrows always, as its pill at rest does: Updates 98k, dockFace.test.ts.)
    expect(DOCK).toContain("turns = Boolean(prev || next),");
    expect(DOCK).toContain("{turns ? <DockArrow target={next} label={nextLabel} back={false} /> : null}");
    expect(DOCK).toMatch(/\{onPick \? \(\s*<div\s*data-reader-chrome\s*data-dock-title/);
  });

  it("reads the part shown where the page holds several: a council's sections, a study's parts", () => {
    const section = (n: number): ListenOnPage => ({ id: listenId("council", "nicaea-i", "creed", n), title: `Section ${n}`, by: "Nicaea" });
    const gone = [1, 2, 3].map((n) => registerListen(section(n)));
    // The pill reads what the page has as it stands.
    expect(listenFor(currentEntries(), 2)?.id).toBe(listenId("council", "nicaea-i", "creed", 2));
    // A part with no recording or voice of its own never reads another part's.
    expect(listenFor(currentEntries(), 7)).toBeNull();
    gone.forEach((g) => g());
    expect(currentEntries()).toHaveLength(0);
    // A life, an event: the page's one text.
    const life: ListenOnPage = { id: listenId("life", "xenia-of-petersburg"), title: "The life of St. Xenia", by: "Purify" };
    const away = registerListen(life);
    expect(listenFor(currentEntries())?.id).toBe(life.id);
    expect(listenFor(currentEntries(), 4)?.id).toBe(life.id);
    away();
  });
});
