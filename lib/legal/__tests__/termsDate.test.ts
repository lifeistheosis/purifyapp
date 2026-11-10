import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { TERMS_VERSION } from "../version";

/**
 * The terms' date and their version move together (his item 96: the new
 * terms take effect the day 1.9 ships).
 *
 * What would go wrong if they parted: a page that says one date while every
 * reader is asked to accept, and Admin's notice announces, another; or a new
 * date on the page that nobody is asked to accept and nobody is told about.
 */
describe("the terms", () => {
  it("say they take effect on the day their version names", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "components/legal/TermsText.tsx"), "utf8");
    const day = new Date(`${TERMS_VERSION}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    expect(page).toContain(`Effective ${day}.`);
    expect(page.match(/Effective [A-Z][a-z]+ \d{1,2}, \d{4}/g)).toEqual([`Effective ${day}`]);
  });
});
