// "Follows you" beside a reader's @handle (build 97 note 6, Updates 71).
//
// What a reader would notice if this broke: on the profile of someone who
// follows them, the @handle slides sideways in one frame about a second after
// the card opens, as "Follows you" arrives with their standing and the two
// re-centre as a pair (44px, scripts/profile-open-walk.mjs --follows-you on
// export 09734eb4). The handle keeps the middle of a three-column row whose
// empty first column is the mark's twin, and the mark fades in in the third.
// Where the boxes stand is the walk's to measure; this holds the shape.

import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProfileFace } from "@/components/community/profile/ProfileCard";

const PLAIN = { bannerColor: null, bannerUrl: null, themePrimary: null, themeAccent: null, decoration: null, effect: null, nameColor: null, bannerMotion: null };
const MARK = createElement("span", { "data-mark": "" }, "Follows you");

/** The face's row that holds `words`: its class and what it holds. */
function row(handle: string, afterHandle: React.ReactNode, words: string) {
  const html = renderToStaticMarkup(createElement(ProfileFace, { profile: { name: "Herman", handle, avatar: null, status: null, cosmetics: PLAIN }, afterHandle }));
  const m = [...html.matchAll(/<p class="([^"]*)">((?:(?!<\/p>)[\s\S])*)<\/p>/g)].find((x) => x[2].includes(words));
  if (!m) throw new Error(`no row holds ${words}`);
  return { cls: m[1].split(/\s+/), inner: m[2] };
}

describe("the @handle and Follows you", () => {
  it("spans the face with or without the mark, so the row's own box never changes", () => {
    expect(row("herman", null, "@herman").cls).toContain("w-full");
    expect(row("herman", MARK, "@herman").cls).toContain("w-full");
  });

  it("keeps the @handle in the middle column and the mark beside it, on one line", () => {
    const { cls, inner } = row("herman", MARK, "@herman");
    expect(cls).toEqual(expect.arrayContaining(["grid", "grid-cols-[1fr_auto_1fr]", "items-center"]));
    expect(inner).toMatch(/<span class="col-start-2[^"]*">@herman<\/span>/);
    expect(inner).toMatch(/<span class="col-start-3 justify-self-start whitespace-nowrap"><span data-mark="">Follows you<\/span><\/span>/);
    expect(inner.indexOf("@herman")).toBeLessThan(inner.indexOf("Follows you"));
  });

  it("draws the @handle alone as before", () => {
    const { cls, inner } = row("herman", null, "@herman");
    expect(cls).toEqual(expect.arrayContaining(["flex", "flex-wrap", "justify-center"]));
    expect(cls).not.toContain("grid");
    expect(inner).toBe("<span>@herman</span>");
  });

  it("centres the mark alone where there is no handle (the Plus page's try window)", () => {
    const { cls, inner } = row("", MARK, "Follows you");
    expect(cls).toContain("justify-center");
    expect(cls).not.toContain("grid");
    expect(inner).toBe('<span data-mark="">Follows you</span>');
  });

  it("fades the mark in as it comes, on the profile card", () => {
    const viewer = readFileSync(join(process.cwd(), "components/community/profile/ProfileViewer.tsx"), "utf8");
    const mark = /relation\?\.followsYou \? \(([\s\S]*?)\) : null/.exec(viewer)?.[1] ?? "";
    expect(mark).toContain('t("profile.followsYou")');
    expect(mark).toMatch(/className=\{cn\("[^"]*", ARRIVE\)\}/);
  });
});
