import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// The owner's picks of 2026-10-27, held as source, since vitest runs without
// a DOM (vitest.config.ts):
//
//  - round 8, the player: "Keep the two separate, as in John 1 without the
//    lyrics and John 1 with the lyrics. Don't merge the two and add the
//    photo." Two views, switched like the saint web, and every control the
//    player has in both;
//  - round 9 A, a chant's page, "Sing along": the words move with the
//    singing on the page itself, the recording's language below them;
//  - both lit by one clock (lib/player/clock.ts), so they never disagree.

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Now Playing: the cover and the words, never merged", () => {
  const src = read("components/player/NowPlayingSheet.tsx");
  const at = (marker: string) => {
    const i = src.indexOf(marker);
    expect(i, marker).toBeGreaterThan(-1);
    return i;
  };
  const cover = src.slice(at('id="player-view-panel-cover"'), at('id="player-view-panel-words"'));
  const words = src.slice(at('id="player-view-panel-words"'), at("One block for both views"));
  const block = src.slice(at("One block for both views"));

  it("draws the cover large, with no words", () => {
    expect(cover).toContain("size={340}");
    expect(cover).not.toContain("<LiveCaptions");
  });

  it("draws the words with only a small picture at their head", () => {
    expect(words).toContain("<LiveCaptions");
    expect(words).toContain("size={48}");
    expect(words).not.toContain("size={340}");
  });

  it("keeps every control in one block under both views", () => {
    for (const control of ["<PositionBar", "<PlayerTransport", "setLoopMode(", 'variant="option"', "setSleepMenu(true)", "<SaveOfflineNote"]) {
      expect(block, control).toContain(control);
      expect(cover, control).not.toContain(control);
      expect(words, control).not.toContain(control);
    }
  });

  // 1.8, what round 8 A drew and the first build left out (the owner's "add
  // everything we left out", 2026-10-28): previous and next, Speed, Read and
  // •••, with every control the player had where it was.
  it("keeps the choices in their order, Speed and Read added: Loop, Speed, Ambience, the sleep timer, Read", () => {
    const row = block.slice(block.indexOf("The choices under the controls"), block.indexOf("<PlayerMoreSheet"));
    const order = ["setLoopMode(", 't("player.speed")', 'variant="option"', "setSleepMenu(true)", 't("player.read")'].map((m) => row.indexOf(m));
    expect(order.every((at) => at > -1), String(order)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Each an even share of one row, so five fit a 360px phone in any language.
    expect(row).toContain('className="mt-5 grid grid-flow-col auto-cols-[minmax(0,1fr)] items-start gap-1"');
    expect(read("components/player/Transport.tsx")).toContain("[overflow-wrap:anywhere] hyphens-auto");
  });

  it("puts ••• at the right of the top bar, opening a sheet over the player", () => {
    const top = src.slice(src.indexOf("Top: put it away"), src.indexOf("The middle: the cover, or the words"));
    expect(top).toMatch(/onClick=\{\(\) => setMoreMenu\(true\)\}\s*aria-label=\{t\("bible\.moreActions"\)\}\s*aria-haspopup="dialog"/);
    expect(top).toContain("<More size={20} />");
    expect(top).not.toContain('<span className="h-11 w-11 shrink-0" aria-hidden />');
    // A sheet over the player: Escape and the back button are its own.
    expect(src).toContain("const covered = sleepMenu || moreMenu || (ambienceSheet.open && ambienceSheet.overPlayer);");
  });

  it("holds in ••• what the player does that has no button in that corner, and Share", () => {
    const more = read("components/player/PlayerMore.tsx");
    const rows = ["<SaveOfflineRow", 't("player.sleep")', 't("ambience.title")', 't("common.share")'].map((m) => more.indexOf(m));
    expect(rows.every((at) => at > -1), String(rows)).toBe(true);
    expect([...rows].sort((a, b) => a - b)).toEqual(rows);
    expect(more).toContain('<Sheet open={open} onClose={onClose} title={title} desktop layer="over-player">');
    // It goes first when a row opens another sheet.
    expect(more).toMatch(/onClose\(\);\s*onSleep\(\);/);
    expect(more).toMatch(/onClose\(\);\s*openAmbience\(\{ overPlayer: true \}\);/);
    expect(read("components/player/SaveOffline.tsx")).toMatch(/onLeave\(\);\s*void save\(\);/);
  });

  it("switches in the top bar, and remembers the choice", () => {
    expect(src).toContain("<BarSwitch");
    expect(src).toContain('t("player.viewCover")');
    expect(src).toContain('t("player.viewWords")');
    expect(src).toContain("onSelect={setPlayerView}");
  });
});

describe("one clock for every place the words are lit", () => {
  it("lights Now Playing's words and a chant's Sing along from the same lines and clock", () => {
    expect(read("components/player/NowPlayingSheet.tsx")).toContain("useSungLines(audio.captions");
    expect(read("components/chants/ChantWords.tsx")).toContain("useSungLines(source");
    const captions = read("components/player/LiveCaptions.tsx");
    expect(captions).toContain("subscribeClock(");
    expect(captions).toContain("clockNow()");
    // Nothing paints from the snapshot's quarter-second position any more.
    expect(captions).not.toContain("currentTimeNow");
  });
});

describe("a chant's page sings along itself (round 9 A)", () => {
  const page = read("components/chants/ChantPage.tsx");

  it("keeps Play on the page rather than opening Now Playing over it", () => {
    const own = page.slice(page.indexOf("const play = useChantPlay({"), page.indexOf("});", page.indexOf("const play = useChantPlay({")));
    expect(own).toContain("open: false");
    expect(page).toMatch(/<ChantVersions[\s\S]*?open=\{false\}/);
  });

  it("draws the words, then the recording's language, then the controls", () => {
    const words = page.indexOf("<ChantWords variant");
    const languages = page.indexOf('role="radiogroup"');
    const controls = page.indexOf("<ChantTransport");
    expect(words).toBeGreaterThan(-1);
    expect(languages).toBeGreaterThan(words);
    expect(controls).toBeGreaterThan(languages);
  });
});
