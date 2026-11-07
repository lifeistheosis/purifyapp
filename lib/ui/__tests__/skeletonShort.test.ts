// Loading placeholders written short (1.9, the full optimize). Every bar of a
// loading screen is written into each page the apps carry, about 2,000 of
// them, so a bar is a short class with the same look as the utilities it
// replaces (checked in the browser on every palette, computed style for
// computed style), and the guided tour still sees a page arriving.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");
const CSS = read("app/globals.css");

describe("a loading bar", () => {
  it("is one short class, with no attributes of its own", () => {
    expect(renderToStaticMarkup(createElement(Skeleton, { weight: "faint" }))).toBe('<div class="sk sk-faint"></div>');
    expect(renderToStaticMarkup(createElement(Skeleton, { weight: "strong", rounded: "rounded-full", className: "h-10 w-10" }))).toBe(
      '<div class="sk sk-strong rounded-full h-10 w-10"></div>',
    );
    expect(renderToStaticMarkup(createElement(SkeletonText, { lines: 2 }))).toBe(
      '<div class="cascade space-y-2"><div class="sk sk-faint sk-line"></div><div class="sk sk-faint sk-line-end"></div></div>',
    );
  });

  it("looks as its utilities did: the same radius, pulse, greys and sizes", () => {
    const block = CSS.slice(CSS.indexOf("@layer components {\n .sk {"));
    for (const [cls, utilities] of [
      [".sk", "rounded animate-pulse"],
      [".sk-strong", "bg-paper/10"],
      [".sk-mid", "bg-paper/8"],
      [".sk-faint", "bg-paper/6"],
      [".sk-line", "h-4 w-full"],
      [".sk-line-end", "h-4 w-[62%]"],
    ] as const) {
      expect(block, cls).toContain(` ${cls} {\n  @apply ${utilities};\n }`);
    }
  });

  it("is what the guided tour waits on while a page arrives", () => {
    expect(read("lib/whatsNew/tourDom.ts")).toContain('document.querySelectorAll(".sk, [data-skeleton]")');
  });
});

describe("the chapter's loading screen in the apps", () => {
  it("leaves out the computer's sidebar, which the apps never show", () => {
    const loading = read("app/(app)/bible/[book]/[chapter]/loading.tsx");
    expect(loading).toContain("{IS_STATIC_EXPORT ? null : (");
    expect(loading).toContain('className="hidden md:block native-md-hidden');
  });
});
