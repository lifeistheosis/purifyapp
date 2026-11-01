// Community's responses, as the owner picked them on r3-30 and r3-30b (note 80
// of build 86: "it moves the whole UI when you click on the guy with his
// hands up ... maybe change the widget photo"): the lit candle in the row in
// place of the praying figure, and one tap opening a tray over the row, drawn
// at the top of the page so nothing under the row moves. No figures on
// prayer: no count beside the candle and none in the tray. The arithmetic of
// where the tray stands is held in responses.test.ts; this holds the rest
// together, in the source, the stylesheet and the catalogs. The walk measures
// the row and the next post on the built app (scripts/export-walk.mjs, 49).

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
const buttons = read("components/community/ResponseButtons.tsx");
const raw = read("app/globals.css");
const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every body of a rule whose selector list is exactly `selector`, together. */
function bodies(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[{};])\\s*${escaped}\\s*\\{([^}]*)\\}`, "g");
  return [...css.matchAll(re)].map((m) => m[2]).join("\n");
}

describe("the row's mark", () => {
  it("is the lit candle, where the praying figure was", () => {
    expect(buttons).toContain('import { Candle } from "@/components/ui/icons/Candle";');
    expect(buttons).toContain("<Candle size={compact ? 13 : 16} />");
    expect(buttons).not.toMatch(/Orans/);
  });

  it("leaves the praying figure where it is used elsewhere", () => {
    for (const file of [
      "components/community/PrayerWall.tsx",
      "app/(app)/prayers/page.tsx",
      "components/search/SearchRows.tsx",
    ]) {
      expect(read(file), file).toContain('import { Orans } from "@/components/ui/icons/Orans";');
    }
  });

  it("is drawn from Lampada's candle, on the app's 24 grid with its 1.6 stroke and round ends", () => {
    const candle = read("components/ui/icons/Candle.tsx");
    for (const part of ['viewBox="0 0 24 24"', "strokeWidth={1.6}", 'strokeLinecap="round"', 'strokeLinejoin="round"', 'aria-hidden="true"']) {
      expect(candle).toContain(part);
    }
    // One drawing: the candle takes Lampada's own paths, as the profile's candle frame does.
    expect(candle).toContain('import { LAMPADA_PATHS } from "./Lampada";');
    expect(candle).toContain("<path d={LAMPADA_PATHS.flame} fill=\"currentColor\" />");
    const used = [...candle.matchAll(/<path d=\{LAMPADA_PATHS\.(\w+)\}/g)].map((m) => m[1]);
    expect(used).toEqual(["flame", "wick", "taper", "ground"]);
    expect(read("components/ui/icons/Lampada.tsx")).toMatch(/export const LAMPADA_PATHS = \{\n  flame: "M12 2\.8 /);
  });

  it("lights once the reader has answered, and while its tray is open", () => {
    expect(buttons).toMatch(/const lit = choosing \|\| answered\(shown\.mine\);/);
    expect(buttons).toMatch(/lit \? "community-lit text-paper" : "text-paper\/60 hover:text-paper"/);
  });

  it("carries a label of its own in every language", () => {
    expect(buttons).toContain('t("community.respondCandle")');
    expect(buttons).not.toContain("community.respondClose");
  });
});

describe("the tray", () => {
  it("is drawn at the top of the page, fixed over the candle, never inside the post", () => {
    // A post is content-visibility: auto, which clips what spills out of it.
    expect(buttons).toMatch(/createPortal\(\s*<div/);
    expect(buttons).toMatch(/document\.body,\s*\)/);
    expect(buttons).toMatch(/"community-tray fixed z-\[95\]/);
    // Placed before paint from the candle and its own size.
    expect(buttons).toMatch(/useLayoutEffect\(\(\) => \{\s*if \(!tray \|\| tray\.place\) return;/);
    expect(buttons).toContain("trayPlace(box, { width: el.offsetWidth, height: el.offsetHeight }, screen, TRAY_GAP[size])");
  });

  it("closes on a choice, a tap anywhere else, Escape and a scroll", () => {
    expect(buttons).toContain('document.addEventListener("pointerdown", onDown);');
    expect(buttons).toContain('window.addEventListener("scroll", onScroll, true);');
    expect(buttons).toContain('if (e.key !== "Escape") return;');
    const press = buttons.slice(buttons.indexOf("async function press("), buttons.indexOf("const label ="));
    expect(press).toContain("setTray(null);");
  });

  it("offers the three, each a toggle, the reader's own lit", () => {
    expect(buttons).toContain("RESPONSE_KINDS.map((k, i) =>");
    expect(buttons).toContain("aria-pressed={held}");
    expect(buttons).toContain('held && "community-lit"');
  });

  it("draws no figure: no count beside the candle, none in the tray", () => {
    // The totals still come from the server and are kept; nothing draws them.
    expect(buttons).not.toMatch(/\.counts\[/);
    expect(buttons).not.toMatch(/tabular-nums/);
    // The like is not prayer, and keeps its count.
    expect(read("components/community/ReactionButtons.tsx")).toContain('<span className="tabular-nums">{counts.like}</span>');
  });

  it("is measured on the built app: the row and the next post, before and after the tap", () => {
    const walk = read("scripts/export-walk.mjs");
    const at = walk.indexOf("await section(49,");
    expect(at).toBeGreaterThan(-1);
    const own = walk.slice(at);
    expect(own).toContain("must(moved(before, during) < 0.5,");
    expect(own).toContain("must(moved(choosing, answered) < 0.5");
    expect(own).toContain('const spot = placed(small, 9);');
  });

  it("is one size smaller over a reply", () => {
    expect(buttons).toMatch(/compact \? "min-h-\[42px\] rounded-\[14px\] px-1 py-\[3px\]" : "min-h-\[50px\] rounded-\[17px\] px-\[5px\] py-1"/);
    expect(bodies('.community-tray[data-response-tray="reply"]')).toMatch(/--tray-caret:\s*11px;/);
    expect(bodies(".community-tray")).toMatch(/--tray-caret:\s*13px;/);
  });
});

describe("the tray's look", () => {
  const block = (() => {
    const start = raw.indexOf("/* ── Community: Pray together and Talk together (1.8)");
    expect(start).toBeGreaterThan(-1);
    return raw.slice(start, raw.indexOf("/* Route entrance.", start));
  })();

  it("sits with Community's own CSS", () => {
    expect(block).toContain(".community-tray {");
    expect(block).toContain('html[data-reading-mode="parchment"] .community-tray-choice {');
  });

  it("is a raised surface on the page's own ground, with its caret on the candle", () => {
    const tray = bodies(".community-tray");
    expect(tray).toMatch(/background-color:\s*var\(--color-night-soft\);/);
    expect(tray).toMatch(/border-color:\s*color-mix\(in srgb, var\(--color-paper\) 14%, transparent\);/);
    const caret = bodies(".community-tray::after");
    expect(caret).toMatch(/left:\s*calc\(var\(--caret, 50%\) - var\(--tray-caret\) \/ 2 - 1px\);/);
    expect(caret).toMatch(/transform:\s*rotate\(45deg\);/);
    // Its face is the tray's own ground where the two join.
    expect(caret).toMatch(/background-color:\s*var\(--color-night-soft\);/);
    // Under the row, it points up.
    expect(bodies(".community-tray[data-below]::after")).toMatch(/top:\s*calc\(var\(--tray-caret\) \/ -2\);\s*bottom:\s*auto;/);
  });

  it("rises out of the candle with the house ease, and with motion off is simply there", () => {
    expect(css).toMatch(/@keyframes community-tray-in \{\s*from \{\s*opacity: 0;\s*transform: translateY\(var\(--tray-rise\)\) scale\(0\.94\);\s*\}\s*\}/);
    expect(bodies(".community-tray[data-placed]")).toMatch(/animation:\s*community-tray-in 180ms var\(--ease-house\) backwards;/);
    expect(bodies(':where([data-motion="reduce"]) .community-tray[data-placed]')).toMatch(/animation:\s*none;/);
  });

  it("is paper on paper on Parchment, with no glow", () => {
    expect(css).toMatch(
      /html\[data-reading-mode="parchment"\] \.community-tray,\s*html\[data-reading-mode="parchment"\] \.community-tray::after \{\s*border-color: rgb\(43 35 23 \/ 0\.16\);\s*background-color: #fbf6ea;\s*background-image: none;/,
    );
    // The held word's glow goes out with every other light on paper.
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] :is\([^)]*\.community-lit[,)]/);
  });

  // The words on the tray, worked out on each palette from its own tokens:
  // a word at 14px needs 4.5 to 1, and the reader's own must stand out more.
  type Rgb = [number, number, number];
  const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
  const over = (c: Rgb, a: number, g: Rgb): Rgb => c.map((v, i) => v * a + g[i] * (1 - a)) as Rgb;
  const lum = (c: Rgb) => {
    const ch = (v: number) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
  };
  const contrast = (a: Rgb, b: Rgb) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  /** The custom properties of every rule whose selector is exactly `selector`, merged. */
  const tokens = (selector: string) => {
    const out: Record<string, string> = {};
    for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
      for (const d of m[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) out[d[1]] = d[2].trim();
    }
    return out;
  };
  const dark = tokens("@theme");

  it.each([
    ["Dark", "@theme"],
    ["True black", 'html[data-reading-mode="black"]'],
    ["Candlelight", 'html[data-reading-mode="candlelight"]'],
    ["Monastery", 'html[data-reading-mode="monastery"]'],
  ])("reads on %s", (_, selector) => {
    const t = { ...dark, ...tokens(selector) };
    const ground = hex(t["--color-night-soft"]);
    const paper = hex(t["--color-paper"]);
    const rest = contrast(over(paper, 0.88, ground), ground);
    const held = contrast(paper, ground);
    expect(rest).toBeGreaterThanOrEqual(4.5);
    expect(held).toBeGreaterThan(rest);
  });

  it("reads on Parchment", () => {
    expect(bodies('html[data-reading-mode="parchment"] .community-tray-choice')).toMatch(/color:\s*rgb\(43 35 23 \/ 0\.7\);/);
    const ground = hex("#fbf6ea");
    const ink = hex(tokens('html[data-reading-mode="parchment"]')["--color-paper"]);
    const rest = contrast(over(ink, 0.7, ground), ground);
    expect(rest).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ink, ground)).toBeGreaterThan(rest + 5);
  });
});

describe("the candle's label", () => {
  const catalog = (code: string) => JSON.parse(read(`lib/i18n/messages/${code}.json`)) as Record<string, string>;
  const en = catalog("en");

  it.each(LOCALES.map((l) => l.code))("names the three in %s, in the words its catalog already uses", (code) => {
    const words = catalog(code);
    const label = words["community.respondCandle"];
    expect(label).toBeTruthy();
    for (const k of ["amen", "praying", "glory"]) expect(label).toContain(words[`community.respond.${k}`]);
    if (code !== "en") expect(label).not.toBe(en["community.respondCandle"]);
    // The figure's own Close went with it.
    expect(words["community.respondClose"]).toBeUndefined();
  });
});
