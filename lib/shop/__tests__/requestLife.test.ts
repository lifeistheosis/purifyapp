import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import profiledSaints from "@/data/calendar/profiled-saints.json";
import type { SaintBrief } from "@/lib/saints/brief";
import { iconRightsFor } from "@/lib/saints/iconRights";
import { REQUEST_WORD_KEY, requestLife, type RequestStatus } from "@/lib/shop/requestLife";
import { findSaints, requestSaint, saintByName, saintShortName } from "@/lib/shop/requestSaint";

/**
 * Requests A, "The saint's icon" (r3-19, the owner's pick of 2026-10-31). What
 * a reader would see if this broke: a request claiming its icon was found
 * after it moved on (the row keeps one status, so it cannot know); a face from
 * an icon whose rights nobody has settled; the five words in English in a
 * Russian app (build 85 wrote them into the component).
 */

const SAINTS = profiledSaints as SaintBrief[];
const ROOT = process.cwd();
const catalog = (code: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages", `${code}.json`), "utf8")) as Record<string, string>;
const LOCALES = fs.readdirSync(path.join(ROOT, "lib/i18n/messages")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));

describe("a request's life as marks", () => {
  const marks = (s: RequestStatus) => requestLife(s);

  it("draws Received, Being reviewed, We wrote to you, the step it is on lit", () => {
    expect(marks("new")).toMatchObject({ steps: ["new", "reviewing", "contacted"], marks: ["now", "todo", "todo"], lit: true, door: null });
    expect(marks("reviewing")).toMatchObject({ marks: ["done", "now", "todo"], lit: true, door: null });
  });

  it("draws Icon found only while it is the state, with the door to the saint's icons", () => {
    expect(marks("sourced")).toMatchObject({
      steps: ["new", "reviewing", "sourced", "contacted"],
      marks: ["done", "done", "now", "todo"],
      word: "sourced",
      lit: true,
      door: "icons",
    });
    for (const s of ["new", "reviewing", "contacted", "closed"] as const) {
      expect(marks(s).steps, s).not.toContain("sourced");
    }
  });

  it("settles We wrote to you and Closed: every mark done, the word plain", () => {
    expect(marks("contacted")).toMatchObject({ marks: ["done", "done", "done"], word: "contacted", lit: false, door: "email" });
    expect(marks("closed")).toMatchObject({ marks: ["done", "done", "done"], word: "closed", lit: false, door: null });
  });

  it("writes the five words in every catalog, translated", () => {
    const en = catalog("en");
    for (const code of LOCALES) {
      const m = catalog(code);
      for (const key of Object.values(REQUEST_WORD_KEY)) {
        expect(m[key], `${code} ${key}`).toBeTruthy();
        if (code !== "en") expect(m[key], `${code} ${key} is the English copied`).not.toBe(en[key]);
      }
    }
  });
});

describe("the saint a request is for", () => {
  it("shows his icon only where its rights are settled, and the lit cross otherwise", () => {
    const settled = SAINTS.find((s) => s.iconUrl && iconRightsFor(s.iconUrl));
    const unsettled = SAINTS.find((s) => s.iconUrl && !iconRightsFor(s.iconUrl));
    expect(settled, "a saint with a settled icon").toBeDefined();
    expect(requestSaint(settled!.slug)?.icon).toBe(settled!.iconUrl);
    if (unsettled) expect(requestSaint(unsettled.slug)?.icon).toBeNull();
    // Whatever the search offers, it never offers an icon without its rights.
    for (const q of ["st", "ma", "jo", "gr", "her", "theo"]) {
      for (const s of findSaints(q, 20)) {
        if (s.icon) expect(iconRightsFor(s.icon), `${q}: ${s.slug}`).not.toBeNull();
      }
    }
  });

  it("is the library's saint, with his name and the first part of his epithet", () => {
    expect(requestSaint("herman-of-alaska")).toMatchObject({ slug: "herman-of-alaska", name: "St. Herman of Alaska", line: "Monk of Valaam" });
    expect(requestSaint("no-such-saint")).toBeNull();
    expect(requestSaint(null)).toBeNull();
  });

  it("finds him as the reader types, a name that begins with it first, accents off", () => {
    const found = findSaints("Her").map((s) => s.slug);
    expect(found).toContain("herman-of-alaska");
    expect(findSaints("h")).toEqual([]);
    expect(findSaints("herman of alaska")[0]?.slug).toBe("herman-of-alaska");
    // "Phanourios" from the middle of the name, folded.
    expect(findSaints("phanour").map((s) => s.slug)).toContain("phanourios-the-newly-revealed");
  });

  it("knows a subject typed out in full, with or without his honorific", () => {
    expect(saintByName("St. Herman of Alaska")?.slug).toBe("herman-of-alaska");
    expect(saintByName("herman of alaska")?.slug).toBe("herman-of-alaska");
    expect(saintByName("The Synaxis of the Archangels")).toBeNull();
  });

  it("names him short on the door to his icons", () => {
    expect(saintShortName("St. Phanourios the Newly-Revealed")).toBe("St. Phanourios");
    expect(saintShortName("St. Herman of Alaska")).toBe("St. Herman");
  });
});
