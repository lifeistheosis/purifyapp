// A saint's picture whose licence asks that its maker be named (CC BY, CC
// BY-SA): St Mark of Ephesus's icon, published by its painters, the Eleon
// icon-painting workshop, under CC BY 2.0 (the owner's word of 2026-11-11),
// and St Victorinus's fresco, photographed by Urharec under CC BY-SA 3.0. The
// arbiter, 2026-11-11, 15:11 UTC, approving Updates 2's recommendation: a line
// under the picture on his page names the maker with the licence's deed and
// the maker's page; the credits page says "Icon by" for a painter; every small
// face says the credit to a screen reader and opens his page; the widget and
// the Discord picture show the plate for it; the website's search-engine
// picture names the maker and the licence; a journal banner and a shared
// picture never show it. No line under every face.
//
// What a reader, a painter or a photographer would notice if this broke: the
// workshop's icon drawn with no one named (which its licence forbids), a
// credit that names the photographer of a painter's own icon, or the picture
// on the home screen with no way to its credit.

import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PictureCredit, PictureCreditNote } from "@/components/saints/PictureCredit";
import { SaintHeroPicture } from "@/components/saints/SaintHeroPicture";
import { renderArt } from "@/lib/desktop/artRender";
import { CC_LICENCES, creditFor, isCcLicence } from "@/lib/credits/photos";
import { CREDITED_SAINT_PICTURES, creditWords, saintPictureCredit } from "@/lib/credits/saintPictures";
import { COVERS } from "@/lib/journal/covers";
import { ICON_RIGHTS, ICONS_URL_PREFIX } from "@/lib/saints/iconRights";
import { SAINT_HEROES } from "@/lib/saints/heroes";
import { SAINTS } from "@/lib/saints/saints";
import { saintImage } from "@/lib/seo/jsonld";
import { SHAREABLE_ICONS } from "@/lib/today/saintFaces";
import { patronFacts } from "@/lib/widget/state";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const MARK = "/saints/icons/mark-of-ephesus.jpg";
const VICTORINUS = "/saints/icons/victorinus-of-pettau.jpg";
const EM_DASH = String.fromCharCode(0x2014);
// The words with no catalog: t() hands back the key, so the key is what shows.
const t = (key: string, r?: Record<string, string | number>) => `${key}${r?.name !== undefined ? `[${r.name}]` : ""}`;

