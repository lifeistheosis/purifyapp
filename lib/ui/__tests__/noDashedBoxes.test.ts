import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * No dashed box (the owner's rule of build 93 note 4, "no dashed placeholder
 * boxes"; the pre-build gate's second part; scripts/mock-check.mjs, "dashed").
 *
 * A box with a dashed or dotted edge reads as a place where something is
 * missing. The gate's walk fails one wherever it meets it: a dashed or
 * dotted edge on three sides or more, or round it as an outline. But a walk
 * only meets what it can open, and four stood where none reaches: the
 * profile editor's two "no colour" swatches (an account), an order's row
 * for a checkout not finished (an order), a muted reply's row in a thread (a
 * reader who has muted someone), and the Discord card with nothing playing
 * (a computer). Each is whole-edged now (2026-11-11).
 *
 * So this reads the source instead: every page and component a reader can
 * meet, and the house's stylesheet. A dashed or dotted edge on a box fails
 * here before a walk is ever run, unless it is named below with its reason.
 * A rule on ONE side (the dotted line under a glossed word, a dotted leader
 * to a prayer's length) is a line, not a box, and passes, as it does in the
 * walk. So does a drawing's own dashed stroke (the web of the saints'
 * threads), which is a picture and not an edge.
 *
 * The admin panel and the owner's desk are not read: they wear their own
 * theme, where a dashed line means a warning (app/admin/admin-theme.css).
 *
 * What would go wrong if this broke: an empty-looking dashed frame on a
 * screen nobody's walk opens, found by the owner on a phone.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

/** Every file under `dir` with one of the endings, but the owner's desk and the tests. */
function files(dir: string, endings: string[]): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) => {
    const rel = `${dir}/${d.name}`;
    if (d.isDirectory()) return ["admin", "owner", "__tests__", "node_modules"].includes(d.name) ? [] : files(rel, endings);
    return endings.some((e) => d.name.endsWith(e)) ? [rel] : [];
  });
}

/** The code without its comments, the lines kept where they were. */
const blank = (m: string) => m.replace(/[^\n]/g, " ");
const tsxCode = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:"'`])\/\/.*$/gm, (m, lead: string) => lead + " ".repeat(m.length - lead.length));
const cssCode = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, blank);

type Found = { file: string; line: number; what: string };

/**
 * A dashed or dotted edge in a run of classes is a box unless the same run
 * gives the edge to one side only (`border-b border-dotted`). Pure, for its
 * own check below.
 */
function dashedBoxIn(classes: string): boolean {
  const tokens = classes.split(/\s+/).map((t) => t.split(":").pop() ?? "");
  if (tokens.some((t) => /^outline-(dashed|dotted)$/.test(t))) return true;
  if (!tokens.some((t) => /^border-(dashed|dotted)$/.test(t))) return false;
  const oneSide = tokens.some((t) => /^border-[tblrse](-|$)/.test(t));
  const everySide = tokens.some((t) => /^border(-\d+|-\[[^\]]+\]|-px)?$/.test(t)) || (tokens.some((t) => /^border-x(-|$)/.test(t)) && tokens.some((t) => /^border-y(-|$)/.test(t)));
  return everySide || !oneSide;
}

