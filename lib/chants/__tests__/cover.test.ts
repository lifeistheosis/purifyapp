// A chant with no cover, and a track with no picture, never show an empty box
// (1.8). The coordinator's walk of the merged export on 2026-10-30 found the
// Chants home opening on Psalm 117 with a blank grey square for its cover:
// none of the six chants added that day has one. In their place is the plate,
// the dark ground with the three-bar cross glowing white and, where there is
// room, the chant's languages (components/ui/CrossPlate.tsx). Rendered to
// static markup: react-dom/server needs no DOM.

import fs from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChantCover, languagesOf } from "@/components/chants/ChantCover";
import { CoverArt, plateSize } from "@/components/player/CoverArt";
import { CrossPlate } from "@/components/ui/CrossPlate";
import { dataAddress, keepCover, keptCover, MAX_KEPT, resetKeptCoversForTests } from "@/lib/chants/keptCovers";
import { allChants, chantIndex } from "@/lib/chants/registry.server";
import { isStreamedMedia } from "@/lib/media/streamed";

const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe("a chant's cover", () => {
  it("is the plate when the chant has none: the cross, glowing, and its languages where there is room", () => {
    const languages = ["العربية", "English", "Ελληνικά", "Srpski"];
    for (const size of ["hero", "card"] as const) {
      const html = render(createElement(ChantCover, { languages, size, className: "w-full" }));
      expect(html, size).toContain('data-cover="plate"');
      expect(html, size).toContain("cross-plate-mark");
      expect(html.match(/<line /g)?.length, size).toBe(4);
      expect(html, size).toContain("العربية · English · Ελληνικά · Srpski");
      expect(html, size).toContain('aria-hidden="true"');
      expect(html, size).not.toContain("<img");
    }
    // A thumb is the cross alone: too small for a line of words.
    const thumb = render(createElement(ChantCover, { languages, size: "thumb", className: "w-12" }));
    expect(thumb).toContain("cross-plate-mark");
    expect(thumb).not.toContain("English");
  });

  it("is the icon when the chant has one, unseen until it has arrived whole (note 52)", () => {
    const html = render(createElement(ChantCover, { cover: { src: "/audio/art/anthem.jpg", alt: "The Holy Trinity" }, size: "hero" }));
    expect(html).toContain('data-cover="img"');
    expect(html).toContain('src="/audio/art/anthem.jpg"');
    expect(html).not.toContain("cross-plate-mark");
    // The first markup, the website's and the app's alike, holds the picture
    // back, so it never paints in bands; it fades in on the app's motion.
    const img = /<img [^>]*>/.exec(html)?.[0] ?? "";
    expect(img).toContain("opacity-0");
    expect(img).toContain("motion-safe:transition-opacity");
    expect(img).toContain('decoding="async"');
    expect(img).toContain('loading="eager"');
    const thumb = render(createElement(ChantCover, { cover: { src: "/audio/art/anthem.jpg", alt: "The Holy Trinity" }, size: "thumb" }));
    expect(thumb).toContain('loading="lazy"');
  });

  it("names each chant's versions once, in its own order", () => {
    expect(languagesOf([{ label: "English" }, { label: "Ελληνικά" }, { label: "English" }])).toEqual(["English", "Ελληνικά"]);
    for (const row of chantIndex()) {
      const html = render(createElement(ChantCover, { languages: languagesOf(row.variants), size: "card" }));
      expect(html, row.slug).toContain(languagesOf(row.variants).join(" · "));
    }
  });
});

/** A JPEG's size, read from its frame header. */
function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const length = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}

