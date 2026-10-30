// The Ecumenical Councils' pages (1.8, the owner's pick of r3-03 on
// 2026-10-30: "the selection page for A, and the Nicaea at a glance for C"),
// the parts worked out from the registry: where a council met, its author
// line and its era, its documents' windows onto its icon, and its Fathers'
// faces. What a reader would notice if this broke: a council's book cut on
// the wrong part of its icon or two of its books the same, a Father shown
// with an icon nobody has checked, or St. Cyprian drawn without his icon.

import { describe, expect, it } from "vitest";

import { COUNCILS, getCouncil } from "../councils";
import { fatherFaces, firstNameOf } from "../fathers";
import {
  CROPS,
  authorLine,
  councilFocus,
  councilLine,
  councilPicture,
  councilsInOrder,
  cropOf,
  editionOf,
  eraOfYear,
  isCirca,
  ordinalKey,
  placeOf,
  principalDocument,
  shortName,
} from "../page";
import { COVER_ART } from "@/lib/reading/coverArt";
import { SAINTS } from "@/lib/saints/saints";

const council = (slug: string) => {
  const c = getCouncil(slug);
  if (!c) throw new Error(slug);
  return c;
};

describe("a council's head", () => {
  it("says where it met without the modern name or the building", () => {
    expect(placeOf("Nicaea in Bithynia (modern İznik, Türkiye)")).toBe("Nicaea in Bithynia");
    expect(placeOf("Carthage, in the basilica of Faustus (near modern Tunis, Tunisia)")).toBe("Carthage");
    expect(placeOf("Chalcedon (modern Kadıköy, İstanbul, Türkiye), across the Bosphorus from Constantinople")).toBe("Chalcedon");
    expect(placeOf("Laodicea on the Lycus, in Phrygia Pacatiana (near modern Denizli, Türkiye)")).toBe("Laodicea on the Lycus");
    expect(placeOf("Sardica (modern Sofia, Bulgaria)")).toBe("Sardica");
    for (const c of COUNCILS) {
      expect(placeOf(c.location).length, c.slug).toBeGreaterThan(3);
      expect(placeOf(c.location), c.slug).not.toMatch(/modern|[(),]/);
    }
  });

  it("names it without the year its byname carries, and knows the years that are approximate", () => {
    expect(shortName("Council of Carthage (256)")).toBe("Council of Carthage");
    expect(shortName("Council of Neocaesarea (about 315)")).toBe("Council of Neocaesarea");
    expect(shortName("First Council of Nicaea")).toBe("First Council of Nicaea");
    const circa = COUNCILS.filter(isCirca).map((c) => c.slug).sort();
    expect(circa).toEqual(["gangra", "laodicea", "neocaesarea-315"]);
  });

  it("gives every book the council and its year as the author line", () => {
    expect(authorLine(council("first-nicaea"))).toBe("First Council of Nicaea, 325");
    expect(authorLine(council("carthage-256"))).toBe("Council of Carthage, 256");
    expect(authorLine(council("gangra"))).toBe("Council of Gangra, about 340");
    expect(authorLine(council("jerusalem-1672"))).toBe("Synod of Jerusalem, 1672");
    for (const c of COUNCILS) expect(authorLine(c), c.slug).toMatch(/, (about )?\d{3,4}$/);
  });

  it("names the edition without its publisher and notes", () => {
    expect(
      editionOf(
        "Schaff & Wace, Nicene and Post-Nicene Fathers, Series II, Vol. 14: The Seven Ecumenical Councils (Edinburgh: T&T Clark, 1900). Public domain.",
      ),
    ).toBe("Schaff & Wace, Nicene and Post-Nicene Fathers, Series II, Vol. 14");
    expect(editionOf("Ante-Nicene Fathers, Vol. 6 (ed. Alexander Roberts, 1886), under Malchion, public domain.")).toBe("Ante-Nicene Fathers, Vol. 6");
  });

  it("files each council in the reading room's era", () => {
    expect(eraOfYear(256)).toBe("early");
    expect(eraOfYear(325)).toBe("councils");
    expect(eraOfYear(787)).toBe("councils");
    expect(eraOfYear(1672)).toBe("afterByzantium");
  });

  it("says which council it is in the reader's language", () => {
    expect(ordinalKey(council("first-nicaea"))).toBe("study.councils.firstEcumenical");
    expect(ordinalKey(council("second-nicaea"))).toBe("study.councils.seventhEcumenical");
    expect(ordinalKey(council("sardica"))).toBe("study.councils.localCouncil");
  });
});