function inPages(): Found[] {
  const out: Found[] = [];
  for (const file of [...files("app", [".tsx"]), ...files("components", [".tsx"])]) {
    const src = tsxCode(read(file));
    // Runs of classes: every string that names a dashed or dotted edge.
    for (const m of src.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.)*?(?:border|outline)-(?:dashed|dotted)(?:(?!\1)[^\\\n]|\\.)*?)\1/g)) {
      if (dashedBoxIn(m[2])) out.push({ file, line: src.slice(0, m.index).split("\n").length, what: m[2].trim().slice(0, 90) });
    }
    // An edge written as a style.
    for (const m of src.matchAll(/\b(?:border|outline)(?:Style)?\s*:\s*(["'`])[^"'`\n]*\b(?:dashed|dotted)\b[^"'`\n]*\1/g)) {
      out.push({ file, line: src.slice(0, m.index).split("\n").length, what: m[0].slice(0, 90) });
    }
  }
  return out;
}

function inStyles(): Found[] {
  const out: Found[] = [];
  for (const file of [...files("app", [".css"]), ...files("components", [".css"])]) {
    const src = cssCode(read(file));
    // The whole edge or the whole outline: `border-top` and its like are one side, and are lines.
    for (const m of src.matchAll(/(?<![\w-])(?:border|outline)(?:-style)?\s*:[^;{}]*\b(?:dashed|dotted)\b/g)) {
      const open = src.lastIndexOf("{", m.index);
      const from = Math.max(src.lastIndexOf("}", open), src.lastIndexOf(";", open), src.lastIndexOf("{", open - 1)) + 1;
      out.push({ file, line: src.slice(0, m.index).split("\n").length, what: src.slice(from, open).replace(/\s+/g, " ").trim() });
    }
  }
  return out;
}

/** What may stay, by name: the file, what the rule or the run of classes says, and why. */
const MAY_STAY: { file: string; what: string; why: string }[] = [
  {
    file: "app/globals.css",
    what: '.shop-mark[data-state="dashed"]',
    why: "an order's 12px mark for a checkout not finished: one of the marks the owner chose for an order's life (Orders B, r3-16), a sign with a meaning and not an empty box (the arbiter's word, 2026-11-11). The mark says so on itself for the gate's walk (components/shop/OrdersClient.tsx, DASHED_MARK).",
  },
];

describe("a dashed box", () => {
  const found = [...inPages(), ...inStyles()];
  const named = (f: Found) => MAY_STAY.some((ok) => ok.file === f.file && f.what.includes(ok.what));

  it("is told from a line on one side: the reading is not broken", () => {
    expect(dashedBoxIn("block size-full rounded-full border border-dashed border-paper/35")).toBe(true);
    expect(dashedBoxIn("rounded-2xl border border-dashed border-paper/20 px-3 py-2.5")).toBe(true);
    expect(dashedBoxIn("border-[1.5px] border-dotted")).toBe(true);
    // The edge's width given elsewhere (a run beside it): still a box.
    expect(dashedBoxIn("border-dashed border-white/15 bg-[#111214]")).toBe(true);
    expect(dashedBoxIn("md:outline-dashed outline-1")).toBe(true);
    // One side: a line.
    expect(dashedBoxIn("cursor-help border-b border-dotted border-paper/35 bg-transparent")).toBe(false);
    expect(dashedBoxIn("inline-block w-3.5 border-t border-dashed")).toBe(false);
    expect(dashedBoxIn("rounded-full border border-paper/35")).toBe(false);
    // And it read the pages: there are hundreds, and the two lines on one side it must pass are there.
    expect([...files("app", [".tsx"]), ...files("components", [".tsx"])].length).toBeGreaterThan(500);
    expect(read("components/bible/GlossedText.tsx")).toContain("border-b border-dotted");
  });

  it("stands on no page, in no component and in no stylesheet a reader meets, unless named with its reason", () => {
    const unnamed = found.filter((f) => !named(f)).map((f) => `${f.file}:${f.line} ${f.what}`);
    expect(unnamed).toEqual([]);
  });

  it("names nothing that is gone, and gives each a reason", () => {
    for (const ok of MAY_STAY) {
      expect(ok.why.length, ok.what).toBeGreaterThan(40);
      expect(found.some((f) => f.file === ok.file && f.what.includes(ok.what)), `${ok.what} is no longer dashed: take its name off the list`).toBe(true);
    }
  });

  it("is gone from the four places no walk reaches, each with a whole fine edge", () => {
    const editor = read("components/community/profile/ProfileEditor.tsx");
    // No colour: an empty ring in the house's quiet one, once, for both swatches.
    expect(editor).toContain('const NO_COLOUR = "block size-full rounded-full border-[1.5px] border-paper/[0.28]";');
    expect(editor.match(/<span className=\{NO_COLOUR\} \/>/g)).toHaveLength(2);
    expect(read("components/shop/OrdersClient.tsx")).toContain('<li className="flex items-center gap-3 rounded-2xl border border-paper/15 px-3 py-2.5">');
    expect(read("components/desktop/DiscordPreviewCard.tsx")).toContain('request ? "border-white/10 bg-[#1b1c1f]" : "border-white/15 bg-[#111214]",');
    expect(tsxCode(read("components/community/CommunityClient.tsx"))).not.toMatch(/border-dashed|border-dotted/);
  });

  it("lets the one dashed mark say what it is, where a walk would meet it", () => {
    const orders = read("components/shop/OrdersClient.tsx");
    expect(orders).toContain('{...(group.mark === "dashed" ? DASHED_MARK : null)}');
    expect(orders).toMatch(/const DASHED_MARK = \{\s*"data-mock-allow": "dashed",\s*"data-mock-why": "[^"]{40,}",\s*\} as const;/);
    // It is the only mark that can be dashed: one state of one list makes it.
    const story = read("lib/shop/orderStory.ts");
    expect(story.match(/mark: "dashed"/g)).toHaveLength(2);
  });
});