describe("every chant's icon (the owner's note 57)", () => {
  // "try and look for an icon to put as the cover photo that matches the
  // verse". Every chant has one: a public-domain icon, in the bundle so it is
  // there with no signal, square, small (the export is near its 240 MB
  // ceiling), and recorded with its source and licence.
  const chants = allChants();
  const doc = fs.readFileSync("docs/licensing/audio-provenance.md", "utf8");
  const covers = doc.slice(doc.indexOf("### The chants' covers"), doc.indexOf("## Restoring the ambience shelf"));
  const LONG_DASH = String.fromCharCode(0x2014);

  it("has one, in the bundle, square at 640 and about 100 KB", () => {
    expect(covers.length).toBeGreaterThan(100);
    for (const c of chants) {
      expect(c.cover, c.slug).toBeDefined();
      const src = c.cover!.src;
      expect(src, c.slug).toMatch(/^\/audio\/art\/[a-z0-9-]+(\.v\d+)?\.jpg$/);
      // Not a folder the apps ask the website for (lib/media/streamed.ts).
      expect(isStreamedMedia(src), src).toBe(false);
      const file = fs.readFileSync(`public${src}`);
      expect(jpegSize(file), src).toEqual({ width: 640, height: 640 });
      expect(file.length, src).toBeLessThan(140 * 1024);
    }
  });

  it("is recorded as public domain, with its source", () => {
    for (const c of chants) {
      const row = covers.split("\n").find((l) => l.startsWith("| `public" + c.cover!.src + "`"));
      expect(row, `${c.cover!.src} has no row under "The chants' covers" in docs/licensing/audio-provenance.md`).toBeDefined();
      expect(row).toContain(c.title);
      expect(row).toMatch(/\| Public domain/);
      expect(row).toMatch(/\[Commons\]\(https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(c.cover!.credit, c.slug).toMatch(/Public domain\.$/);
      for (const text of [c.cover!.alt, c.cover!.credit, row!]) expect(text.includes(LONG_DASH), c.slug).toBe(false);
    }
    expect(covers.includes(LONG_DASH)).toBe(false);
  });

  it("shows King David, the psalmist, on every psalm", () => {
    for (const c of chants.filter((x) => x.kind === "psalm")) expect(c.cover!.src, c.slug).toBe("/audio/art/david.v1.jpg");
    expect(chants.find((c) => c.slug === "paschal-canon")?.cover?.alt).toMatch(/^The Anastasis, Christ raising Adam and Eve/);
  });
});

describe("a cover comes back whole (the owner's note 58)", () => {
  // The apps' shells answer the bundle with Cache-Control: no-cache, so a new
  // <img> asks for its picture again and its box is empty until the answer
  // is decoded: Chants came back from a chant with its featured cover's box
  // empty, then the icon popped in. A cover already shown is kept as a data
  // address (lib/chants/keptCovers.ts) and drawn from it at once.
  const source = fs.readFileSync("components/chants/ChantCover.tsx", "utf8");

  it("waits for every byte and the decode, then fades in on the app's motion, and keeps what arrived", () => {
    expect(source).toContain("img.decode().then(done, done)");
    expect(source).toContain('arrived ? "opacity-100" : "opacity-0"');
    expect(source).toContain('"motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-house"');
    expect(source).toContain("void keepCover(src)");
    // A picture finished before the page could listen is read before the frame is painted.
    expect(source).toMatch(/useIsoLayoutEffect\(\(\) => \{\s*const img = ref\.current;/);
  });

  it("draws a kept cover from its copy, whole in the first frame and with no fade", () => {
    expect(source).toContain("const [kept] = useState(() => keptCover(src));");
    expect(source).toContain("const [arrived, setArrived] = useState(kept !== null);");
    expect(source).toContain("src={kept ?? src}");
    expect(source).toContain('decoding={kept !== null ? "sync" : "async"}');
    expect(source).toContain('kept === null && "motion-safe:transition-opacity');
  });

  describe("the kept copies", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 250, 251, 252, 0, 7]);
    const pictures: { src: string }[] = [];

    beforeEach(() => {
      resetKeptCoversForTests();
      pictures.length = 0;
      vi.stubGlobal("window", {});
      vi.stubGlobal(
        "Image",
        class {
          src = "";
          constructor() {
            pictures.push(this);
          }
          decode() {
            return Promise.resolve();
          }
        },
      );
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      resetKeptCoversForTests();
    });

    it("keeps a cover's own bytes as a data address, asked for once, with a picture made from it held", async () => {
      const ask = vi.fn(async () => ({ ok: true, blob: async () => new Blob([bytes], { type: "image/jpeg" }) }));
      vi.stubGlobal("fetch", ask);
      expect(keptCover("/audio/art/david.v1.jpg")).toBeNull();
      await Promise.all([keepCover("/audio/art/david.v1.jpg"), keepCover("/audio/art/david.v1.jpg")]);
      await keepCover("/audio/art/david.v1.jpg");
      expect(ask).toHaveBeenCalledTimes(1);
      const kept = keptCover("/audio/art/david.v1.jpg");
      expect(kept).toBe(`data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`);
      expect(pictures.map((p) => p.src)).toEqual([kept]);
    });

    it("keeps nothing it could not read, and never throws", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
      await keepCover("/audio/art/a.jpg");
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, blob: async () => new Blob([]) })));
      await keepCover("/audio/art/b.jpg");
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, blob: async () => new Blob(["<html>"], { type: "text/html" }) })));
      await keepCover("/audio/art/c.jpg");
      for (const src of ["/audio/art/a.jpg", "/audio/art/b.jpg", "/audio/art/c.jpg"]) expect(keptCover(src), src).toBeNull();
      // A cover that failed is asked for again the next time it arrives.
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, blob: async () => new Blob([bytes], { type: "image/jpeg" }) })));
      await keepCover("/audio/art/a.jpg");
      expect(keptCover("/audio/art/a.jpg")).toMatch(/^data:image\/jpeg;base64,/);
    });

    it("keeps no more than a library's worth, and nothing on the server", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, blob: async () => new Blob([bytes], { type: "image/jpeg" }) })));
      for (let i = 0; i < MAX_KEPT + 3; i++) await keepCover(`/audio/art/c${i}.jpg`);
      expect(keptCover(`/audio/art/c${MAX_KEPT - 1}.jpg`)).not.toBeNull();
      expect(keptCover(`/audio/art/c${MAX_KEPT}.jpg`)).toBeNull();
      resetKeptCoversForTests();
      vi.stubGlobal("window", undefined);
      await keepCover("/audio/art/server.jpg");
      expect(keptCover("/audio/art/server.jpg")).toBeNull();
    });

    it("writes a picture's bytes as base64, whatever their size", async () => {
      const big = new Uint8Array(0x8000 * 3 + 17).map((_, i) => (i * 7) % 256);
      const address = await dataAddress(new Blob([big], { type: "image/jpeg" }));
      expect(Buffer.from(address.replace(/^data:image\/jpeg;base64,/, ""), "base64").equals(Buffer.from(big))).toBe(true);
    });
  });
});

