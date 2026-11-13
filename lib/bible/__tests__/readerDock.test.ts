// The reader's dock (1.9): one bar while anything plays, the owner's pick for
// Listening ("B, but when you scroll, it turns into C";
// docs/1.9-build/BRAINSTORM.md). Until 1.9 the chapter's pill and the mini
// player stood one over the other at the reader's foot (bug 5). Vitest here
// has no DOM, so the walk at phone size checked the screen; this holds the
// rules a later edit could quietly undo.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { EVERYTHING, hostsEverything, playsOnPage } from "@/lib/player/pagePlayer";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");
const CSS = read("app/globals.css");
const DOCK = read("components/bible/ReaderDock.tsx");
const PILL = read("components/bible/MobileChapterPill.tsx");
const BAR = read("components/prayers/NowPlayingBar.tsx");

/** A rule's body, by its exact selector list as the stylesheet writes it. */
function rule(selector: string): string {
  const at = CSS.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  return CSS.slice(at, CSS.indexOf("}", at));
}

describe("a page that is the player for everything", () => {
  const reading = "https://audio.purifyapp.net/read/john/1.mp3";

  it("plays every track itself, and a sound playing alone is its too", () => {
    expect(playsOnPage(reading, [EVERYTHING])).toBe(true);
    expect(playsOnPage("/audio/chants/axion-estin/byzantine.mp3", [EVERYTHING])).toBe(true);
    expect(hostsEverything([EVERYTHING])).toBe(true);
  });

  it("changes nothing for a page that names its own recordings (a chant's page)", () => {
    expect(playsOnPage(null, [EVERYTHING])).toBe(false);
    expect(playsOnPage(reading, ["/audio/chants/axion-estin/byzantine.mp3"])).toBe(false);
    expect(playsOnPage("https://purifyapp.net/audio/chants/axion-estin/byzantine.mp3", ["/audio/chants/axion-estin/byzantine.mp3"])).toBe(true);
    expect(hostsEverything(["/audio/chants/axion-estin/byzantine.mp3"])).toBe(false);
    expect(hostsEverything([])).toBe(false);
  });

  it("is what the mini player steps aside for, a sound playing alone included", () => {
    expect(BAR).toContain("(soundOnly && !hostsEverything(ownPlayer))");
    expect(BAR).toContain("!playsOnPage(src, ownPlayer)");
  });
});

