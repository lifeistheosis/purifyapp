import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CLERGY_EVIDENCE_MAX, CLERGY_RANKS, CLERGY_TEXT_MAX } from "@/lib/profile/clergy";

import {
  ASSEMBLY_LIST,
  CHURCHES,
  CHURCH_NAME,
  COUNTRIES,
  LOCAL_CHURCH,
  NO_ANSWERS,
  OTHER,
  US_JURISDICTIONS,
  asksClergy,
  churchKey,
  churchOrder,
  clergyComplete,
  clergyRequestBody,
  clergySteps,
  countryName,
  countryOrder,
  deviceRegion,
  findCountries,
  isClergyRole,
  isClergyStep,
  isCountry,
  parishLine,
  parseClergyAnswers,
  usJurisdictionGroups,
  type ClergyAnswers,
} from "../clergy";

/**
 * "Are you a priest, a deacon, or a layman?" (1.8.x, the owner's note 54 of
 * 2026-10-31): who is asked, what follows, the lists, and what is sent.
 * The screens are clergySteps.test.ts, the flow's order flowSteps.test.ts,
 * the parish search lib/parishes/__tests__/usParishes.test.ts.
 */

const MESSAGES = path.join(process.cwd(), "lib/i18n/messages");
const catalog = (code: string) => JSON.parse(fs.readFileSync(path.join(MESSAGES, `${code}.json`), "utf8")) as Record<string, string>;
const LOCALES = fs.readdirSync(MESSAGES).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));

const us = (o: Partial<ClergyAnswers> = {}): ClergyAnswers => ({
  ...NO_ANSWERS,
  country: "US",
  jurisdiction: "oca",
  parish: { kind: "listed", id: "oca-washington-st-nicholas", name: "St. Nicholas Orthodox Cathedral and National War Memorial Shrine", city: "Washington", state: "DC", sample: true },
  ...o,
});

describe("who is asked", () => {
  it("asks the baptized Orthodox only: never a catechumen, an inquirer, or a reader who has not said", () => {
    expect(asksClergy("practicing")).toBe(true);
    expect(asksClergy("learning")).toBe(false);
    expect(asksClergy("inquirer")).toBe(false);
    expect(asksClergy(null)).toBe(false);
  });

  it("goes on to where they serve for a priest or a deacon, and for nobody else", () => {
    expect(isClergyRole("priest")).toBe(true);
    expect(isClergyRole("deacon")).toBe(true);
    expect(isClergyRole("layman")).toBe(false);
    expect(isClergyRole(null)).toBe(false);
  });
});

describe("what follows the question", () => {
  it("is nothing for a layman, or for a reader who skipped it", () => {
    expect(clergySteps("layman", "US")).toEqual([]);
    expect(clergySteps(null, null)).toEqual([]);
  });

  it("is where and the jurisdiction for a priest or deacon, and the parish only in the United States", () => {
    expect(clergySteps("priest", null)).toEqual(["clergyWhere", "clergyJurisdiction"]);
    expect(clergySteps("deacon", "GR")).toEqual(["clergyWhere", "clergyJurisdiction"]);
    expect(clergySteps("priest", "US")).toEqual(["clergyWhere", "clergyJurisdiction", "clergyParish"]);
    expect(clergySteps("deacon", "US")).toEqual(["clergyWhere", "clergyJurisdiction", "clergyParish"]);
  });

  it("knows its own screens from the rest of the flow", () => {
    expect(isClergyStep("clergyParish")).toBe(true);
    expect(isClergyStep("role")).toBe(false);
    expect(isClergyStep("rule")).toBe(false);
  });
});