describe("a chant's page has no button that arrives late (the owner's note 61)", () => {
  // "if a button does come up or whatever, it doesn't mess up the screen and
  // move the whole entire UI". Walked on the 1.8 export: Psalm 135 from
  // English to Greek brought the words' sliders button beside Share, moved
  // Share 43px along and the page 8px down. Since r3-18 the button and its
  // sheet are gone (the English shows under the line being sung, the switch
  // stands on the words for every version), and Share stands alone in the
  // bar from the first frame. lib/chants/__tests__/chantPage.test.ts holds
  // every control's box.
  const page = fs.readFileSync("components/chants/ChantPage.tsx", "utf8");
  const words = fs.readFileSync("components/chants/ChantWords.tsx", "utf8");

  it("draws no words' button beside Share, and no sheet behind one", () => {
    expect(words).not.toContain("export function ChantWordsOptions");
    expect(words).not.toContain("<Sheet");
    expect(page).not.toContain("ChantWordsOptions");
    expect(page).not.toContain("data-chant-words-slot");
  });

  it("puts the icon across the top from the cover the Chants home kept, whole in its first frame", () => {
    // Going back and forth between Chants and a chant draws each from its
    // kept copy (note 58), so neither waits on its picture.
    expect(page).toMatch(/<ChantCover\s+cover=\{chant\.cover\}\s+size="hero"\s+picture="object-top"/);
    const html = render(createElement(ChantCover, { cover: { src: "/audio/art/david.v1.jpg", alt: "King David" }, size: "hero", picture: "object-top", className: "chant-hero bg-night ring-0" }));
    const box = /<div data-cover="img" class="([^"]*)"/.exec(html)?.[1] ?? "";
    // The page's classes win over the box's own ground and ring.
    expect(box.split(" ")).toEqual(expect.arrayContaining(["chant-hero", "bg-night", "ring-0"]));
    expect(box).not.toMatch(/\bbg-night-soft\b|\bring-1\b/);
    const img = /<img [^>]*>/.exec(html)?.[0] ?? "";
    expect(img).toContain("object-top");
    expect(img).not.toContain("object-[50%_20%]");
  });
});

describe("the player's picture", () => {
  it("is the plate when there is none, never an empty tile", () => {
    const html = render(createElement(CoverArt, { src: null, size: 48, className: "h-12 w-12" }));
    expect(html).toContain('data-cover="plate"');
    expect(html).toContain("cross-plate-mark");
    expect(html).not.toContain("bg-paper/10");
    expect([plateSize(340), plateSize(120), plateSize(48), plateSize(24)]).toEqual(["hero", "card", "thumb", "thumb"]);
  });

  it("is the plate in Now Playing for a chant with no cover, large and small", () => {
    const sheet = fs.readFileSync("components/player/NowPlayingSheet.tsx", "utf8");
    expect(sheet.match(/<CrossPlate\b/g)?.length).toBe(2);
    expect(fs.readFileSync("components/player/PrayWithChant.tsx", "utf8")).toContain("<CrossPlate");
  });

  it("draws a plate a disc can hold, with no words on it", () => {
    const html = render(createElement(CrossPlate, { size: "disc", caption: "English", className: "rounded-full size-9" }));
    expect(html).toContain("rounded-full size-9");
    expect(html).not.toContain("English");
  });
});

describe("the plate's cross", () => {
  const css = fs.readFileSync("app/globals.css", "utf8");

  it("glows white on the dark palettes and is the plain ink on Parchment", () => {
    expect(css).toMatch(/\.cross-plate-mark \{\s*filter: drop-shadow\(0 0 3px rgb\(255 255 255 \/ 0\.85\)\) drop-shadow\(0 0 10px rgb\(255 255 255 \/ 0\.35\)\);\s*\}/);
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] \.cross-plate-mark \{\s*filter: none;\s*\}/);
  });

  it("is black, white and grey only", () => {
    const plate = fs.readFileSync("components/ui/CrossPlate.tsx", "utf8");
    // The page's tokens and white, nothing tinted.
    expect(plate).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(plate).not.toMatch(/\b(gold|amber|yellow|red|blue|green)\b/i);
    expect(plate).toContain("bg-night-soft");
  });
});
