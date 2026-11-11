import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every switch in components/ places its knob by start and end, never by a
 * physical side (the arbiter, 2026-11-11, 16:33 UTC, after the gate's third
 * run found Pray with chant's knob out of its track in Arabic: 56 to 78px
 * where its mirror is 20 to 42). A knob set by left, or moved by a
 * translate with no turn for right-to-left, stands on the wrong side in
 * Arabic and Urdu: off where on should be, or outside its track.
 *
 * Read from the code, so a switch the walk cannot reach (behind sign-in, in
 * the desktop app, in the admin panel) is held too: each element with
 * role="switch", from its opening tag to its close, its classes, its inline
 * styles, and the CSS rules its classes reach (app/globals.css and a CSS
 * module it imports).
 *
 * What a reader would notice if this broke: in Arabic, a switch that looks
 * on when it is off.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const strip = (src: string) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(rel));
    else if (entry.name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

type Switch = { file: string; region: string; source: string };

/**
 * Where an opening tag ends: the first ">" outside braces and quotes (so an
 * arrow, "=>", in a prop is not taken for it), and whether it closes itself.
 */
function tagEnd(source: string, open: number): { end: number; self: boolean } {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open + 1; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === "`") {
      quote = c;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
    } else if (c === ">" && depth === 0) {
      return { end: i + 1, self: source[i - 1] === "/" };
    }
  }
  return { end: source.length, self: true };
}

/** Each element with role="switch": from its opening tag to its close. */
function switches(): Switch[] {
  const out: Switch[] = [];
  for (const file of filesUnder("components")) {
    const source = strip(read(file));
    let at = source.indexOf('role="switch"');
    while (at >= 0) {
      const open = source.lastIndexOf("<", at);
      const tag = /^<([A-Za-z][\w.]*)/.exec(source.slice(open))?.[1] ?? "";
      const { end, self } = tagEnd(source, open);
      const close = self ? end : source.indexOf(`</${tag}>`, end);
      out.push({ file, region: source.slice(open, self || close < 0 ? end : close + tag.length + 3), source });
      at = source.indexOf('role="switch"', at + 1);
    }
  }
  return out;
}

/** Every string literal in a piece of code (quoted or a template's literal parts). */
const literals = (code: string) => [...code.matchAll(/"([^"\n]*)"|`([^`]*)`|'([^'\n]*)'/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");

/** The CSS rules whose selector names a class: [selector, declarations]. */
function rulesFor(css: string, className: string): [string, string][] {
  const name = new RegExp(`\\.${className.replace(/[-/]/g, "\\$&")}(?![\\w-])`);
  return [...strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => [m[1].trim(), m[2]] as [string, string]).filter(([sel]) => name.test(sel));
}

const PHYSICAL_CLASS = /(?<![\w:[-])(?:left|right|ml|mr|pl|pr)-(?:\[[^\]]+\]|\d+(?:\.\d+)?|px|full|auto|1\/2)(?![\w-])/;

describe("every switch in components/", () => {
  const all = switches();

  it("is found: the house's switches, behind sign-in, in the desktop app and in the admin panel too", () => {
    const files = new Set(all.map((s) => s.file));
    for (const f of [
      "components/player/PrayWithChant.tsx",
      "components/profile/CommunityPushSwitch.tsx",
      "components/community/profile/ProfileEditor.tsx",
      "components/profile/EmailPreferences.tsx",
      "components/desktop/DiscordModes.tsx",
      "components/dev/DeveloperOptions.tsx",
      "components/settings/LitPanel.tsx",
      "components/admin/needed/parts.tsx",
      "components/admin/shop/GrowthPanel.tsx",
    ]) {
      expect(files.has(f), f).toBe(true);
    }
    for (const s of all) expect(s.region.length, s.file).toBeGreaterThan(20);
  });

  it("places its knob by start and end in its classes, and turns any move for right-to-left", () => {
    for (const s of all) {
      for (const lit of literals(s.region)) {
        for (const cls of lit.split(/\s+/)) {
          expect(PHYSICAL_CLASS.test(cls), `${s.file}: "${cls}" places by a physical side`).toBe(false);
        }
        if (/(?<![\w:-])-?translate-x-/.test(lit)) {
          expect(/\brtl:-?translate-x-/.test(lit), `${s.file}: "${lit.trim()}" moves the knob with no turn for right-to-left`).toBe(true);
        }
      }
      expect(/translateX\(/.test(s.region), `${s.file}: an inline translateX moves the knob by a physical side`).toBe(false);
      expect(/\b(?:left|right)\s*:\s*["'`0-9]/.test(s.region), `${s.file}: an inline left or right places the knob`).toBe(false);
    }
  });

  it("and in the CSS its classes reach: no left or right, and a move turned for right-to-left", () => {
    const globals = read("app/globals.css");
    for (const s of all) {
      const modules = [...s.source.matchAll(/import\s+(\w+)\s+from\s+"(\.\/[\w.-]+\.module\.css)"/g)].map((m) => ({
        name: m[1],
        css: read(path.join(path.dirname(s.file), m[2])),
      }));
      const reached: { cls: string; css: string }[] = [];
      for (const lit of literals(s.region)) for (const cls of lit.split(/\s+/)) if (/^[a-z][\w-]*$/.test(cls)) reached.push({ cls, css: globals });
      for (const m of modules) {
        for (const ref of s.region.matchAll(new RegExp(`\\b${m.name}\\.(\\w+)`, "g"))) reached.push({ cls: ref[1], css: m.css });
      }
      for (const { cls, css } of reached) {
        const rules = rulesFor(css, cls);
        for (const [sel, decls] of rules) {
          // A box centred on its element (left: 50% and a -50% move back, as the house's
          // hit-44 lays its touch area) turns nothing; any other left or right does.
          const centred = /translate\(\s*-50%/.test(decls);
          for (const d of decls.matchAll(/(?:^|;)\s*(left|right)\s*:\s*([^;]+)/g)) {
            const value = d[2].trim();
            if (centred && value === "50%") continue;
            expect(value, `${s.file}: ${sel} sets ${d[1]}`).toBe("auto");
          }
          const moves = /(?:^|;)\s*(?:translate\s*:\s*-?[1-9]|transform\s*:[^;]*translateX\()/.test(decls);
          if (moves && !/\[dir=["']?rtl|:dir\(rtl\)/.test(sel)) {
            const turned = rules.some(([other, d]) => /\[dir=["']?rtl|:dir\(rtl\)/.test(other) && /(?:translate\s*:|translateX\()/.test(d));
            expect(turned, `${s.file}: ${sel} moves the knob with no turn for right-to-left`).toBe(true);
          }
        }
      }
    }
  });
});