describe("the jurisdictions in the United States", () => {
  it("are the Assembly's list as read on its own page, in its order and its words", () => {
    expect(ASSEMBLY_LIST).toEqual({ url: "https://www.assemblyofbishops.org/directories/jurisdictions", readOn: "2026-10-31" });
    expect(US_JURISDICTIONS.map((j) => j.name)).toEqual([
      "Greek Orthodox Archdiocese of America",
      "American Carpatho-Russian Orthodox Diocese of the USA",
      "Ukrainian Orthodox Church of the USA",
      "Albanian Orthodox Diocese",
      "Antiochian Orthodox Christian Archdiocese of North America",
      "The Moscow Patriarchal Parishes in the USA",
      "Russian Orthodox Church Outside of Russia",
      "Diocese of New Gracanica-Midwestern America",
      "Diocese of Western America",
      "Diocese of Eastern America",
      "Romanian Orthodox Metropolia of the Americas",
      "Bulgarian Eastern Orthodox Diocese of the USA, Canada, and Australia",
      "Georgian Apostolic Orthodox Church in North America",
      "Orthodox Church in America",
    ]);
  });

  it("stand under their Mother Churches as the page groups them", () => {
    expect(usJurisdictionGroups().map((g) => [g.mother, g.jurisdictions.length])).toEqual([
      ["constantinople", 4],
      ["antioch", 1],
      ["moscow", 2],
      ["serbia", 3],
      ["romania", 1],
      ["bulgaria", 1],
      ["georgia", 1],
      ["oca", 1],
    ]);
  });

  it("have unique ids, and a name for the request that says whose they are and fits its field", () => {
    expect(new Set(US_JURISDICTIONS.map((j) => j.id)).size).toBe(US_JURISDICTIONS.length);
    for (const j of US_JURISDICTIONS) {
      const named = j.request ?? j.name;
      expect(named.length, j.id).toBeLessThanOrEqual(CLERGY_TEXT_MAX);
      expect(named.length, j.id).toBeGreaterThanOrEqual(2);
    }
    for (const id of ["serbian-new-gracanica", "serbian-western", "serbian-eastern"]) {
      expect(US_JURISDICTIONS.find((j) => j.id === id)?.request).toContain("Patriarchate of Serbia");
    }
  });
});

describe("the local Churches", () => {
  it("are named in English for the team as en.json names them for readers", () => {
    const en = catalog("en");
    for (const c of CHURCHES) expect(en[churchKey(c)], c).toBe(CHURCH_NAME[c]);
  });

  it("have every name in every one of the 21 catalogs, translated", () => {
    expect(LOCALES).toHaveLength(21);
    const en = catalog("en");
    for (const code of LOCALES) {
      const m = catalog(code);
      for (const c of CHURCHES) {
        expect(m[churchKey(c)], `${code} ${c}`).toBeTruthy();
        if (code !== "en") expect(m[churchKey(c)], `${code} ${c}`).not.toBe(en[churchKey(c)]);
      }
    }
  });

  it("put a country's own Church first only where the Churches agree whose country it is", () => {
    for (const [country, church] of Object.entries(LOCAL_CHURCH)) {
      expect(isCountry(country), country).toBe(true);
      expect(CHURCHES, country).toContain(church);
    }
    // Claimed by two Churches, or the diaspora: no Church is put first.
    for (const country of ["UA", "MD", "EE", "MK", "CA", "GB", "DE", "AU", "US"]) expect(LOCAL_CHURCH[country], country).toBeUndefined();
    expect(LOCAL_CHURCH.GR).toBe("greece");
    expect(LOCAL_CHURCH.RO).toBe("romania");
  });

  it("list the country's Church first, then every other once, in alphabetical order of the reader's words", () => {
    const en = catalog("en");
    const nameOf = (c: (typeof CHURCHES)[number]) => en[churchKey(c)];
    const greece = churchOrder("GR", nameOf, "en");
    expect(greece.local).toBe("greece");
    expect(greece.rest).not.toContain("greece");
    expect(new Set([greece.local, ...greece.rest]).size).toBe(CHURCHES.length);
    const names = greece.rest.map(nameOf);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
    const canada = churchOrder("CA", nameOf, "en");
    expect(canada.local).toBeNull();
    expect(canada.rest).toHaveLength(CHURCHES.length);
  });
});

