// Pages that fetch arrive in their shape (cause 7 of the gate, Updates 18 Open
// 3; the arbiter's call of 22:41 on 2026-11-13: the house's own skeleton is a
// fault fix, not a new look).
//
// A Father's work in the apps reads its text from the bundle as the page opens
// (components/saints/LazyWritingReader.tsx). Until it landed the page drew an
// empty box, so the switch into a work showed the plates over nothing for a
// quarter of a second and more (the gate's reduced walk: 214 to 309ms, "nothing
// drawn where the screen changes"), and then the head and the words at once.
// Now it stands in its own outline: the head where WorkHead stands it, in the
// head's own type, and the first lines in the words' column.
//
// The shop's piece is read on the device by the address's ?slug=, so the page
// in the bundle is its Suspense fallback until then, and that fallback was null.
// Now it is the piece's own outline, the one it shows while it is fetched.
//
// The gate's walk with motion on found two more things, held here too: the
// work's outline came in as a cascade, which waits out the page switch and then
// lets its lines in one by one, so a switch into a long work stood empty for
// most of a second; and the piece took its outline's place in one frame, a cut.
// Both outlines now stand whole as the page arrives and dissolve over what
// replaces them, as a route's outline does (lib/ui/outlineLeave.ts).

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/saints/writingClient", () => ({ fetchWriting: () => new Promise(() => {}) }));
vi.mock("@/lib/ui/lastInput", () => ({ watchInput: () => {} }));
vi.mock("@/components/saints/WritingReader", () => ({ WritingReader: () => createElement("article", { "data-work-reader": "" }) }));
vi.mock("@/components/i18n/MessagesProvider", () => ({ useTranslate: () => ({ t: (k: string) => k, tn: (k: string) => k, locale: "en" }) }));

const code = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

/** The class list of the first element in `html` carrying `marker`. */
function classesAt(html: string, marker: string): string[] {
  const at = html.indexOf(marker);
  expect(at, `${marker} is drawn`).toBeGreaterThanOrEqual(0);
  const open = html.lastIndexOf("<", at);
  const tag = html.slice(open, html.indexOf(">", at) + 1);
  return /class="([^"]*)"/.exec(tag)?.[1].split(/\s+/) ?? [];
}

async function workBeforeItsText(): Promise<string> {
  const { LazyWritingReader } = await import("@/components/saints/LazyWritingReader");
  const saint = { slug: "gregory-the-dialogist", name: "St. Gregory the Great" } as Parameters<typeof LazyWritingReader>[0]["saint"];
  return renderToStaticMarkup(createElement(LazyWritingReader, { saint, work: "morals-on-the-book-of-job" }));
}

