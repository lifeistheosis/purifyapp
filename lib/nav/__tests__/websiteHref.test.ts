// A page the apps carry must not link, by a bare path, to something the
// apps' export sets aside. Found three times over on 2026-11-10
// (lib/nav/websiteHref.ts tells it): each was a tap that went nowhere.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { websiteHref } from "@/lib/nav/websiteHref";
import { SITE_URL } from "@/lib/site";

/** What only the website serves, as a reader's link would name it. */
const WEBSITE_ONLY = ["/support/contact", "/robots.txt", "/llms.txt", "/sitemap.xml"];

/** The trees that are themselves set aside, where such a link is at home. */
const AT_HOME = ["app/(app)/support/contact", "app/admin", "app/owner", "app/api", "app/invest", "app/(app)/shop/seller"];

function pages(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__" && !AT_HOME.some((home) => full === home)) pages(full, found);
    } else if (/\.tsx$/.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

describe("websiteHref", () => {
  it("leaves a path alone on the website", () => {
    expect(websiteHref("/robots.txt", false)).toBe("/robots.txt");
  });

  it("gives the website's own address in the apps", () => {
    expect(websiteHref("/support/contact", true)).toBe(`${SITE_URL.replace(/\/+$/, "")}/support/contact`);
    expect(websiteHref("llms.txt", true)).toBe(`${SITE_URL.replace(/\/+$/, "")}/llms.txt`);
  });

  it("no page under app/ links to a website-only address by a bare path", () => {
    const bare: string[] = [];
    for (const file of pages("app")) {
      const source = fs.readFileSync(file, "utf8");
      for (const target of WEBSITE_ONLY) {
        if (source.includes(`href="${target}"`)) bare.push(`${file}: href="${target}"`);
      }
    }
    expect(bare).toEqual([]);
  });
});
