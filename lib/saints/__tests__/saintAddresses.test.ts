// A made-up address under /saints answers a true 404 on the website (1.9).
//
// The saint's page, a work's page and a saint's web each build their pages
// from the library (generateStaticParams), and each streams its outline
// (loading.tsx) while it arrives. Without `dynamicParams = false` an address
// they do not build was rendered on request: the outline began streaming
// before the page knew there was no saint, so the not-found came inside a 200,
// a page to a search engine (/saints/zzz-not-a-saint answered 200, "Saint |
// Purify"). An icon file that is not there (/saints/icons/<file>) fell through
// from public/ to the work's route and answered 200 the same way. With it, the
// router answers 404 before anything renders. The apps ship the same pages
// either way: the export builds only these.
//
// What a reader would notice if this broke: nothing on the page itself; a
// search engine would list made-up and removed addresses as pages again.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SAINTS, getSaint } from "@/lib/saints/saints";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const ROUTES = [
  { page: "app/(app)/saints/[slug]/page.tsx", params: "SAINTS.map((s) => ({ slug: s.slug }))" },
  { page: "app/(app)/saints/[slug]/[work]/page.tsx", params: "s.works.map((w) => ({ slug: s.slug, work: w.slug }))" },
  { page: "app/(app)/saints/[slug]/web/page.tsx", params: "webSlugs().map((slug) => ({ slug }))" },
];

describe("a made-up address under /saints", () => {
  it("answers 404 on the website: each route serves only the pages it builds", () => {
    for (const { page, params } of ROUTES) {
      const src = read(page);
      expect(src, page).toContain(params);
      expect(src, page).toContain("export const dynamicParams = false;");
    }
  });

  it("never names a saint where the icons live, so /saints/icons/<file> is never a saint's page", () => {
    expect(getSaint("icons")).toBeNull();
    expect(SAINTS.some((s) => s.slug === "icons")).toBe(false);
  });
});