describe("the saints' pictures that ask for their maker to be named", () => {
  it("are listed small for the faces, exactly as the rights registry has them", () => {
    const fromRegistry = Object.entries(ICON_RIGHTS).filter(([, row]) => row.status === "verified" && isCcLicence(row.license));
    expect(Object.keys(CREDITED_SAINT_PICTURES).sort()).toEqual(fromRegistry.map(([file]) => `${ICONS_URL_PREFIX}${file}`).sort());
    for (const [file, row] of fromRegistry) {
      if (row.status !== "verified" || !isCcLicence(row.license)) continue;
      expect(CREDITED_SAINT_PICTURES[`${ICONS_URL_PREFIX}${file}`], file).toEqual({
        name: row.credit,
        kind: row.creditAs ?? "photograph",
        licence: row.license,
        deed: CC_LICENCES[row.license],
        source: row.creditPage ?? row.evidenceUrl,
      });
      // And the credits page lists each the same way.
      expect(creditFor(`${ICONS_URL_PREFIX}${file}`), file).toMatchObject({ photographer: row.credit, kind: row.creditAs ?? "photograph", licence: row.license, source: row.creditPage ?? row.evidenceUrl });
    }
    expect(saintPictureCredit("/saints/icons/john-chrysostom.v2.jpg")).toBeNull();
    expect(saintPictureCredit(undefined)).toBeNull();
  });

  it("St Mark's icon names its painters, the Eleon workshop, under CC BY 2.0, and links to the workshop's own page", () => {
    expect(SAINTS.find((s) => s.slug === "mark-of-ephesus")?.iconUrl).toBe(MARK);
    expect(fs.existsSync(path.join(ROOT, "public", MARK))).toBe(true);
    expect(saintPictureCredit(MARK)).toEqual({
      name: "Eleon icon-painting workshop (Иконописная мастерская Елеон)",
      kind: "icon",
      licence: "CC BY 2.0",
      deed: "https://creativecommons.org/licenses/by/2.0/",
      source: "https://www.flickr.com/photos/107233269@N08/20781338902/",
    });
    // The row records the licence, the workshop as the painter's own publisher, and his word.
    const iconRights = read("lib/saints/iconRights.ts");
    expect(iconRights).toContain('"Yes to both", relayed by the arbiter at 14:54 UTC');
    expect(iconRights).toContain("which the workshop photographed and published itself, on its own");
    // St Victorinus's fresco names its photographer.
    expect(saintPictureCredit(VICTORINUS)).toMatchObject({ name: "Urharec", kind: "photograph", licence: "CC BY-SA 3.0" });
  });

  it("the credits page says Icon by for a painter, in every language, the name kept whole in its own direction", () => {
    const page = read("app/(app)/credits/page.tsx");
    expect(page).toContain('<T k={c.kind === "icon" ? "credits.iconBy" : "credits.by"} replacements={{ name: isolatedName(c.photographer) }} />');
    for (const file of fs.readdirSync(path.join(ROOT, "lib/i18n/messages"))) {
      const catalog = JSON.parse(read(`lib/i18n/messages/${file}`)) as Record<string, string>;
      expect(catalog["credits.iconBy"], file).toContain("{name}");
      expect(catalog["credits.iconBy"].includes(EM_DASH), file).toBe(false);
      expect(catalog["credits.iconBy"], file).not.toBe(catalog["credits.by"]);
    }
    expect(creditWords(MARK, t)).toBe(" (credits.iconBy[⁨Eleon icon-painting workshop (Иконописная мастерская Елеон)⁩], CC BY 2.0)");
    expect(creditWords(VICTORINUS, t)).toBe(" (credits.by[⁨Urharec⁩], CC BY-SA 3.0)");
    expect(creditWords("/saints/icons/basil-the-great.jpg", t)).toBe("");
  });

  it("his page names the maker in a line under his picture, with the licence's deed and the maker's page", () => {
    const html = renderToStaticMarkup(createElement(SaintHeroPicture, { name: "St. Mark of Ephesus", iconUrl: MARK, hero: null }));
    // (React puts a preload for the high-priority picture ahead of it.)
    expect(html).toContain('<figure data-saint-hero="plate"');
    expect(html).toContain(`data-picture-credit="${MARK}"`);
    expect(html).toContain('href="https://creativecommons.org/licenses/by/2.0/"');
    expect(html).toContain('href="https://www.flickr.com/photos/107233269@N08/20781338902/"');
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("<figcaption"));
    // A picture that asks no credit has no line.
    const plain = renderToStaticMarkup(createElement(SaintHeroPicture, { name: "St. Basil the Great", iconUrl: "/saints/icons/basil-the-great.jpg", hero: null }));
    expect(plain).not.toContain("figcaption");
    expect(renderToStaticMarkup(createElement(PictureCredit, { src: "/saints/icons/basil-the-great.jpg" }))).toBe("");
    // A saint with a wide picture shows that one, so no credited icon may belong to such a saint.
    for (const src of Object.keys(CREDITED_SAINT_PICTURES)) {
      const saint = SAINTS.find((s) => s.iconUrl === src);
      expect(saint, src).toBeDefined();
      expect(SAINT_HEROES[saint!.slug], saint!.slug).toBeUndefined();
    }
  });

  it("every small face says the credit to a screen reader, and none draws a line", () => {
    const note = renderToStaticMarkup(createElement(PictureCreditNote, { src: MARK }));
    expect(note).toMatch(/^<span class="sr-only" data-picture-credit-note="\/saints\/icons\/mark-of-ephesus\.jpg">/);
    expect(renderToStaticMarkup(createElement(PictureCreditNote, { src: "/saints/icons/basil-the-great.jpg" }))).toBe("");
    // Each face that draws a saint's picture carries the note (or, where its button is named by
    // aria-label, the credit in that label).
    const faces: Record<string, string> = {
      "components/saints/SaintIcon.tsx": "<PictureCreditNote src={saint.iconUrl} />",
      "components/search/SearchRows.tsx": "<PictureCreditNote src={src} />",
      "components/theology/FatherFace.tsx": "<PictureCreditNote src={picture?.src} />",
      "components/shop/SaintAvatar.tsx": "<PictureCreditNote src={saint.iconUrl} />",
      "components/bible/SaintIcon.tsx": "<PictureCreditNote src={src} />",
      "components/calendar/PhoneCalendar.tsx": "<PictureCreditNote src={saint?.iconUrl} />",
      "components/history/EventPeople.tsx": "<PictureCreditNote src={saint?.iconUrl} />",
      "components/today/GreetingHeader.tsx": "<PictureCreditNote src={lead.iconUrl} />",
      "components/today/NameDayCard.tsx": "<PictureCreditNote src={saint.iconUrl} />",
      "components/today/SaintWindow.tsx": "<PictureCreditNote src={picture?.src} />",
      "components/community/profile/ProfileCard.tsx": "<PictureCreditNote src={facts?.icon} />",
      "components/saints/web/WebConstellation.tsx": 'creditWords(node.person.icon, t) : ""}`}',
    };
    for (const [file, line] of Object.entries(faces)) expect(read(file), file).toContain(line);
    expect(read("components/saints/web/WebConstellation.tsx")).toContain("<PictureCreditNote src={center.icon} />");
  });

  it("never stands where no one can be named: the widget, the Discord picture, a journal banner, a shared picture", async () => {
    // The widget draws the saint's name alone.
    expect(patronFacts({ kind: "saint", slug: "mark-of-ephesus" }, "2026-10-14", "new")?.icon).toBeNull();
    expect(patronFacts({ kind: "saint", slug: "nicholas-the-wonderworker" }, "2026-10-14", "new")?.icon).toMatch(/^public\/saints\/icons\//);
    // The Discord picture is Purify's own mark, as for a saint with no picture.
    const asked: string[] = [];
    const load = async (rel: string) => {
      asked.push(rel);
      return fs.readFileSync(path.join(ROOT, "public", rel));
    };
    await renderArt({ kind: "art", saint: "mark-of-ephesus", gilded: false }, load);
    expect(asked).toEqual(["/icon-512.png"]);
    for (const src of Object.keys(CREDITED_SAINT_PICTURES)) {
      const file = src.slice(ICONS_URL_PREFIX.length);
      expect(COVERS.some((c) => c.id === file), file).toBe(false);
      expect(SHAREABLE_ICONS.has(file), file).toBe(false);
    }
  });

  it("the website's search-engine picture names the maker and the licence", () => {
    expect(saintImage(MARK)).toEqual({
      "@type": "ImageObject",
      contentUrl: expect.stringMatching(/\/saints\/icons\/mark-of-ephesus\.jpg$/),
      url: expect.stringMatching(/\/saints\/icons\/mark-of-ephesus\.jpg$/),
      creator: { "@type": "Organization", name: "Eleon icon-painting workshop (Иконописная мастерская Елеон)" },
      creditText: "Icon by Eleon icon-painting workshop (Иконописная мастерская Елеон), CC BY 2.0",
      license: "https://creativecommons.org/licenses/by/2.0/",
      acquireLicensePage: "https://www.flickr.com/photos/107233269@N08/20781338902/",
    });
    expect(saintImage("/saints/icons/basil-the-great.jpg")).toMatch(/\/saints\/icons\/basil-the-great\.jpg$/);
  });
});
