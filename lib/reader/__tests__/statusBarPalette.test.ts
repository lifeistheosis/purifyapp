import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The phone's status bar follows the reading palette (barColor in
 * components/native/NativeBridge.tsx): black on True black, the night colour
 * on every other palette. It hears of a change through the event ReaderPrefs
 * broadcasts, and each file keeps its own copy of that event's name. Nothing
 * else would notice if the two drifted apart: the bar would stop turning
 * black until the next launch, and no screen would say why.
 */
describe("the status bar follows the palette", () => {
  const bridge = readFileSync("components/native/NativeBridge.tsx", "utf8");
  const prefs = readFileSync("components/reader/ReaderPrefs.tsx", "utf8");

  it("listens for the event ReaderPrefs really sends, and stops listening", () => {
    const sent = /const PREFS_EVENT = "([^"]+)"/.exec(prefs)?.[1];
    expect(sent).toBeTruthy();
    expect(prefs).toContain("window.dispatchEvent(new CustomEvent(PREFS_EVENT))");
    expect(bridge).toContain(`window.addEventListener("${sent}", paintBar)`);
    expect(bridge).toContain(`window.removeEventListener("${sent}", paintBar)`);
  });

  it("paints black for True black and the night colour otherwise", () => {
    expect(bridge).toContain('const BLACK = "#000000"');
    expect(bridge).toMatch(/coerceReadingTheme\(raw\) === "black" \? BLACK : NIGHT/);
  });
});
