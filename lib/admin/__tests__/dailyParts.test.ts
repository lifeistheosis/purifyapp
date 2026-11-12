import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Bars, Est, FigureCard, Segmented, Spark, StackedColumns, TrendLine } from "@/components/admin/daily/parts";

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
  "components/admin/money/MoneyColumnsChart.tsx",
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

  it("let every day on a trend be picked when it is given the days", () => {
    const plain = renderToStaticMarkup(createElement(TrendLine, { values: [1, 4, 2], marks: ["Oct 1", "Oct 2", "today"], label: "Visitors" }));
    expect(plain).not.toContain('role="slider"');
    const days = ["Oct 1", "Oct 2", "Oct 3, so far"];
    const picks = renderToStaticMarkup(
      createElement(TrendLine, { values: [1, 4, 2], days, valueText: (v: number) => `${v} visitors`, marks: ["Oct 1", "Oct 2", "today"], label: "Visitors" }),
    );
    expect(picks).toContain('role="slider"');
    expect(picks).toContain('tabindex="0"');
    expect(picks).toContain('aria-valuemax="2"');
    // At rest a screen reader is told the newest day, as the lit point shows it.
    expect(picks).toContain('aria-valuetext="Oct 3, so far, 2 visitors"');
    // A phone can still scroll the page over it; only a sideways drag picks.
    expect(picks).toContain("touch-action:pan-y");
  });

  // His word, 2026-11-12 about 21:42 UTC: everything to do with money on the
  // chart, "a different color" where it tells its sources apart and "all
  // white" where it does not. Money's chart drew the shop's net alone.
  it("stack each source in its own colour, refunds under the line, and say each in the key and a table", () => {
    const html = renderToStaticMarkup(
      createElement(StackedColumns, {
        series: [
          { key: "shop", label: "Shop", color: "var(--adm-money-shop)" },
          { key: "plus", label: "Plus", color: "var(--adm-money-plus)" },
          { key: "unnamed", label: "Plan not named", color: "var(--adm-money-all)", optional: true },
          { key: "refunds", label: "Refunds", color: "var(--adm-money-back)", below: true, optional: true },
        ],
        values: [
          [4000, 849, 0, 0],
          [1500, 0, 0, 1500],
          [0, 0, 0, 0],
        ],
        before: [900, 0, 100],
        days: ["Nov 1", "Nov 2", "Nov 3, so far"],
        valueText: (v: number) => (v < 0 ? `−$${-v / 100}` : `$${v / 100}`),
        marks: ["Nov 1", "Nov 2", "today"],
        label: "All the money by day",
        from: 1,
      }),
    );
    for (const token of ["--adm-money-shop", "--adm-money-plus", "--adm-money-back"]) expect(html).toContain(`background:var(${token})`);
    // Nothing unnamed this period, so its ink is not drawn and the key leaves it out.
    expect(html).not.toContain("background:var(--adm-money-all)");
    expect(html).not.toMatch(/Plan not named<\/span><span/);
    // The key: each source with its total, refunds as money back.
    expect(html).toMatch(/Shop<\/span><span[^>]*>\$55</);
    expect(html).toMatch(/Refunds<\/span><span[^>]*>−\$15</);
    // Picked by a mouse, a finger or the keys; at rest it says the newest day.
    expect(html).toContain('role="slider"');
    expect(html).toContain('aria-valuetext="Nov 3, so far, $0 net"');
    expect(html).toContain("touch-action:pan-y");
    // The period before, dashed; the days before a source was known, washed.
    expect(html).toContain('stroke-dasharray="4 4"');
    expect(html).toMatch(/width:33\.33\d*%;background:var\(--chart-empty\)/);
    // Every bucket, for a screen reader.
    expect(html).toContain("<caption>All the money by day</caption>");
    expect(html).toContain('<th scope="row">Nov 2</th>');
  });

  it("are what Money's chart is drawn with: all its sources, in their tokens", () => {
    const chart = read("components/admin/money/MoneyColumnsChart.tsx");
    expect(chart).toContain("<StackedColumns");
    for (const token of ["--adm-money-shop", "--adm-money-plus", "--adm-money-box", "--adm-money-all", "--adm-money-back"]) {
      expect(chart).toContain(`var(${token})`);
    }
    const tab = read("components/admin/tabs/MoneyOverviewTab.tsx");
    expect(tab).toContain("<MoneyColumnsChart");
    expect(tab).not.toContain("The shop, net by day");
  });

  // The arbiter, 2026-11-12, on his word that the charts show all the money:
  // Revenue's by-month chart was the shop's net alone, or Stripe's ledger,
  // which holds no Plus bought through a store.
  it("draw Revenue's by-month chart as Money's, all the money for all time", () => {
    const revenue = read("components/admin/tabs/RevenueTab.tsx");
    expect(revenue).toContain("<MoneyColumnsChart");
    expect(revenue).toContain("/api/admin/money?period=all");
    expect(revenue).not.toContain("Shop net revenue · by month");
    expect(revenue).not.toMatch(/<AreaChart/);
  });
});
