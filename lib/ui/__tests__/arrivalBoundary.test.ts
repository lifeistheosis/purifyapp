// Updates 90 (2026-11-15), item 1: the empty arrivals. Each page that reads
// its address on the device stood behind its own <Suspense fallback={null}>,
// which the export needs. In a page switch React shows a new boundary's
// fallback rather than hold the page being left (react-dom,
// shouldRemainOnPreviousScreen), so the screen stood empty while the page's
// script arrived: /campaigns/detail/ 7 of 8 runs, /email/change/ 2 of 4, on
// the export of 17276848. One rule now: the boundary is drawn in the page's
// HTML alone (components/layout/ArrivalBoundary.tsx), and a page mounted by a
// switch has none, so React holds the page being left until it can draw.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ArrivalBoundary } from "@/components/layout/ArrivalBoundary";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const walk = (dir: string): string[] =>
  readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(ROOT, rel)).isDirectory() ? (name === "__tests__" ? [] : walk(rel)) : rel.endsWith(".tsx") ? [rel] : [];
  });

const PAGES = [
  "app/(app)/bible/multi/page.tsx",
  "app/(app)/campaigns/detail/page.tsx",
  "app/(app)/email/change/page.tsx",
  "app/(app)/email/first-week/page.tsx",
  "app/(app)/email/unsubscribe/page.tsx",
  "app/(app)/florilegium/gathering/page.tsx",
  "app/(app)/shop/ambassador/page.tsx",
  "app/(app)/shop/checkout/cancelled/page.tsx",
  "app/(app)/shop/checkout/success/page.tsx",
  "app/(app)/shop/messages/detail/page.tsx",
  "app/(app)/shop/orders/detail/page.tsx",
  "app/(app)/shop/request/page.tsx",
];

describe("a page addressed by its query arrives held, never empty", () => {
  it("no page stands behind an empty boundary of its own: each wears the one rule", () => {
    const empty = walk("app").filter((f) => /<Suspense(\s+fallback=\{null\})?\s*>/.test(code(f)));
    expect(empty).toEqual([]);
    for (const page of PAGES) {
      expect(code(page), page).toMatch(/<ArrivalBoundary>[\s\S]+<\/ArrivalBoundary>/);
      expect(code(page), page).toContain('import { ArrivalBoundary } from "@/components/layout/ArrivalBoundary";');
    }
  });

  it("besides the rule itself, the two empty boundaries left in components wrap parts that draw nothing, not a page", () => {
    const left = walk("components").filter((f) => /<Suspense(\s+fallback=\{null\})?\s*>/.test(code(f)));
    expect(left.sort()).toEqual(["components/layout/ArrivalBoundary.tsx", "components/nav/RouteTransition.tsx", "components/reading/ReadingRoom.tsx"]);
    expect(code("components/nav/RouteTransition.tsx")).toMatch(/<Suspense fallback=\{null\}>\s*<QueryRoute pathname=\{pathname\} queryRef=\{queryRef\} \/>\s*<\/Suspense>/);
    expect(code("components/reading/ReadingRoom.tsx")).toMatch(/<Suspense fallback=\{null\}>\s*<AddressSync onAddress=\{onAddress\} \/>\s*<\/Suspense>/);
  });

  it("in the page's HTML it is still the boundary the export needs", () => {
    const pending = new Promise<never>(() => {});
    const Waits = (): ReactNode => {
      throw pending;
    };
    // The server's render: what waits stands behind the boundary, which draws nothing.
    expect(renderToStaticMarkup(createElement(ArrivalBoundary, null, createElement(Waits)))).toBe("");
    expect(renderToStaticMarkup(createElement(ArrivalBoundary, null, createElement("p", null, "here")))).toBe("<p>here</p>");
  });

  it("mounted by a switch it is no boundary, and the choice is made once", () => {
    const src = code("components/layout/ArrivalBoundary.tsx");
    expect(src).toContain("useSyncExternalStore(noSubscribe, mountedOnTheDevice, inThePageHtml)");
    expect(src).toMatch(/const mountedOnTheDevice = \(\) => true;\s*const inThePageHtml = \(\) => false;/);
    expect(src).toContain("const [inHtml] = useState(!mounted);");
    expect(src).toContain("return inHtml ? <Suspense fallback={null}>{children}</Suspense> : children;");
  });
});