describe("a Father's work in the apps, before its text has come", () => {
  it("draws the house's outline, not an empty box", async () => {
    const html = await workBeforeItsText();
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("data-work-outline");
    // The head's two bars and the lines of the text, the house's own skeleton.
    const bars = html.match(/class="sk sk-(strong|mid|faint)/g) ?? [];
    expect(bars.length).toBeGreaterThanOrEqual(5);
    expect(html).not.toMatch(/<div aria-busy="true" class="min-h-\[70vh\]"><\/div>/);
  });

  it("stands in the reader's column, at the reader's size and font", async () => {
    const html = await workBeforeItsText();
    const reader = code("components/saints/WritingReader.tsx");
    // The article's own padding and type (WritingReader: pb-24 safe-pb-reader, FONT_CLASSES, SIZE_CLASSES).
    expect(reader).toMatch(/className=\{`pb-24 safe-pb-reader \$\{FONT_CLASSES\[font\]\} \$\{SIZE_CLASSES\[size\]\}`\}/);
    const outer = classesAt(html, "data-work-outline");
    for (const c of ["pb-24", "safe-pb-reader", "font-serif", "leading-[1.6]"]) expect(outer, c).toContain(c);
    // The chapter's column (WritingReader's section: mx-auto w-full max-w-[680px]).
    expect(reader).toMatch(/className="mx-auto w-full max-w-\[680px\] scroll-mt-24"/);
    expect(html).toMatch(/class="mx-auto min-h-\[70vh\] w-full max-w-\[680px\]"/);
  });

  it("sets the head's lines in WorkHead's own type, so its words come where the bars stood", async () => {
    const html = await workBeforeItsText();
    const head = code("components/saints/WorkHead.tsx");
    // WorkHead: the header's foot, the name's size and leading, the chapter's line, the rule.
    expect(head).toContain('className="mb-5 text-center"');
    expect(head).toMatch(/leading-\[1\.08\][^"]*"/);
    expect(head).toContain('"text-[40px] min-[380px]:text-[44px]"');
    expect(head).toContain("mt-1.5 block font-sans text-ui");
    expect(head).toContain("mt-5 block h-px w-7 bg-paper/25");
    expect(html).toContain('class="mb-5 text-center"');
    expect(html).toContain('class="relative block font-heading text-[40px] leading-[1.08] min-[380px]:text-[44px]"');
    expect(html).toContain('class="relative mt-1.5 block font-sans text-ui"');
    expect(html).toContain('class="mx-auto mt-5 block h-px w-7 bg-paper/25"');
    // Each line holds its own line box (an empty line in that type), with the bar laid in it,
    // centred without a transform (nothing that could read as moving on the still path).
    expect(html).toMatch(/text-\[44px\]"> <div class="sk sk-strong absolute inset-0 m-auto/);
    expect(html).toMatch(/text-ui"> <div class="sk sk-mid absolute inset-0 m-auto/);
  });
});

describe("both outlines, as the page arrives and as they leave", () => {
  it("the work's outline stands whole: its lines are not a cascade, which waits out the switch", async () => {
    const html = await workBeforeItsText();
    const outline = html.slice(html.indexOf("data-work-outline"));
    expect(outline).not.toMatch(/class="cascade/);
    expect((outline.match(/class="sk sk-faint sk-line/g) ?? []).length).toBe(9);
  });

  for (const [rel, name] of [
    ["components/saints/LazyWritingReader.tsx", "WorkOutline"],
    ["components/shop/ShopStates.tsx", "ShopDetailSkeleton"],
  ] as const) {
    it(`${name} dissolves over what replaces it, from its own layout effect's cleanup`, () => {
      const src = code(rel);
      const body = src.slice(src.indexOf(`export function ${name}(`));
      expect(src).toContain('import { outlineLeft } from "@/lib/ui/outlineLeave";');
      expect(body).toMatch(/useIsoLayoutEffect\(\(\) => \{\s*const el = outline\.current;\s*return \(\) => \{\s*if \(el\) outlineLeft\(el\);/);
      expect(body).toMatch(/<div ref=\{outline\}/);
    });
  }
});

describe("the shop's piece, before the device has read its address", () => {
  it("is the piece's own outline, not nothing", async () => {
    const page = code("app/(app)/shop/icons/detail/page.tsx");
    expect(page).not.toMatch(/<Suspense fallback=\{null\}>/);
    expect(page).toMatch(/<Suspense fallback=\{<ShopDetailSkeleton \/>\}>/);
    // The same outline the piece shows while it is fetched (components/shop/ProductDetailClient.tsx),
    // there with the picture a list already read, which the card's picture is carried into (Updates 38).
    expect(code("components/shop/ProductDetailClient.tsx")).toMatch(/if \(loading\) \{\s*return <ShopDetailSkeleton picture=\{peekPiecePicture\(slug\)\} carry=\{pieceCarry\(slug\)\} \/>;/);
    const { ShopDetailSkeleton } = await import("@/components/shop/ShopStates");
    const html = renderToStaticMarkup(createElement(ShopDetailSkeleton));
    expect((html.match(/class="sk /g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});

// The gate's walk with motion on, on the export of 2a273a46 (Updates 37): the
// outline now stood whole and dissolved, and then the page stood empty for 256
// to 699ms. A page that opens like a book waits for the route's own fade
// before its head rises (260ms) and keeps its words a fifth of a second behind
// the head (220ms more). Behind an outline there is no fade to wait for, and
// the outline is gone in DISSOLVE_MS: the head arrived over an emptied page,
// and a work opened at a passage glided down to it with no words on it at all.
describe("behind an outline that is going, the page's entrances begin with its dissolve", () => {
  const css = code("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
  /** The declarations of the rule said exactly so. */
  const rule = (selector: string) => {
    const at = css.indexOf(`\n${selector} {`);
    return at < 0 ? null : css.slice(at, css.indexOf("}", at));
  };
  const ms = (name: string) => Number(new RegExp(`${name}:\\s*(\\d+)ms`).exec(css)?.[1] ?? NaN);
  /** A delay as the stylesheet writes it, in ms: the sum of its terms, with the first line's --line of 0. */
  const delayOf = (expr: string, start: number) => {
    const plain = expr
      .replace(/var\(--(page-open-start|saint-head-start), \d+ms\)/g, `${start}ms`)
      .replace(/var\(--(line|i), 0\) \* var\(--[\w-]+\)/g, "0ms")
      .replace(/^calc\(|\)$/g, "");
    return plain.split("+").reduce((sum, term) => sum + Number(/^\s*(-?\d+)ms\s*$/.exec(term)?.[1] ?? NaN), 0);
  };
  /** When a part of the page begins, behind an outline that is going. */
  const startsAfterOutline = (selector: string, startVar: string) => {
    const own = rule(`.route-fade[data-after-outline] ${selector}`);
    const ownDelay = own ? /animation-delay:\s*([^;]+);/.exec(own)?.[1] : undefined;
    if (ownDelay) return delayOf(ownDelay.trim(), 0);
    const base = /animation-delay:\s*([^;]+);/.exec(rule(selector) ?? "")?.[1] ?? "";
    const lifted = [...css.matchAll(/\n\.route-fade\[data-after-outline\] ([^{\n]+) \{([^}]*)\}/g)].find((m) => m[1].includes(selector.split(" ")[0]) && m[2].includes(`${startVar}: 0ms;`));
    return delayOf(base.trim(), lifted ? 0 : ms("--duration-route-enter"));
  };

  it("every entrance that waits for the route's fade is lifted behind an outline, said after the wait", () => {
    const waits = [...css.matchAll(/\n(\.route-fade [^{\n]+) \{\s*(--[\w-]+): var\(--duration-route-enter\);\s*\}/g)].map((m) => ({ selector: m[1], name: m[2] }));
    expect(waits.map((w) => w.name).sort()).toEqual(["--cascade-start", "--page-open-start", "--saint-head-start"]);
    for (const { selector, name } of waits) {
      const after = selector.replace(/^\.route-fade /, ".route-fade[data-after-outline] ");
      expect(css.indexOf(`\n${after} {`), after).toBeGreaterThan(css.indexOf(`\n${selector} {`));
      expect(rule(after), after).toMatch(new RegExp(`${name}: 0ms;`));
    }
  });

  it("a page that opens like a book: its head and its words begin while the outline is still dissolving, the words at its first frame", async () => {
    const { DISSOLVE_MS } = await import("@/lib/ui/outlineLeave");
    const parts = [".page-open-title", ".page-open-sub", ".page-open-rule", ".page-open-after", ".page-open-words > :nth-child(-n + 8)"];
    const starts = Object.fromEntries(parts.map((p) => [p, startsAfterOutline(p, "--page-open-start")]));
    for (const p of parts) {
      expect(Number.isFinite(starts[p]), p).toBe(true);
      expect(starts[p], `${p} begins ${starts[p]}ms after the outline starts to go`).toBeLessThan(DISSOLVE_MS);
    }
    // The words, a Father's work's (page-open-after) and the chapter's first line (page-open-words), at once.
    expect(starts[".page-open-after"]).toBe(0);
    expect(starts[".page-open-words > :nth-child(-n + 8)"]).toBe(0);
    // A saint's head too: its first step at once.
    expect(startsAfterOutline(".saint-head-in", "--saint-head-start")).toBe(0);
  });

  it("with motion off nothing changes: the page is simply there", () => {
    for (const p of [".page-open-after", ".page-open-words > :nth-child(-n + 8)", ".saint-head-in"]) {
      expect(css, p).toContain(`:where([data-motion="reduce"]) ${p}`);
    }
  });
});
