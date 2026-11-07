// The shop's product photos stream from the website in the apps (1.9, the
// full optimize): about 5 MB the export no longer carries. Every way a photo's
// address reaches the screen makes it the website's in the apps: the catalog,
// a piece's photo (an order's), the vitrine picture and the cart, which keeps
// its own copies. On the website nothing changes.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SITE_URL } from "@/lib/site";
import { STREAMED_ROOTS, streamedDeep, streamedUrl } from "@/lib/media/streamed";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");

describe("a shop photo's address", () => {
  it("is the website's in the apps, and the page's own on the website", () => {
    expect(STREAMED_ROOTS).toContain("/shop/media/");
    expect(streamedUrl("/shop/media/christ-pantocrator-mounted.jpg", true)).toBe(`${SITE_URL}/shop/media/christ-pantocrator-mounted.jpg`);
    expect(streamedUrl("/shop/media/christ-pantocrator-mounted.jpg", false)).toBe("/shop/media/christ-pantocrator-mounted.jpg");
    expect(streamedUrl("/saints/icons/theotokos.jpg", true)).toBe("/saints/icons/theotokos.jpg");
  });

  it("is made the website's through a whole catalog answer, wherever it stands in it", () => {
    const answer = { products: [{ slug: "a", media: [{ media_url: "/shop/media/a.jpg", alt_text: "A" }], hero: "/shop/media/h.jpg" }], note: "/shop/mediaeval" };
    const inApps = streamedDeep(answer, true);
    expect(inApps.products[0].media[0].media_url).toBe(`${SITE_URL}/shop/media/a.jpg`);
    expect(inApps.products[0].hero).toBe(`${SITE_URL}/shop/media/h.jpg`);
    expect(inApps.products[0].media[0].alt_text).toBe("A");
    expect(inApps.note).toBe("/shop/mediaeval");
    // On the website the very same answer, untouched.
    expect(streamedDeep(answer, false)).toBe(answer);
    // Already the website's: left as it is.
    expect(streamedDeep(inApps, true)).toEqual(inApps);
  });

  it("reaches every place a shop photo is drawn from", () => {
    expect(read("lib/shop/catalogClient.ts")).toContain("const data = streamedDeep((await res.json()) as T);");
    expect(read("components/shop/VitrineImage.tsx")).toContain('src={typeof src === "string" ? streamedUrl(src) : src}');
    expect(read("components/shop/PiecePhoto.tsx")).toContain("src={streamedUrl(src)}");
    expect(read("components/shop/CartDrawer.tsx")).toContain("src={streamedUrl(item.imageUrl)}");
    expect(read("components/shop/CartClient.tsx")).toContain("src={streamedUrl(item.imageUrl)}");
  });

  it("is never written into the shop's components as a path of its own", () => {
    const dir = path.resolve(__dirname, "../../../components/shop");
    const files = fs.readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".tsx"));
    for (const f of files) expect(fs.readFileSync(path.join(dir, f), "utf8"), f).not.toMatch(/["'`]\/shop\/media\//);
  });
});