describe("the chapter's pill", () => {
  it("is the player for everything wherever it stands: a phone's width on the web, every width in the apps", () => {
    expect(PILL).toContain('const PHONE = "(max-width: 767.98px)";');
    expect(PILL).toContain("return native || phone;");
    expect(PILL).toContain("useOwnPlayer(dockShows ? HOSTS_EVERYTHING : NOTHING);");
  });

  it("becomes the dock while anything is loaded, and is the pill it always was otherwise", () => {
    expect(PILL).toContain("const docked = dockShows && Boolean(src);");
    expect(PILL).toMatch(/\{docked \? \(\s*<ReaderDock/);
    // The pill keeps its running line, its sound button and Listen.
    expect(PILL).toContain("<ChapterVerseStatus");
    expect(PILL).toContain('<AmbienceButton variant="pill" />');
    expect(PILL).toContain("<ReadAloudPillButton");
  });
});

describe("the dock", () => {
  it("stays in focus mode, where the plates' chapter goes", () => {
    const wrapper = DOCK.slice(DOCK.indexOf("data-reader-dock"), DOCK.indexOf("data-reader-dock") + 900);
    expect(wrapper).not.toContain("data-reader-chrome");
    expect(DOCK).toMatch(/data-reader-chrome\s*data-dock-title/);
  });

  it("stands at the foot of the screen for the reading place, over the tab bar, never counting the mini player's room", () => {
    expect(DOCK).toContain('data-screen-edge="bottom"');
    // Its height off the foot, which the fade under it also reaches down from (1.9).
    expect(DOCK).toContain('["--pill-lift" as string]: "calc(var(--tab-bar-h) + var(--readings-flow-h, 0px) + env(safe-area-inset-bottom, 0px) + 12px)"');
    expect(DOCK).toContain('bottom: "var(--pill-lift)",');
  });

  it("offers Speed for a chapter read aloud alone, as Now Playing does, and saves it", () => {
    expect(DOCK).toContain('const speedShown = playingOf(audio.src)?.kind === "chapter";');
    expect(DOCK).toMatch(/const step = nextSpeed\(audio\.rate\);\s*saveSpeed\(step\);\s*setRate\(step\);/);
  });

  it("offers Listen in Speed's place where this chapter has a reading that is not the one loaded", () => {
    expect(DOCK).toContain("const listenHere = reads && listen && !hereLoaded;");
    // Known by the chapter the loaded recording reads, whichever address it
    // has: streamed, or saved to the phone while it played.
    expect(DOCK).toContain("const loaded = readingOfSrc(audio.src);");
    expect(DOCK).toContain("const hereLoaded = loaded?.book === slug && loaded.chapter === chapter;");
    expect(DOCK).toContain("await startReading(slug, chapter, `${bookName} ${chapter}`, t);");
  });

  // Updates 15's finding (2026-11-13): with something playing, the dock offered
  // the English reading over a chapter shown in a downloaded Bible (a Russian
  // page, read in English) and over a licensed translation, where the pill it
  // stands in for offers none. What a reader would notice: Listen on a Russian
  // page starting an English voice.
  it("keeps the pill's rule for Listen: none over a page the English reading does not read", () => {
    expect(PILL).toMatch(/<ReaderDock\s+slug=\{slug\}\s+chapter=\{chapter\}\s+bookName=\{bookName\}\s+listen=\{listen\}/);
    expect(DOCK).toMatch(/export function ReaderDock\(\{\s*slug,\s*chapter,\s*bookName,\s*listen = true,/);
    expect(DOCK).toMatch(/\{listenHere \? \(\s*<button/);
  });

  it("opens the one sleep timer, the sheet Now Playing opens", () => {
    expect(DOCK).toContain("<SleepTimerSheet open={sleepOpen} onClose={() => setSleepOpen(false)} />");
    expect(read("components/player/NowPlayingSheet.tsx")).toContain(
      '<SleepTimerSheet open={sleepMenu} onClose={() => setSleepMenu(false)} layer="over-player" />',
    );
  });
});

describe("the dock's drawing (app/globals.css)", () => {
  it("is a card of 112px at rest (taller when a long name sends the chapter's controls down a line), which draws in to a pill of 52px while the reader reads on and in focus mode", () => {
    expect(rule(".reader-dock")).toContain("height: var(--reader-dock-card-h, 112px);");
    const drawn = rule("body[data-reader-away] .reader-dock,\nhtml.reader-focus .reader-dock");
    expect(drawn).toContain("width: var(--reader-dock-pill-w, 10rem);");
    expect(drawn).toContain("height: 52px;");
  });

  it("keeps the card while the keyboard is on one of its controls", () => {
    expect(CSS).toContain("body[data-reader-away] .reader-dock:has(.reader-dock-card :focus-visible) {");
  });

  it("keeps the plates while it plays, and the chapter comes to the top between them", () => {
    expect(rule("html.has-reader-dock body[data-reader-away] [data-mobile-topbar][data-plates] [data-plates-row]")).toContain("visibility: visible;");
    expect(rule("body[data-reader-away] [data-dock-title]")).toContain("visibility: visible;");
  });

  it("keeps the card's room at the reader's foot: the card's height (112px at rest) less the pill's 56px", () => {
    expect(PILL).toContain('"flex h-14 min-w-0');
    expect(rule("html.has-reader-dock")).toContain("--reader-dock-room: calc(var(--reader-dock-card-h, 112px) - 56px);");
    expect(rule("html.is-native .safe-pb-reader")).toContain("var(--reader-dock-room, 0px)");
  });

  it("lifts the way out of focus over the pill, as it would over the mini player", () => {
    const focus = rule("html.reader-focus.has-reader-dock");
    expect(focus).toContain("--now-playing-h: 64px;");
    expect(focus).toContain("--reader-dock-room: 0px;");
  });

  it("does not move for a reader who asked for less motion", () => {
    const quiet = CSS.slice(CSS.indexOf(':where([data-motion="reduce"]) .reader-dock,'));
    expect(quiet.slice(0, quiet.indexOf("}"))).toContain("transition: none;");
  });
});
