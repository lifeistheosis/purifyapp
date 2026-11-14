import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * No line of words wears the two shares the house keeps for marks.
 *
 * The palette's ink at 40 and 35 percent is under WCAG AA on every palette,
 * on purpose: app/globals.css ("Faint text on every palette") keeps those two
 * for marks that are decorative or disabled, and draws every other share a
 * reader's words wear at each palette's own safe strength. Measured on the
 * export, as words: 40 percent is 3.82:1 on Dark and 2.31:1 on Light, 35
 * percent 3.19:1 and 2.05:1, where 4.5:1 is needed.
 *
 * Words wore them all the same. The pre-build gate's first run found five
 * such lines on the screens it walks at rest (docs/1.9-build/notes/
 * gate-run-1.md), and a reading of the source found twenty-one more that a walk
 * at rest cannot reach: a streak's later steps, a notification's time, the
 * letters left in a field, a part a work's edition leaves out. Each moved to
 * 45 (2026-11-11). The owner's word the gate comes from: "ensure our next
 * build doesn't have any similar issues or any other issues of this nature."
 *
 * So this reads every screen's source: anything wearing 40 or 35 percent
 * that holds more than an icon is either named below, with why it may stay,
 * or it fails here before a walk is ever run.
 *
 * What would go wrong if this broke: a line a reader has to read, drawn at
 * 2.3:1 on Light, in a sheet or a state no walk opens.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

/** Every .tsx under app/ and components/, but the admin's (a tool of its own, with its own theme). */
function sources(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) => {
    const rel = `${dir}/${d.name}`;
    if (d.isDirectory()) return d.name === "admin" || d.name === "__tests__" ? [] : sources(rel);
    return d.name.endsWith(".tsx") ? [rel] : [];
  });
}

type Use = { file: string; line: number; share: string; tag: string; open: string; holds: string };

/** Each element that wears one of the two shares itself (no hover:, disabled: or placeholder: before it), and what it holds. */
function uses(file: string): Use[] {
  const src = read(file);
  const out: Use[] = [];
  for (const m of src.matchAll(/(?<![:\w-])text-paper\/(35|40)(?![\w.[])/g)) {
    // Back to the tag this class is written on.
    let at = m.index!;
    while (at > 0 && !/^<[A-Za-z]/.test(src.slice(at, at + 2))) at--;
    const tag = src.slice(at + 1).match(/^[\w.]+/)![0];
    // Forward to the end of its opening tag, past any braces.
    let depth = 0;
    let end = at;
    for (; end < src.length; end++) {
      const c = src[end];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    const line = src.slice(0, m.index!).split("\n").length;
    const open = src.slice(at, end + 1);
    if (src[end - 1] === "/") continue; // An icon: it holds nothing.
    const close = src.indexOf(`</${tag}>`, end);
    const body = src
      .slice(end + 1, close < 0 ? end + 400 : close)
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      // Icons and drawings inside it are marks, not words: a drawing, or one of the house's icons, which
      // are given a size (or are one of the two drawn without one). A <T k="..." /> is words, and stays.
      .replace(/<svg[\s\S]*?<\/svg>/g, "")
      .replace(/<[A-Z][\w.]*\b[^<>]*\bsize=[^<>]*\/>/g, "")
      .replace(/<(?:OutArrow|ChevronGlyph)\b[^<>]*\/>/g, "")
      .replace(/<path\b[^<>]*\/>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!body) continue; // Only an icon inside it.
    out.push({ file, line, share: m[1], tag, open, holds: body.slice(0, 120) });
  }
  return out;
}

/**
 * What may stay, by name: where it is, something its tag or its content holds, and why.
 * A disabled control and a value struck through are the house's "disabled" marks; a single
 * glyph is a mark. None is a line a reader has to read to use the screen.
 */
const MAY_STAY: { file: string; holds: string; why: string }[] = [
  { file: "components/walkthrough/Synthesis.tsx", holds: "walk.speaker.", why: "a wrong answer already tried: a disabled button, struck from the choices" },
  { file: "components/campaigns/StartCampaign.tsx", holds: "campaigns.create", why: "the send button while it cannot be pressed" },
  { file: "components/community/ComposePage.tsx", holds: "composeSendKey", why: "the send button while it cannot be pressed" },
  { file: "components/eikonBox/EikonBoxClient.tsx", holds: "Claiming", why: "the claim button while it cannot be pressed" },
  { file: "components/shop/CartClient.tsx", holds: "flatShippingCents", why: "a price struck through, beside the price that holds" },
  { file: "components/shop/OrderBump.tsx", holds: "product.price_cents", why: "a price struck through, beside the price that holds" },
  { file: "components/shop/ambassador/AmbassadorDashboard.tsx", holds: "money(r.amountCents)", why: "an amount struck through once it was reversed; the amounts that stand are in full ink" },
  { file: "components/shop/seller/SetupChecklist.tsx", holds: "step.done", why: "a single mark before a step's own words" },
  { file: "components/feature/FeatureShell.tsx", holds: "signin.comingSoon", why: "a shell no page uses; nothing draws it" },
];

describe("words and the two shares kept for marks", () => {
  const all = [...sources("app"), ...sources("components")].flatMap(uses);

  it("finds the uses it reads for: the scan is not broken", () => {
    // Some fifty uses in 2026-11, most of them icons, which are skipped before this count.
    expect(all.length).toBeGreaterThanOrEqual(MAY_STAY.length);
    expect([...sources("app"), ...sources("components")].length).toBeGreaterThan(500);
  });

  it("lets nothing but a mark wear 40 or 35 percent, unless it is named with its reason", () => {
    const unnamed = all
      .filter((u) => !MAY_STAY.some((ok) => ok.file === u.file && (u.holds.includes(ok.holds) || u.open.includes(ok.holds))))
      .map((u) => `${u.file}:${u.line} text-paper/${u.share} <${u.tag}> ${u.holds.slice(0, 60)}`);
    expect(unnamed).toEqual([]);
  });

  it("names nothing that is gone: each leave still has its place", () => {
    for (const ok of MAY_STAY) {
      const there = all.some((u) => u.file === ok.file && (u.holds.includes(ok.holds) || u.open.includes(ok.holds)));
      expect(there, `${ok.file}: "${ok.holds}" is no longer at 40 or 35 percent; take its name off the list`).toBe(true);
    }
  });

  it("keeps the two shares out of the palettes' safe list, so a mark stays a mark", () => {
    // Naming 40 on the everyday palettes would lift every chevron and divider with it. The looks name it for
    // their own grounds; the five everyday palettes do not.
    const css = read("app/globals.css");
    const everyday = css.slice(css.indexOf("/* Faint text on every palette"), css.indexOf("/* Every field's placeholder"));
    expect(everyday).toContain("the 40 percent share (under AA on every palette, kept for marks");
    expect(everyday).not.toMatch(/\.text-paper\\\/(?:35|40)\b/);
  });
});
