import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CAMPAIGN_COLS, PLACE_TOWN_MAX, cleanTown, publicCampaign, townFits } from "@/lib/campaigns/model";
import { placeCountries, placeText } from "@/lib/campaigns/words";
import en from "@/lib/i18n/messages/en.json";
import { COUNTRIES } from "@/lib/onboarding/clergy";

/**
 * A campaign's place (1.9; his words: "Allow them to add a location"; the
 * notes, 2.9, 3.6 and 4.6).
 *
 * A country from the list the app already has, and a town or region its
 * creator types. Optional, and off to begin with. What this file holds:
 *
 *   never an address        a town is letters: no digit at all, so no street
 *                           number, no postcode and no telephone;
 *   never from the device   it is typed and chosen. Nothing in the campaigns'
 *                           files asks a device or a network address where
 *                           it is;
 *   the country alone       for a campaign a parent or guardian makes for a
 *   for a child             child (the server's rule is held in
 *                           routes.test.ts; the screen's here);
 *   said the same           "Thessaloniki, Greece" on the page, in the
 *   everywhere              moderators' list and on the start screen's row.
 *
 * What would go wrong if this broke: a street and a number beside a sick
 * person's first name, shown to everyone in Community; or a child's town.
 * A place narrows who a first name is (the notes, 4.1), which is why it is
 * kept this coarse.
 *
 * The server's side (a country of the list, the link and the word filter,
 * the child's rule) is routes.test.ts, "starting a campaign".
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("a town or region as typed", () => {
  it("is letters of any script, with the marks a place's name carries", () => {
    for (const town of ["Thessaloniki", "Θεσσαλονίκη", "Нови Сад", "Saint-Étienne", "St. Louis", "Coeur d'Alene", "Coeur d’Alene", "القاهرة", "თბილისი", "काठमाडौँ", "Mt. Athos", "Rio de Janeiro"]) {
      expect(cleanTown(town), town).toBe(town);
      expect(townFits(town), town).toBe(true);
    }
  });

  it("is never an address: no digit anywhere, so no street number, postcode or telephone", () => {
    for (const not of ["12 Olive Tree Street", "Athens 10558", "10558", "+30 210 555 0100", "Flat 3", "Zone ٣", "Sector ३", "B2B"]) {
      expect(cleanTown(not), not).toBeNull();
      expect(townFits(not), not).toBe(false);
    }
  });

  it("is nothing else either: no sign, no slash, no comma, and two letters at least", () => {
    for (const not of ["a@b", "Athens/Piraeus", "Athens, Greece", "<b>Athens</b>", "x", "-Athens", "Athens-", "'Athens", "Athens (centre)", "Athens!", "🙂 Athens"]) {
      expect(cleanTown(not), JSON.stringify(not)).toBeNull();
    }
    for (const not of [null, undefined, 12, {}, ["Athens"]]) expect(cleanTown(not)).toBeNull();
  });

  it("is kept with its spaces gathered and its ends trimmed, sixty characters at most", () => {
    expect(cleanTown("  New   York  ")).toBe("New York");
    // A line break or a tab is a space like any other: none survives.
    expect(cleanTown("New\nYork")).toBe("New York");
    expect(cleanTown("New\t\r\nYork")).toBe("New York");
    expect(cleanTown("a".repeat(PLACE_TOWN_MAX))).toBe("a".repeat(PLACE_TOWN_MAX));
    expect(cleanTown("a".repeat(PLACE_TOWN_MAX + 1))).toBeNull();
    expect(PLACE_TOWN_MAX).toBe(60);
  });

  it("fits when nothing is typed: a country alone is a place", () => {
    expect(townFits("")).toBe(true);
    expect(townFits("   ")).toBe(true);
  });
});

describe("what a reader is handed", () => {
  const row = { id: "a", title: "For Maria", intention: "healing", for_whom: "living", subject_name: "Maria", days: 7, status: "active", created_at: "2026-11-10T00:00:00.000Z" };

  it("the country and the town as they were kept", () => {
    expect(publicCampaign({ ...row, place_country: "GR", place_name: "Thessaloniki" })).toMatchObject({ place_country: "GR", place_name: "Thessaloniki" });
    expect(publicCampaign({ ...row, place_country: "GR", place_name: null })).toMatchObject({ place_country: "GR", place_name: null });
    expect(publicCampaign(row)).toMatchObject({ place_country: null, place_name: null });
  });

  it("never a town without its country, and never a town that is not one, whatever a row holds", () => {
    expect(publicCampaign({ ...row, place_country: null, place_name: "Thessaloniki" })).toMatchObject({ place_country: null, place_name: null });
    expect(publicCampaign({ ...row, place_country: "Greece", place_name: "Thessaloniki" })).toMatchObject({ place_country: null, place_name: null });
    expect(publicCampaign({ ...row, place_country: "GR", place_name: "12 Olive Tree Street" })).toMatchObject({ place_country: "GR", place_name: null });
    expect(publicCampaign({ ...row, place_country: 30, place_name: 12 })).toMatchObject({ place_country: null, place_name: null });
  });

  it("is read by every read of a campaign", () => {
    const cols = CAMPAIGN_COLS.split(",").map((c) => c.trim());
    expect(cols).toContain("place_country");
    expect(cols).toContain("place_name");
  });
});

describe("how a place is said", () => {
  // The two isolates set the creator's typing apart from the line's own direction.
  const town = (name: string) => `\u2068${name}\u2069`;

  it("the town, then the country in the reader's own language", () => {
    expect(placeText({ place_country: "GR", place_name: "Thessaloniki" }, "en")).toBe(`${town("Thessaloniki")}, Greece`);
    expect(placeText({ place_country: "GR", place_name: "Θεσσαλονίκη" }, "el")).toBe(`${town("Θεσσαλονίκη")}, Ελλάδα`);
    expect(placeText({ place_country: "RS", place_name: "Нови Сад" }, "sr")).toBe(`${town("Нови Сад")}, Србија`);
  });

  it("the country alone when no town was given, and nothing when there is no place", () => {
    expect(placeText({ place_country: "GR", place_name: null }, "en")).toBe("Greece");
    expect(placeText({ place_country: null, place_name: null }, "en")).toBe("");
    expect(placeText({}, "en")).toBe("");
    // A town with no country is no place.
    expect(placeText({ place_country: null, place_name: "Thessaloniki" }, "en")).toBe("");
  });

  it("with the comma a language writes: Arabic's and Urdu's own", () => {
    expect(placeText({ place_country: "EG", place_name: "القاهرة" }, "ar")).toBe(`${town("القاهرة")}، مصر`);
    expect(placeText({ place_country: "PK", place_name: "لاہور" }, "ur")).toBe(`${town("لاہور")}، پاکستان`);
  });

  it("falls back to the code itself for a code no device can name", () => {
    expect(placeText({ place_country: "ZZ", place_name: null }, "en")).not.toBe("");
  });
});

describe("the countries a creator chooses from", () => {
  it("every country of the app's list, once, by its name in the reader's language", () => {
    const list = placeCountries("en", null);
    expect(list.map((c) => c.code).sort()).toEqual([...COUNTRIES].sort());
    const names = list.map((c) => c.name);
    expect(names).toEqual([...names].sort(new Intl.Collator("en").compare));
    expect(list.find((c) => c.code === "GR")?.name).toBe("Greece");
    expect(placeCountries("el", null).find((c) => c.code === "GR")?.name).toBe("Ελλάδα");
  });

  it("the device's own first, and no other moved", () => {
    const list = placeCountries("en", "GR");
    expect(list[0].code).toBe("GR");
    expect(list).toHaveLength(COUNTRIES.length);
    expect(list.filter((c) => c.code === "GR")).toHaveLength(1);
    const rest = list.slice(1).map((c) => c.name);
    expect(rest).toEqual([...rest].sort(new Intl.Collator("en").compare));
    // A region the app does not list moves nothing.
    expect(placeCountries("en", "ZZ").map((c) => c.code)).toEqual(placeCountries("en", null).map((c) => c.code));
  });

  it("each also found by its name in English, its code and the short name readers type", () => {
    const greek = placeCountries("el", null);
    expect(greek.find((c) => c.code === "GR")?.terms).toBe("Greece GR");
    expect(greek.find((c) => c.code === "US")?.terms).toBe("United States US USA");
    expect(greek.find((c) => c.code === "GB")?.terms).toBe("United Kingdom GB UK");
  });
});

describe("the screens", () => {
  const start = read("components/campaigns/StartCampaign.tsx");

  it("the start screen sends what its row says: a town that is not one is never sent", () => {
    expect(start).toContain("const place = country ? { country, town: forChild ? null : cleanTown(town) } : null;");
    expect(start).toContain("const placeLine = place ? placeText({ place_country: place.country, place_name: place.town }, locale) : t(\"common.optional\");");
    expect(start).toMatch(/circleId: kept \? kept\.id : null,\n\s+place,\n/);
  });

  it("the start screen keeps the country alone for a child, and asks for no town there", () => {
    expect(start).toContain('const forChild = whom === "living" && consent === "guardian";');
    expect(start).toContain("{country && !forChild ? (");
    expect(start).toContain('{country && forChild ? t("campaigns.new.placeChild") : t("campaigns.new.placeNote")}');
  });

  it("the town is typed in its writer's own direction, held to sixty, and said when it is not a town", () => {
    const field = /<input\s+dir="auto"\s+id="campaign-town"[\s\S]*?\/>/.exec(start)?.[0] ?? "";
    expect(field).toContain("maxLength={PLACE_TOWN_MAX}");
    expect(field).toContain("aria-invalid={townFits(town) ? undefined : true}");
    expect(start).toMatch(/\{townFits\(town\) \? null : \(\s*<p role="alert"[^>]*>\s*\{t\("campaigns\.err\.place"\)\}/);
  });

  it("the page and the moderators' list say it with the same words", () => {
    expect(read("components/campaigns/CampaignPage.tsx")).toContain("const place = placeText(campaign, locale);");
    expect(read("components/campaigns/CampaignModeration.tsx")).toContain("const place = placeText(c, locale);");
    // The moderator reads it before anyone else does.
    const mod = read("lib/campaigns/moderation.ts");
    expect(/const WAITING_COLS =\s*"([^"]+)"/.exec(mod)?.[1]).toMatch(/place_country, place_name/);
  });

  it("its words are in the catalog, and none of them is an em dash", () => {
    const words = en as Record<string, string>;
    for (const key of ["campaigns.new.place", "campaigns.new.placeTown", "campaigns.new.placeNote", "campaigns.new.placeChild", "campaigns.err.place"]) {
      expect(words[key], key).toBeTruthy();
      expect(words[key], key).not.toMatch(/\u2014/);
    }
    // The line that names what a place is says what it is never.
    expect(words["campaigns.new.placeNote"]).toMatch(/never an address/);
  });
});

describe("never from the device", () => {
  const files = (dir: string): string[] =>
    readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? (e.name === "__tests__" ? [] : files(`${dir}/${e.name}`)) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : [],
    );

  it("nothing in the campaigns' files asks a device, or a network address, where it is", () => {
    const all = [...files("lib/campaigns"), ...files("components/campaigns"), ...files("app/api/campaigns")];
    expect(all.length).toBeGreaterThan(30);
    for (const file of all) {
      const code = read(file);
      expect(code, file).not.toMatch(/geolocation|getCurrentPosition|watchPosition/i);
      expect(code, file).not.toMatch(/analytics\/geo|x-forwarded-for|cf-ipcountry|x-vercel-ip/i);
    }
  });

  it("the device's languages order the list and nothing more: the region read from them is sent nowhere", () => {
    const start = read("components/campaigns/StartCampaign.tsx");
    // One use: the order of the countries.
    expect(start.match(/deviceRegion\(/g)).toHaveLength(1);
    expect(start).toMatch(/placeCountries\(locale, deviceRegion\(/);
    // What is sent is the creator's own choice.
    expect(start).not.toMatch(/useState<string \| null>\(deviceRegion/);
    expect(start).toContain("const [country, setCountry] = useState<string | null>(null);");
  });
});
