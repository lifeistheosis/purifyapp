// The marks beside a name in Community, in the house greys (1.8, the owner's
// pick of r3-02 drew them so; an open question, built as drawn): the clergy
// seal white and softly lit, the verified tick grey, the Plus cross silver.
// Until 1.8 the seal was wine red with a gold cross, and the owner wants no
// colour in the app but white, grey and black ("that yellow is vibe coded").
//
// Each follows the palette: on Parchment the white seal is the page's ink and
// glows not at all, since white cannot glow on paper.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClergySeal } from "@/components/community/ClergySeal";
import { SupporterMark } from "@/components/community/SupporterMark";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

/** Every body of a rule whose selector list is exactly `selector`, together. */
function bodies(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[{};])\\s*${escaped}\\s*\\{([^}]*)\\}`, "g");
  return [...css.matchAll(re)].map((m) => m[2]).join("\n");
}

describe("the clergy seal", () => {
  it("is white, the page's ink, with the cross cut in the page's ground", () => {
    const html = renderToStaticMarkup(createElement(ClergySeal, { mark: "priest" }));
    expect(html).toContain('class="clergy-seal"');
    expect(html).toContain('fill="var(--color-paper)"');
    expect(html).toContain('stroke="var(--color-night)"');
    // No wine and no gold left in it.
    expect(html).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });

  it("glows softly white, and not at all on Parchment", () => {
    expect(bodies(".clergy-seal")).toMatch(/filter:\s*drop-shadow\(0 0 4px rgb\(255 255 255 \/ 0\.45\)\)/);
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] :is\([^)]*\.clergy-seal[^)]*\)\s*\{\s*filter:\s*none;/);
  });

  it("keeps its contract: a label spoken once, no tab stop, nothing for no mark", () => {
    const html = renderToStaticMarkup(createElement(ClergySeal, { mark: "clergy" }));
    expect(html).toContain('role="img"');
    expect(html).not.toContain("tabindex");
    expect(html).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(createElement(ClergySeal, { mark: null }))).toBe("");
  });
});

describe("the verified tick", () => {
  const client = read("components/community/CommunityClient.tsx");
  const badge = client.slice(client.indexOf("function VerifiedBadge("));

  it("is a grey disc with the tick cut in the page's ground", () => {
    expect(badge).toContain('className="verified-tick shrink-0"');
    expect(badge).toContain('className="verified-tick-disc"');
    expect(badge).toContain('stroke="var(--color-night, #101013)"');
    // It was the near-white accent (text-gold) before 1.8.
    expect(badge).not.toContain("text-gold");
  });

  it("mixes its grey from the page's own ink and ground, so it is grey on every palette", () => {
    const disc = bodies(".verified-tick-disc");
    expect(disc).toMatch(/fill:\s*#a9abb3;/);
    expect(disc).toMatch(/fill:\s*color-mix\(in srgb, var\(--color-paper\) 62%, var\(--color-night\)\);/);
  });

  it("stands beside a name in the feed and in a thread", () => {
    expect(client).toContain("{post.author_verified ? <VerifiedBadge /> : null}");
    expect(client).toContain("{r.author_verified ? <VerifiedBadge size={14} /> : null}");
  });
});

describe("the Plus cross", () => {
  it("is the Premium silver", () => {
    const html = renderToStaticMarkup(createElement(SupporterMark, { tier: "plus" }));
    expect(html).toContain('stroke="var(--color-premium)"');
    expect(html).not.toContain("--color-festal");
  });
});
