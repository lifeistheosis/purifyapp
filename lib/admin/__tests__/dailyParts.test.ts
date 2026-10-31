import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Bars, Est, FigureCard, Segmented, Spark, TrendLine } from "@/components/admin/daily/parts";

// The parts the Daily pages are built from (sheet r3-15), and the promise of
// the sheet's sixth part: "The picks in Light" are the same structure with
// the palette swapped, so every colour these pages use must be a token the
// Light palette redefines, never a literal.

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const DAILY_FILES = [
  "components/admin/AdminShell.tsx",
  "components/admin/AdminMobileNav.tsx",
  "components/admin/daily/parts.tsx",
  "components/admin/map/HeatMap.tsx",
  "components/admin/tabs/HomeTab.tsx",
  "components/admin/tabs/TrafficViews.tsx",
  "components/admin/tabs/MoneyOverviewTab.tsx",
  "components/admin/tabs/ReadersTab.tsx",
  "components/admin/tabs/ReaderCard.tsx",
  "components/admin/tabs/CartsTab.tsx",
];

describe("the Daily pages in both palettes", () => {
  it("colour everything through the admin's tokens, so Light swaps them all", () => {
    for (const f of DAILY_FILES) {
      const src = read(f).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(src.match(/#[0-9a-fA-F]{3,8}\b(?![\w-])/g), `${f} carries a colour literal`).toBeNull();
      expect(src.match(/\brgba?\(/g), `${f} carries an rgb() literal`).toBeNull();
    }
  });

  it("run the heat map the other way in Light, more readers darker", () => {
    const css = read("app/admin/admin-theme.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const block = (sel: string) => {
      const at = css.indexOf(sel);
      return css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
    };
    const grey = (b: string, name: string) => {
      const m = new RegExp(`${name}:\\s*#([0-9a-f]{6})`, "i").exec(b);
      expect(m, name).not.toBeNull();
      return parseInt(m![1].slice(0, 2), 16);
    };
    const dark = block(".adm {");
    const light = block(':root[data-adm-theme="light"] .adm {');
    for (let i = 1; i <= 5; i++) {
      expect(grey(dark, `--adm-heat-${i}`), `dark step ${i}`).toBeGreaterThan(grey(dark, `--adm-heat-${i - 1}`));
      expect(grey(light, `--adm-heat-${i}`), `light step ${i}`).toBeLessThan(grey(light, `--adm-heat-${i - 1}`));
    }
    // The lit thing glows in Dark and is a solid edge with a soft shadow in Light.
    expect(dark).toMatch(/--adm-glow:\s*drop-shadow/);
    expect(light).toMatch(/--adm-glow:\s*none/);
    expect(light).toMatch(/--adm-lit:\s*0 0 0 1px #0a0a0a/);
  });
});

describe("the parts", () => {
  it("draw the switch with the chosen segment pressed", () => {
    const html = renderToStaticMarkup(
      createElement(Segmented, {
        label: "Period",
        options: [
          ["now", "Now"],
          ["1d", "Today"],
        ] as const,
        value: "1d",
        onChange: () => {},
      }),
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Period"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Today</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Now</);
  });

  it("mark an estimate with a dashed line and the word", () => {
    const html = renderToStaticMarkup(createElement(Est, null, "$5,450"));
    expect(html).toContain('class="adm-est"');
    expect(html).toContain("est.");
  });

  it("light a figure, mark a live one, and blur money under streamer mode", () => {
    const html = renderToStaticMarkup(
      createElement(FigureCard, { label: "On the site now", value: "37", sub: "in the last 90 seconds", live: true, lit: true }),
    );
    expect(html).toContain("adm-live-dot");
    expect(html).toContain("data-lit");
    const money = renderToStaticMarkup(createElement(FigureCard, { label: "Revenue today", value: "$96", sub: "", sensitive: true }));
    expect(money).toContain("adm-sensitive");
  });

  it("set a word, not a figure, when there is no number", () => {
    const html = renderToStaticMarkup(createElement(FigureCard, { label: "Visitors today", value: "Not measured", sub: "", unread: true }));
    expect(html).not.toContain("adm-fig");
    expect(html).toContain("Not measured");
  });

  it("light only the first bar, and fill each by its share of the largest", () => {
    const html = renderToStaticMarkup(
      createElement(Bars, {
        rows: [
          { key: "us", label: "United States", value: 310 },
          { key: "ro", label: "Romania", value: 155 },
        ],
      }),
    );
    expect(html.match(/data-lit/g)?.length).toBe(1);
    expect(html).toContain("width:100.0%");
    expect(html).toContain("width:50.0%");
  });

  it("draw a line only when there are two points to draw it between", () => {
    expect(renderToStaticMarkup(createElement(Spark, { values: [3], label: "x" }))).not.toContain("<path");
    expect(renderToStaticMarkup(createElement(Spark, { values: [1, 2, 3], label: "x" }))).toContain("<path");
    const trend = renderToStaticMarkup(createElement(TrendLine, { values: [1, 4, 2], before: [2, 2, 2], marks: ["Oct 1", "Oct 15", "today"], label: "Visitors" }));
    expect(trend).toContain('stroke-dasharray="4 4"');
    expect(trend).toContain("today");
  });
});
