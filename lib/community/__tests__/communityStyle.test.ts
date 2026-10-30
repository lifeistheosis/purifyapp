// How Pray together and Talk together are drawn and how they move (1.8, the
// owner's pick of r3-02): the raised half slides between the halves, the
// Pentecost icon fades in behind the name, and with Purify's motion off both
// simply stand. Every light is white, and on Parchment, where white cannot
// glow, the plain ink. The CSS sits beside the feature's own (the fold), not
// at the foot of the file.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
const raw = read("app/globals.css");
const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every body of a rule whose selector list is exactly `selector`, together. */
function bodies(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[{};])\\s*${escaped}\\s*\\{([^}]*)\\}`, "g");
  return [...css.matchAll(re)].map((m) => m[2]).join("\n");
}

/** Community's block, from its heading to the next section's. */
const block = (() => {
  const start = raw.indexOf("/* ── Community: Pray together and Talk together (1.8)");
  expect(start).toBeGreaterThan(-1);
  return raw.slice(start, raw.indexOf("/* Route entrance.", start));
})();

describe("the switch", () => {
  it("slides its raised half with the house ease, and stands still with motion off", () => {
    expect(bodies(".community-half-thumb")).toMatch(/transition:\s*translate var\(--duration-base\) var\(--ease-house\);/);
    expect(bodies(':where([data-motion="reduce"]) .community-half-thumb')).toMatch(/transition:\s*none;/);
    // The class moves it with translate, the property the transition names.
    const sw = read("components/community/PrayTalkSwitch.tsx");
    expect(sw).toContain('half === "talk" && "translate-x-full rtl:-translate-x-full"');
    expect(sw).not.toMatch(/transition-\[[^\]]*transform/);
  });

  it("lights the open half white", () => {
    expect(bodies('.community-half[aria-selected="true"]')).toMatch(/text-shadow:\s*0 0 12px rgb\(255 255 255 \/ 0\.55\);/);
    expect(bodies('.community-half[aria-selected="true"] svg')).toMatch(/drop-shadow\(0 0 6px rgb\(255 255 255 \/ 0\.75\)\)/);
  });
});

describe("Pray together's head", () => {
  it("fades the icon in behind the name, and with motion off it is simply there", () => {
    expect(css).toMatch(/@keyframes community-picture-in \{\s*from \{\s*opacity: 0;\s*transform: scale\(1\.04\);\s*\}\s*\}/);
    expect(bodies(".community-head-img")).toMatch(/animation:\s*community-picture-in 900ms var\(--ease-house\) backwards;/);
    expect(bodies(':where([data-motion="reduce"]) .community-head-img')).toMatch(/animation:\s*none;/);
  });

  it("melts the icon into the page's own ground, on every palette", () => {
    const shade = bodies(".community-head-shade");
    expect(shade).toContain("var(--color-night) 96%");
    expect(bodies('html[data-reading-mode="parchment"] .community-head-shade')).toMatch(/#f1e8d4 96%/);
  });

  it("lays the section over the picture's foot, not under it", () => {
    // The picture is placed absolutely, and a section that is not positioned
    // would be painted beneath it.
    expect(read("components/community/CommunityClient.tsx")).toMatch(/<section className="relative mx-auto w-full max-w-\[720px\]/);
  });
});

describe("the lights", () => {
  it("are white, never gold or yellow", () => {
    expect(block).not.toMatch(/gold|#d4af37|#c9a25a|yellow/i);
  });

  it("go out on Parchment, where white cannot glow", () => {
    expect(css).toMatch(
      /html\[data-reading-mode="parchment"\] :is\(\.community-half\[aria-selected="true"\], \.community-tab\[aria-selected="true"\], \.community-lit, \.community-on-picture \.community-head-title\)\s*\{\s*text-shadow:\s*none;/,
    );
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] :is\([^)]*\.community-lit svg[^)]*\)\s*\{\s*filter:\s*none;/);
    expect(bodies('html[data-reading-mode="parchment"] .community-tab[aria-selected="true"]::after')).toMatch(/box-shadow:\s*none;/);
  });

  it("each colour mix has a plain value before it, for a WebView without color-mix", () => {
    for (const sel of [".community-half-thumb", ".verified-tick-disc", ".community-rail", ".community-quote", ".community-campaign", ".community-head-shade"]) {
      const body = bodies(sel);
      const mix = body.indexOf("color-mix(");
      expect(mix, sel).toBeGreaterThan(-1);
      const prop = body.slice(0, mix).split(";").pop()!.split(":")[0].trim();
      expect(body.slice(0, body.lastIndexOf(`${prop}:`)), `${sel}: a plain ${prop} first`).toContain(`${prop}:`);
    }
  });
});

describe("where it sits", () => {
  it("is beside the feature's own CSS, the fold, and not at the end of the file", () => {
    const fold = raw.indexOf(".post-fold[data-cut] {");
    const ours = raw.indexOf("/* ── Community: Pray together and Talk together (1.8)");
    expect(fold).toBeGreaterThan(-1);
    expect(ours).toBeGreaterThan(fold);
    expect(raw.slice(fold, ours).split("\n").length).toBeLessThan(8);
    expect(ours).toBeLessThan(raw.length * 0.9);
  });
});