describe("where they serve", () => {
  it("offers every inhabited country once, each one the device can name", () => {
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
    for (const c of COUNTRIES) {
      expect(c).toMatch(/^[A-Z]{2}$/);
      expect(countryName(c, "en"), c).not.toBe(c);
    }
    expect(COUNTRIES).toContain("US");
    expect(COUNTRIES).not.toContain("AQ");
  });

  it("names countries in the reader's language", () => {
    expect(countryName("GR", "el")).toBe("Ελλάδα");
    expect(countryName("US", "en")).toBe("United States");
    expect(countryName("RS", "sr")).toBe("Србија");
  });

  it("puts the United States first, then the device's own country, then every other by name", () => {
    const { suggested, rest } = countryOrder("en", "GR");
    expect(suggested).toEqual(["US", "GR"]);
    expect(rest).not.toContain("US");
    expect(rest).not.toContain("GR");
    expect(suggested.length + rest.length).toBe(COUNTRIES.length);
    const names = rest.map((c) => countryName(c, "en"));
    expect(names).toEqual([...names].sort(new Intl.Collator("en").compare));
    expect(countryOrder("en", "US").suggested).toEqual(["US"]);
    expect(countryOrder("en", null).suggested).toEqual(["US"]);
  });

  it("reads the device's country from its language, and nothing from a tag that is not one", () => {
    expect(deviceRegion(["el-GR"])).toBe("GR");
    expect(deviceRegion(["ro"])).toBe("RO");
    expect(deviceRegion(["not a tag", "sr-Cyrl-RS"])).toBe("RS");
    expect(deviceRegion([])).toBeNull();
  });

  it("finds a country by its name in the reader's language or in English, accents aside, or by its code", () => {
    const all = [...COUNTRIES];
    expect(findCountries(all, "greece", "en")).toEqual(["GR"]);
    expect(findCountries(all, "Ελλάδα", "el")).toEqual(["GR"]);
    expect(findCountries(all, "ellada", "el")).toEqual([]);
    expect(findCountries(all, "greece", "el")).toEqual(["GR"]);
    expect(findCountries(all, "USA", "en")).toEqual(["US"]);
    expect(findCountries(all, "us", "en")).toContain("US");
    expect(findCountries(all, "romania", "ro")).toEqual(["RO"]);
    expect(findCountries(all, "  ", "en")).toEqual(all);
  });
});

describe("the answers", () => {
  it("are complete for a US priest with a jurisdiction and a parish, listed or typed", () => {
    expect(clergyComplete("priest", us())).toBe(true);
    expect(clergyComplete("deacon", us({ parish: { kind: "typed", name: "St. Mary", place: "Austin, TX" } }))).toBe(true);
  });

  it("are not complete without a parish in the United States, nor without a jurisdiction anywhere", () => {
    expect(clergyComplete("priest", us({ parish: null }))).toBe(false);
    expect(clergyComplete("priest", us({ parish: { kind: "typed", name: " ", place: "" } }))).toBe(false);
    expect(clergyComplete("priest", { ...NO_ANSWERS, country: "GR" })).toBe(false);
    expect(clergyComplete("priest", { ...NO_ANSWERS, country: "GR", jurisdiction: "greece" })).toBe(true);
  });

  it("need another jurisdiction named, and a jurisdiction that belongs to the country", () => {
    expect(clergyComplete("priest", { ...NO_ANSWERS, country: "DE", jurisdiction: OTHER, otherJurisdiction: "" })).toBe(false);
    expect(clergyComplete("priest", { ...NO_ANSWERS, country: "DE", jurisdiction: OTHER, otherJurisdiction: "ROCOR" })).toBe(true);
    // A US jurisdiction is not an answer outside the US, nor a local Church inside it.
    expect(clergyComplete("priest", { ...NO_ANSWERS, country: "DE", jurisdiction: "goa" })).toBe(false);
    expect(clergyComplete("priest", us({ jurisdiction: "greece" }))).toBe(false);
  });

  it("are nothing to send for a layman", () => {
    expect(clergyComplete("layman", us())).toBe(false);
    expect(clergyComplete(null, us())).toBe(false);
  });

  it("are read back from storage with anything that is not an answer dropped", () => {
    expect(parseClergyAnswers(null)).toEqual(NO_ANSWERS);
    expect(parseClergyAnswers("{not json")).toEqual(NO_ANSWERS);
    expect(parseClergyAnswers(JSON.stringify(us()))).toEqual(us());
    expect(parseClergyAnswers(JSON.stringify({ country: "XX", jurisdiction: "oca" }))).toEqual(NO_ANSWERS);
    // A parish outside the US, and a US jurisdiction in Greece, are dropped.
    expect(parseClergyAnswers(JSON.stringify({ country: "GR", jurisdiction: "goa", parish: us().parish }))).toEqual({ ...NO_ANSWERS, country: "GR" });
  });

  it("are the reader's own: never copied to the account's space and never counted", () => {
    const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
    for (const f of ["lib/onboarding/accountSync.ts", "lib/onboarding/count.ts", "lib/onboarding/counting.ts"]) {
      expect(read(f), f).not.toMatch(/readRole|readClergy|purify:clergy|purify:role/);
    }
  });
});

