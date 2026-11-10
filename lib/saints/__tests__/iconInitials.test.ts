import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A saint's icon waiting for its picture is a dark icon board on every
 * palette (the owner, 1.8), and its initials are the palette's own light ink
 * on it, never a colour typed in that stays the same on every palette
 * (checkMock's palette check, 2026-11-10): the paper on a dark palette, the
 * page's ground on Light, where the paper is the dark ink.
 */
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (selector: string) => new RegExp(`(?:^|\\})\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`).exec(CSS)?.[1] ?? "";

describe("a saint's icon waiting for its picture", () => {
  it("writes its initials in the palette's own light ink, not a colour typed in", () => {
    const icon = read("components/saints/SaintIcon.tsx");
    const initials = /<span\s+className="([^"]*)"\s+style=\{\{ fontSize: d\.text/.exec(icon)?.[1] ?? "";
    expect(initials.split(/\s+/)).toContain("saint-icon-initials");
    expect(initials).not.toMatch(/\btext-(?:cream|white|\[#)/);
    expect(rule(".saint-icon-initials")).toMatch(/color: var\(--color-paper\);/);
    expect(rule('html[data-reading-mode="parchment"] .saint-icon-initials')).toMatch(/color: var\(--color-night\);/);
  });
});
