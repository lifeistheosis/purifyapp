import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { emailLayout } from "../layout";
import { buildEmail } from "../templates/build";
import { weeklyBody } from "../templates/contentBodies";
import { renderMarketing } from "../marketing";
import { EMAIL_THEMES, T } from "../theme";

/**
 * One look, held in one file.
 *
 * Before lib/email/theme.ts every email module carried its own #1a1720 and
 * #8a8580, which is how the shop's mail, the support mail and the funnel's mail
 * ended up three different products. The first test here fails on a colour
 * written anywhere but the theme, so the next email cannot start a fourth.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const EMAIL_FILES = [
  "lib/email/layout.ts",
  "lib/email/blocks.ts",
  "lib/email/templates/build.ts",
  "lib/email/templates/account.ts",
  "lib/email/templates/orders.ts",
  "lib/email/templates/contentBodies.ts",
  "lib/email/templates/shopBodies.ts",
  "lib/email/templates/marketingBodies.ts",
  "lib/email/marketing.ts",
  "lib/email/consent.ts",
  "lib/shop/orderEmails.ts",
  "lib/shop/sellerEmails.ts",
  "lib/eikonBox/dropEmails.ts",
  "lib/support/ticketEmails.ts",
];

const WEEK = [
  { day: "Sunday, September 20", name: "Great-martyr Eustathius", kind: "saint" as const, date: new Date("2026-09-20T00:00:00Z"), slug: null },
  { day: "Wednesday, September 23", name: "Conception of the Forerunner", kind: "feast" as const, date: new Date("2026-09-23T00:00:00Z"), slug: "forerunner" },
];

describe("the email theme", () => {
  it("is the only place an email colour is written", () => {
    const offenders: string[] = [];
    for (const rel of EMAIL_FILES) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      for (const hex of src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) offenders.push(`${rel}: ${hex}`);
    }
    expect(offenders, "colours belong in lib/email/theme.ts, not in a template").toEqual([]);
  });

  it("gives every mode a full set of tokens", () => {
    for (const [name, mode] of Object.entries(EMAIL_THEMES)) {
      for (const [key, value] of Object.entries(mode)) {
        expect(value, `${name}.${key}`).not.toBeUndefined();
        if (typeof value === "string" && value.startsWith("#")) {
          expect(value, `${name}.${key}`).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
      // A near-white accent on a near-white heading would lose the button.
      expect(mode.accent, `${name}.accent`).not.toBe(mode.card);
      expect(mode.link, `${name}.link`).not.toBe(mode.body);
    }
  });
});

describe("the shell", () => {
  const html = emailLayout({ heading: "On its way", bodyHtml: "<p>Body</p>", eyebrow: "Purify Shop" });

  it("wears the active mode and says Purify without loading an image", () => {
    expect(html).toContain(T.canvas);
    expect(html).toContain(T.card);
    expect(html).toContain(">Purify</p>");
    expect(html).toContain(`content="${T.scheme}"`);
  });

  it("escapes the heading exactly once", () => {
    const amp = emailLayout({ heading: "Icons & prints", bodyHtml: "" });
    expect(amp).toContain("Icons &amp; prints");
    expect(amp).not.toContain("&amp;amp;");
  });

  it("keeps the footer as HTML, so an unsubscribe link survives", () => {
    const withLink = emailLayout({ heading: "x", bodyHtml: "", footer: '<a href="https://x/u">Unsubscribe</a>' });
    expect(withLink).toContain('<a href="https://x/u">Unsubscribe</a>');
  });
});

describe("the week ahead", () => {
  const body = weeklyBody({ lines: WEEK, saint: { name: "Apostle John", slug: "apostle-john" } });
  const email = renderMarketing(body, "product_updates", "3f1c2a9e-0000-4000-8000-000000000000", "PO Box 123");

  it("lists the days instead of running them together, and marks the feast", () => {
    expect(email.html).toContain("Sunday, September 20");
    expect(email.html).toContain("Conception of the Forerunner");
    expect(email.html).toContain("&middot; Feast");
    expect(body.paragraphs).toEqual([]);
  });

  it("still says every day in the plain-text part", () => {
    expect(email.text).toContain("Sunday, September 20: Great-martyr Eustathius");
    expect(email.text).toContain("Dates follow the new calendar.");
  });

  it("says which list it came from, above the heading", () => {
    expect(email.html).toContain("The library");
  });
});

describe("a built email", () => {
  it("carries the highlight, the button and the sign-off", () => {
    const e = buildEmail({
      subject: "s",
      heading: "h",
      paragraphs: ["One."],
      highlight: { label: "Tracking number", value: "1Z999AA1" },
      action: { label: "Track your parcel", href: "https://ups.com/track" },
      footer: "f",
    });
    expect(e.html).toContain("Tracking number");
    expect(e.html).toContain("1Z999AA1");
    expect(e.html).toContain("https://ups.com/track");
    expect(e.html).toContain("Edgar, the Purify Team");
    expect(e.text).toContain("Tracking number: 1Z999AA1");
  });
});