describe("the request", () => {
  const COUNTRY_EN = { countryEn: "United States" };

  it("asks for the seal and can grant nothing: rank, jurisdiction, parish and how to check, as the route takes them", () => {
    const body = clergyRequestBody("priest", us(), COUNTRY_EN);
    expect(Object.keys(body).sort()).toEqual(["evidence", "jurisdiction", "parish", "rank"]);
    expect(CLERGY_RANKS).toContain(body.rank);
    expect(body.jurisdiction).toBe("Orthodox Church in America");
    expect(body.jurisdiction.length).toBeGreaterThanOrEqual(2);
    expect(body.evidence.length).toBeGreaterThanOrEqual(10);
    expect(body.evidence.length).toBeLessThanOrEqual(CLERGY_EVIDENCE_MAX);
    expect(body).not.toHaveProperty("status");
  });

  it("carries the parish with its place, the country and where it came from", () => {
    const body = clergyRequestBody("deacon", us(), COUNTRY_EN);
    expect(body.rank).toBe("deacon");
    expect(body.parish).toMatch(/, Washington, DC$/);
    expect(body.parish!.length).toBeLessThanOrEqual(CLERGY_TEXT_MAX);
    expect(body.evidence).toContain("welcome questions");
    expect(body.evidence).toContain("Country they serve in: United States.");
    expect(body.evidence).toContain("SAMPLE list");
  });

  it("carries the parish exactly as they wrote it, the way the shipped screen takes it, and another jurisdiction as typed", () => {
    const body = clergyRequestBody(
      "priest",
      us({ jurisdiction: OTHER, otherJurisdiction: "  Holy Protection Monastery  ", parish: { kind: "typed", name: "Holy Protection", place: "Waterford, CT" } }),
      COUNTRY_EN,
    );
    expect(body.jurisdiction).toBe("Holy Protection Monastery");
    expect(body.parish).toBe("Holy Protection, Waterford, CT");
    expect(body.evidence).toContain("Jurisdiction typed in");
    expect(body.evidence).toContain("Parish as they wrote it.");
    expect(body.evidence).not.toContain("list (the SAMPLE");
  });

  it("carries a written parish with no city as its name alone", () => {
    const body = clergyRequestBody("deacon", us({ parish: { kind: "typed", name: "St. Mary", place: "  " } }), COUNTRY_EN);
    expect(body.parish).toBe("St. Mary");
  });

  it("names a local Church in English outside the US, with no parish", () => {
    const body = clergyRequestBody("priest", { ...NO_ANSWERS, country: "RO", jurisdiction: "romania" }, { countryEn: "Romania" });
    expect(body.jurisdiction).toBe("Patriarchate of Romania");
    expect(body.parish).toBeNull();
    expect(body.evidence).toContain("Country they serve in: Romania.");
  });

  it("cuts a long parish name, never its place", () => {
    const line = parishLine({ kind: "listed", id: "x", name: "A".repeat(30) + " " + "B".repeat(30) + " " + "C".repeat(30), city: "San Francisco", state: "CA", sample: false });
    expect(line.length).toBeLessThanOrEqual(CLERGY_TEXT_MAX);
    expect(line).toMatch(/…, San Francisco, CA$/);
  });
});
