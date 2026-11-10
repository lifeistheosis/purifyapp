// A made-up address answers a true 404 on the website (1.9), and a real one
// never does. lib/seo/unknownAddress.ts tells the proxy which addresses name
// a page the app does not have; the proxy answers those with the app's
// not-found page and status 404 before anything renders (a page that
// streams cannot change its 200 afterwards).
//
// What a reader would notice if this broke the wrong way: a real chapter, a
// council, an akathist or an Hour answering "This page is not in our index."
// So this walks every one of them. The other way: a search engine listing
// made-up addresses as pages again.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { BOOKS } from "@/lib/bible/books";
import { COUNCILS } from "@/lib/councils/councils";
import { listAkathists } from "@/lib/prayers/akathists";
import { listHours } from "@/lib/prayers/hours";
import { MY_RULE_PARTS } from "@/lib/prayers/myRule";
import { SAINTS } from "@/lib/saints/saints";
import { unknownAddress } from "@/lib/seo/unknownAddress";

const root = join(__dirname, "..", "..", "..");

describe("a made-up address", () => {
  it("is unknown in every family the proxy checks", async () => {
    for (const path of [
      "/saints/zzz-not-a-saint",
      "/saints/theotokos/not-a-work",
      "/bible/zzz/1",
      "/bible/john/99",
      "/bible/john/0",
      "/bible/john/x",
      "/councils/zzz",
      "/councils/nicaea-i/zzz",
      "/prayers/akathists/zzz",
      "/prayers/hours/zzz",
      "/prayers/personal/zzz",
    ]) {
      expect(await unknownAddress(path), path).toBe(true);
    }
  });

  it("never is a real page: every chapter, council, document, akathist, Hour and part of a rule", async () => {
    let walked = 0;
    for (const b of BOOKS) {
      for (let c = 1; c <= b.chapters; c++, walked++) expect(await unknownAddress(`/bible/${b.slug}/${c}`), `${b.slug} ${c}`).toBe(false);
    }
    for (const c of COUNCILS) {
      expect(await unknownAddress(`/councils/${c.slug}`), c.slug).toBe(false);
      for (const d of c.documents.filter((x) => !x.href)) expect(await unknownAddress(`/councils/${c.slug}/${d.slug}`), `${c.slug}/${d.slug}`).toBe(false);
    }
    for (const a of listAkathists()) expect(await unknownAddress(`/prayers/akathists/${a.slug}`), a.slug).toBe(false);
    for (const h of listHours()) expect(await unknownAddress(`/prayers/hours/${h.slug}`), h.slug).toBe(false);
    for (const p of MY_RULE_PARTS) expect(await unknownAddress(`/prayers/personal/${p}`), p).toBe(false);
    for (const s of SAINTS.slice(0, 20)) expect(await unknownAddress(`/saints/${s.slug}`), s.slug).toBe(false);
    expect(walked).toBeGreaterThan(1180);
  });

  it("leaves the indexes, files and other shapes to the routes", async () => {
    for (const path of ["/", "/bible", "/bible/", "/bible/multi", "/bible/john", "/councils", "/prayers", "/prayers/akathists", "/prayers/morning", "/saints/icons/x.jpg", "/bible/john/1.json", "/history/zzz", "/shop/zzz", "/councils/nicaea-i/canons/x"]) {
      expect(await unknownAddress(path), path).toBe(false);
    }
  });

  it("is what the proxy asks, before anything renders", () => {
    const proxy = readFileSync(join(root, "proxy.ts"), "utf8");
    expect(proxy).toContain("if (await unknownAddress(request.nextUrl.pathname)) {");
  });
});
