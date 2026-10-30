import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Where it happened, the door and the atlas (1.8, the owner's pick C of
// r3-10). The screens are React and vitest here has no DOM (vitest.config.ts),
// so this reads their source and their CSS for what the design asks of them:
// the old sideways strip and range input gone, the atlas a layer over the tab
// bar with its foot at the screen's edge, closed by its button, Escape or
// Android's back, the page behind it held still, and every motion with its
// way out under Purify's motion switch.

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const DOOR = read("components/councils/CouncilMap.tsx");
const ATLAS = read("components/councils/MapAtlas.tsx");
const ENGINE = read("components/councils/atlasEngine.ts");
const CSS = read("app/globals.css");
/** The atlas's own block of app/globals.css, comments and all. */
const BLOCK = CSS.slice(CSS.indexOf("Where it happened: the door and the atlas"), CSS.indexOf("── Gift box"));

describe("the door on the page", () => {
  it("has no sideways strip and no range input any more", () => {
    expect(DOOR).not.toContain('type="range"');
    expect(DOOR).not.toContain("overflow-x-auto");
    expect(DOOR).not.toContain("w-[780px]");
  });

  it("is the map's still with every place, and Move through the years", () => {
    expect(DOOR).toMatch(/className="atlas-door dark-island press-card/);
    expect(DOOR).toContain('aria-haspopup="dialog"');
    expect(DOOR).toMatch(/places\.map\(\(p\) => \(\s*<g key=\{p\.id\}>/);
    expect(DOOR).toContain('t("councils.map.slider")');
  });

  it("keeps the places listed under it, each opening its page", () => {
    expect(DOOR).toMatch(/<PlaceItems items=\{p\.items\} \/>/);
    expect(DOOR).toContain('t("history.map.beyond")');
  });

  it("loads the atlas only when it is first wanted", () => {
    expect(DOOR).toMatch(/dynamic\(\(\) => loadAtlas\(\)\.then\(\(m\) => m\.MapAtlas\), \{ ssr: false \}\)/);
  });
});

describe("the atlas", () => {
  it("is a dark layer over the tab bar, its foot at the screen's edge", () => {
    expect(ATLAS).toMatch(/className="atlas dark-island fixed inset-0 z-\[60\]/);
    expect(ATLAS).toMatch(/className="atlas-panel safe-pb-edge"/);
    expect(ATLAS).not.toMatch(/\bsafe-pb(?!-)\b/);
    expect(ATLAS).toContain("createPortal(");
    expect(ATLAS).toContain('role="dialog"');
    expect(ATLAS).toContain('aria-modal="true"');
  });

  it("holds the page behind it still, and steps the tab bar aside", () => {
    expect(ATLAS).toContain("lockBodyScroll();");
    expect(ATLAS).toContain("unlockBodyScroll();");
    expect(ATLAS).toContain("setOverlayOpen(true);");
  });

  it("closes by its button, Escape, and Android's back", () => {
    expect(ATLAS).toContain('aria-label={t("common.close")}');
    expect(ATLAS).toContain('e.key === "Escape"');
    expect(ATLAS).toContain("useAndroidBack(!closing, close);");
  });

  it("says its words with keys the catalogs already have", () => {
    for (const key of ["prayers.play", "prayers.pause", "common.close", "history.map.beyond"]) expect(ATLAS).toContain(`t("${key}")`);
    expect(ATLAS).toContain('t(eraNameKey(e, "label"))');
    expect(ATLAS).toContain('t(eraNameKey(s.era, "short"))');
  });

  it("is a slider a keyboard and a screen reader can use", () => {
    expect(ATLAS).toContain('role="slider"');
    expect(ATLAS).toContain('aria-orientation="vertical"');
    expect(ENGINE).toContain('setAttribute("aria-valuetext"');
    expect(ENGINE).toMatch(/e\.key === "Enter"/);
  });

  it("asks Purify's motion switch before it moves, and clicks in the hand as the house's rows do", () => {
    expect(ENGINE).toContain("prefersReducedMotion()");
    expect(ENGINE).toContain("handTicks()");
  });
});

describe("the atlas's CSS", () => {
  it("is next to History's own, not at the end of the file", () => {
    expect(BLOCK.length).toBeGreaterThan(1000);
    expect(CSS.indexOf("Where it happened: the door and the atlas")).toBeGreaterThan(CSS.indexOf(".history-scrubber"));
  });

  it("blurs nothing over the moving map", () => {
    expect(BLOCK.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/backdrop-filter|blur\(/);
  });

  it("moves only with the motion on, and has a way out of every motion", () => {
    const rules = BLOCK.replace(/\/\*[\s\S]*?\*\//g, "");
    // Every animation and transition in the block sits under the switch.
    for (const m of rules.matchAll(/([^{}]+)\{([^{}]*(?:animation|transition)\s*:[^{}]*)\}/g)) {
      const selector = m[1].trim();
      if (/data-motion="reduce"/.test(selector)) continue;
      expect(selector, "an animation outside the motion switch").toMatch(/:where\(\[data-motion="full"\]\)/);
    }
    expect(rules).toMatch(/:where\(\[data-motion="reduce"\]\) \.atlas \{\s*animation: none;\s*transition: none;\s*\}/);
    expect(rules).toMatch(/:where\(\[data-motion="reduce"\]\) \.atlas-odo-col,\s*:where\(\[data-motion="reduce"\]\) \.atlas-odo-strip \{\s*transition: none;\s*\}/);
    // Its entrance hands the screen back with no transform held.
    expect(rules).toMatch(/animation: atlas-in 380ms var\(--ease-house\) backwards;/);
  });

  it("makes room for the screen's edge under the wheel, as drawn", () => {
    expect(BLOCK).toMatch(/\.atlas-panel \{[^}]*height: calc\(236px \+ max\(34px, env\(safe-area-inset-bottom, 0px\)\)\)/);
  });
});
