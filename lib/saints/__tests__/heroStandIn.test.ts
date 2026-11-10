// A saint's page on a phone, before his large picture comes or with no
// signal: the icon the app carries stands in for it between the top bar and
// his name, clear of both (components/saints/SaintHeroPicture.tsx,
// `.hero-stand-in` in app/globals.css). What a reader would notice if this
// broke: the foot of the icon under the first line of his name, as St Gregory
// the Theologian's and the Apostle Peter's pages had it (2026-11-10, the
// export with no signal at 390 pixels), centred in the whole picture while
// the name is set over its last 7rem.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const css = read("app/globals.css");
const picture = read("components/saints/SaintHeroPicture.tsx");
const hero = read("components/saints/SaintHero.tsx");

/** The phones-only block (max-width 767.98px) that holds a rule, or "" when the rule is outside every such block. */
function phoneBlockHolding(selector: string): string {
  const at = css.indexOf(`\n ${selector} {`);
  if (at < 0) return "";
  const open = css.lastIndexOf("@media (max-width: 767.98px) {", at);
  if (open < 0) return "";
  // The block runs to the first closing brace at the start of a line after it opens.
  const close = css.indexOf("\n}", open);
  return close > at ? css.slice(open, close) : "";
}

const rule = (block: string, selector: string) =>
  block.match(new RegExp(`\\n ${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";

describe("the stand-in icon on a saint's page with a large picture", () => {
  it("is the element the rule places", () => {
    expect(picture).toMatch(/"hero-stand-in absolute inset-0 m-auto h-\[240px\] max-h-\[70%\] w-auto/);
  });

  it("sits between the bar and the name on a phone, a rem clear of each, and keeps a tablet's place", () => {
    const block = phoneBlockHolding(".hero-stand-in");
    expect(block, "the rule is in the phones-only block, so a tablet keeps inset-0 and max-h-[70%]").not.toBe("");
    const web = rule(block, ".hero-stand-in");
    const native = rule(block, "html.is-native .hero-stand-in");
    // The bar is 3rem and the notch it pads for (.under-topbar); a rem below it.
    expect(web).toContain("top: calc(4rem + env(safe-area-inset-top, 0px));");
    expect(native).toContain("top: calc(4rem + var(--inset-top));");
    // The name is set over the picture's last 7rem; a rem above it.
    expect(web).toContain("bottom: 8rem;");
    // Never taller than the room between them, so it shrinks rather than meets either.
    expect(web).toContain("max-height: calc(100% - 12rem - env(safe-area-inset-top, 0px));");
    expect(native).toContain("max-height: calc(100% - 12rem - var(--inset-top));");
  });

  it("keeps in step with the name's place over the picture and the bar's height", () => {
    // 8rem above is the name's 7rem and a rem; 4rem below the top is the bar's 3rem and a rem.
    expect(hero).toContain('hero ? "relative -mt-28 text-start md:mt-0"');
    expect(rule(phoneBlockHolding(".under-topbar"), ".under-topbar")).toContain("margin-top: calc(-3rem - env(safe-area-inset-top, 0px));");
  });
});