describe("the selection page", () => {
  it("lists the seven in their order with a picture and a line each, then the local councils by year", () => {
    const { seven, local } = councilsInOrder();
    expect(seven.map((c) => c.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const c of seven) {
      expect(councilPicture(c.slug, false)?.src, c.slug).toMatch(/^\/history\/media\/.+\.jpg$/);
      expect(councilPicture(c.slug, true)?.src, c.slug).toMatch(/^https:\/\/.+\/history\/media\//);
      expect(councilFocus(c.slug), c.slug).toMatch(/^\d+% \d+%$/);
      expect(councilLine(c).length, c.slug).toBeLessThan(160);
    }
    expect(local).toHaveLength(12);
    expect(local.map((c) => c.year)).toEqual([...local.map((c) => c.year)].sort((a, b) => a - b));
    // A local council has no picture of its own: its books are the room's plate.
    for (const c of local) expect(councilPicture(c.slug, false), c.slug).toBeNull();
  });
});

describe("a council's books", () => {
  it("gives every document of the seven a window of its own onto the council's icon", () => {
    for (const c of councilsInOrder().seven) {
      const own = c.documents.filter((d) => !d.href);
      const windows = own.map((d) => CROPS[c.slug]?.[d.slug]);
      expect(windows.every(Boolean), c.slug).toBe(true);
      const seen = new Set(windows.map((w) => `${w!.x}/${w!.y}`));
      expect(seen.size, `${c.slug}: two books on one window`).toBe(own.length);
      for (const w of windows) {
        expect(w!.x).toBeGreaterThanOrEqual(0);
        expect(w!.x).toBeLessThanOrEqual(1);
        expect(w!.y).toBeGreaterThanOrEqual(0);
        expect(w!.y).toBeLessThanOrEqual(1);
        expect(w!.zoom).toBeGreaterThanOrEqual(1);
      }
      // No window for a document that is not there.
      for (const slug of Object.keys(CROPS[c.slug] ?? {})) expect(own.map((d) => d.slug), `${c.slug}/${slug}`).toContain(slug);
    }
    // The design's own three for Nicaea: the Creed on the throne with the Gospel, the letter and the canons either side.
    expect(cropOf("first-nicaea", "the-symbol-of-the-faith")).toMatchObject({ x: 0.5, y: 0.44 });
    expect(cropOf("first-nicaea", "the-synodal-letter").x).toBeLessThan(0.5);
    expect(cropOf("first-nicaea", "the-twenty-canons").x).toBeGreaterThan(0.5);
  });

  it("stands each council among the others by its own document", () => {
    const principal = Object.fromEntries(councilsInOrder().seven.map((c) => [c.slug, principalDocument(c)?.slug]));
    expect(principal).toEqual({
      "first-nicaea": "the-symbol-of-the-faith",
      "first-constantinople": "the-niceno-constantinopolitan-creed",
      ephesus: "the-second-letter-of-cyril",
      chalcedon: "the-definition-of-faith",
      "second-constantinople": "the-sentence-of-the-synod",
      "third-constantinople": "the-definition-of-faith",
      "second-nicaea": "the-decree-on-the-holy-icons",
    });
    for (const c of COUNCILS) expect(principalDocument(c), c.slug).toBeDefined();
  });
});

describe("the Holy Fathers principally associated", () => {
  const all = COUNCILS.flatMap((c) => fatherFaces(c, false).map((f) => ({ council: c.slug, ...f })));
  const unique = [...new Map(all.map((f) => [f.href ?? f.name, f])).values()];

  it("names thirty-six Fathers, St. Cyprian with his page now (the sheet's one-line fix)", () => {
    expect(unique).toHaveLength(36);
    const cyprian = council("carthage-256").principalFathers?.find((f) => /Cyprian/.test(f.name));
    expect(cyprian?.slug).toBe("cyprian-of-carthage");
    for (const f of all) if (f.href) expect(SAINTS.some((s) => `/saints/${s.slug}` === f.href), f.href).toBe(true);
  });

  it("shows a face only where the reading room's covers have a settled picture of him", () => {
    const pictured = unique.filter((f) => f.picture);
    // Fourteen when the sheet was drawn, and St. Cyprian with his slug.
    expect(pictured).toHaveLength(15);
    for (const f of pictured) {
      const slug = f.href!.replace("/saints/", "");
      expect(COVER_ART[slug], slug).toBeDefined();
    }
    // An icon in the library with no rights record is never a face here.
    const library = SAINTS.filter((s) => s.iconUrl && !COVER_ART[s.slug]).map((s) => `/saints/${s.slug}`);
    for (const f of all) if (f.href && library.includes(f.href)) expect(f.picture, f.name).toBeUndefined();
    // Drawn by name: a halo and his initial.
    for (const f of all.filter((x) => !x.picture)) expect(f.initial, f.name).toMatch(/^\p{Lu}$/u);
  });

  it("puts each Father's first name under his face, and tells two of one name apart", () => {
    expect(firstNameOf("St. Pope Leo I (the Great)")).toBe("Leo");
    expect(firstNameOf("St. Hosius (Ossius) of Cordova")).toBe("Hosius");
    expect(firstNameOf("Dositheos II, Patriarch of Jerusalem")).toBe("Dositheos");
    expect(fatherFaces(council("first-nicaea"), false).map((f) => f.label)).toEqual([
      "Athanasius",
      "Alexander",
      "Hosius",
      "Eustathius",
      "Nicholas",
      "Spyridon",
    ]);
    const second = fatherFaces(council("first-constantinople"), false).map((f) => f.label);
    expect(second).toContain("Theologian");
    expect(second).toContain("Nyssa");
    expect(new Set(second).size).toBe(second.length);
  });

  it("asks for a picture where the build says: the website's own, or the website's address in the apps", () => {
    const athanasius = fatherFaces(council("first-nicaea"), true)[0];
    expect(athanasius.picture?.src).toMatch(/^https:\/\/.+\/covers\/authors\/athanasius-the-great\.v1\.jpg$/);
    expect(fatherFaces(council("first-nicaea"), false)[0].picture?.src).toBe("/covers/authors/athanasius-the-great.v1.jpg");
  });
});
