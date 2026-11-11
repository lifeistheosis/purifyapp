import fs from "node:fs";
import path from "node:path";

import postcss from "postcss";
import { describe, expect, it } from "vitest";

/**
 * The house stylesheet parses (2026-11-11). The order gift's styles landed
 * after the long-headings rule (`@layer base { ... }`) and its closing brace
 * was lost on the way, so every rule after it stood inside the layer and the
 * build of the apps and the website stopped on "Unclosed block". No unit test
 * read the stylesheet as a stylesheet: each reads its own rule by text. This
 * parses the whole file, as the build does, and fails on any block left open
 * or closed twice.
 *
 * What would go wrong if this broke: no build of the branch at all, found
 * only when one is cut.
 */
const CSS = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");

describe("the house stylesheet", () => {
  it("parses as the build parses it, every block closed", () => {
    expect(() => postcss.parse(CSS, { from: "app/globals.css" })).not.toThrow();
  });

  it("keeps the long-headings layer to its two rules, and the gift's styles outside it", () => {
    const root = postcss.parse(CSS, { from: "app/globals.css" });
    const layers = root.nodes.filter((n) => n.type === "atrule" && n.name === "layer" && n.params === "base") as postcss.AtRule[];
    const headings = layers.find((l) => (l.nodes ?? []).some((n) => n.type === "rule" && n.selector === ":where(h1, h2, h3)"));
    expect(headings).toBeDefined();
    expect((headings?.nodes ?? []).filter((n) => n.type === "rule").map((n) => (n as postcss.Rule).selector)).toEqual([
      ":where(h1, h2, h3)",
      ":where(h1, h2, h3):where(:lang(de), :lang(ka))",
    ]);
  });
});
