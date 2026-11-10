// A made-up address under /saints answers a true 404 on the website (1.9).
//
// A saint's page, a work's page and a saint's web are rendered on request on
// the website, and each streams its outline (loading.tsx) while it arrives.
// The status is fixed when the stream starts, so the page's own notFound()
// came inside a 200, a page to a search engine: /saints/zzz-not-a-saint
// answered 200, "Saint | Purify". `dynamicParams = false` alone did not
// change that on the website, where these routes are dynamic (the production
// build answered 200 with it); it holds the dev server and the export. So the
// proxy answers a saint or a work the library does not have with a 404
// before anything renders (lib/saints/addresses.ts), as Next advises for a
// 404 under streaming. An icon file that is not there (/saints/icons/<file>)
// fell through from public/ to the work's route and answered 200 the same
// way; a route of its own answers it now, on the website alone.
//
// What a reader would notice if this broke: nothing on the page itself; a
// search engine would list made-up and removed addresses as pages again. And
// if the check went wrong the other way, a real saint would answer 404: the
// last test below walks every saint and every work to keep that from
// happening.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { unknownSaintAddress } from "@/lib/saints/addresses";
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

  it("is answered 404 by the proxy, before anything renders", () => {
    expect(unknownSaintAddress("/saints/zzz-not-a-saint")).toBe(true);
    expect(unknownSaintAddress("/saints/philip-of-moscow")).toBe(true);
    expect(unknownSaintAddress("/saints/zzz-not-a-saint/web")).toBe(true);
    expect(unknownSaintAddress("/saints/theotokos/not-a-work")).toBe(true);
    const proxy = read("proxy.ts");
    expect(proxy).toContain("if (await unknownAddress(request.nextUrl.pathname)) {");
    expect(read("lib/seo/unknownAddress.ts")).toContain('const { unknownSaintAddress } = await import("@/lib/saints/addresses");');
    expect(proxy).toMatch(/NextResponse\.rewrite\(new URL\("\/_not-found", request\.url\), \{\s*status: 404,/);
  });

  it("never answers a real saint, a work or a file 404", () => {
    for (const s of SAINTS) {
      expect(unknownSaintAddress(`/saints/${s.slug}`), s.slug).toBe(false);
      expect(unknownSaintAddress(`/saints/${s.slug}/`), s.slug).toBe(false);
      expect(unknownSaintAddress(`/saints/${s.slug}/web`), s.slug).toBe(false);
      for (const w of s.works) expect(unknownSaintAddress(`/saints/${s.slug}/${w.slug}`), `${s.slug}/${w.slug}`).toBe(false);
    }
    // The index, the icons (files, served before the proxy's answer counts),
    // anything with a dot in it, and other places.
    for (const path of ["/saints", "/saints/", "/saints/icons/theotokos.jpg", "/saints/icons/not-a-file.jpg", "/saints/zzz/file.json", "/bible/john/1", "/saints/theotokos/akathist/1"]) {
      expect(unknownSaintAddress(path), path).toBe(false);
    }
  });

  it("answers a missing icon file 404 by a route of its own, on the website alone", () => {
    const route = read("app/(app)/saints/icons/[file]/route.ts");
    expect(route).toMatch(/export function GET\(\) \{\s*return new Response\("Not found", \{\s*status: 404,/);
    expect(read("scripts/native-build.mjs")).toContain('["app", "(app)", "saints", "icons"],');
  });
});
