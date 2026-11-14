import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { emailLayout } from "../layout";
import { buildEmail } from "../templates/build";
import { weeklyBody } from "../templates/contentBodies";
import { renderMarketing } from "../marketing";
import { EMAIL_THEMES, KIT_DARK, KIT_NIGHT, T } from "../theme";

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
  // The owner's brief (2026-11-13): drawn with the kit's pieces, on the theme's tokens only.
  "lib/admin/ownerBrief.ts",
  // The design kit's look (2026-11-13, his "yes look"): its colours are the theme's KIT_* only.
  "lib/email/kit.ts",
  "lib/email/kitLetters.ts",
  // The retention emails' look (his yes, 2026-11-13 about 20:47 UTC): the kit's, on the theme's KIT_* only.
  "lib/email/retention/look.ts",
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
      // A numeric entity (&#9679; the dot beside a fast) is a character, not a colour.
      for (const hex of src.match(/(?<!&)#[0-9a-fA-F]{3,8}\b/g) ?? []) offenders.push(`${rel}: ${hex}`);
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

describe("the account and order emails' shell wears Dark (build 95; his word, 2026-11-13 about 18:53 UTC)", () => {
  // "Dark for everyone": the shell every account, order, shop and support
  // email is built in takes the same slots as the kit's letters, so one email
  // and the next are one palette. Until then its inks were near Dark and not
  // it (a purple grey for quiet words, a page that was the app's well).
  const night = EMAIL_THEMES.night;

  it("takes each colour from Dark's own slots", () => {
    expect(night.canvas).toBe(KIT_DARK.ground);
    expect(night.card).toBe(KIT_DARK.raised);
    expect(night.heading).toBe(KIT_DARK.ink);
    expect(night.body).toBe(KIT_DARK.body);
    expect(night.muted).toBe(KIT_DARK.quiet);
    expect(night.label).toBe(KIT_DARK.quiet);
    expect(night.line).toBe(KIT_DARK.line);
    expect(night.accent).toBe(KIT_DARK.button);
    expect(night.onAccent).toBe(KIT_DARK.onButton);
    expect(night.mark).toBe(KIT_DARK.ink);
    expect(night.link).toBe(KIT_DARK.ink);
    expect(night.well).toBe(KIT_NIGHT.ground);
  });

  it("draws Unsubscribe 44px tall, the house's least for a thing to tap (it was 35px)", () => {
    const html = emailLayout({ heading: "x", bodyHtml: "" });
    const style = /<a href="[^"]*" style="([^"]*)">Unsubscribe<\/a>/.exec(html)?.[1] ?? "";
    const px = (re: RegExp) => Number(re.exec(style)?.[1] ?? 0);
    // Its line and the padding above and below it, inside the pill's 1px edge.
    expect(px(/line-height:(\d+)px/) + 2 * px(/padding:(\d+)px/)).toBeGreaterThanOrEqual(44);
  });

  it("is the mode every email is sent in, and writes no colour that Dark does not have", () => {
    expect(T).toBe(night);
    const dark = new Set([...Object.values(KIT_DARK), KIT_NIGHT.ground]);
    const html = emailLayout({ heading: "On its way", bodyHtml: "<p>Body</p>", eyebrow: "Purify Shop" });
    for (const hex of html.match(/#[0-9a-f]{6}\b/gi) ?? []) expect(dark.has(hex.toLowerCase()), hex).toBe(true);
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

  it("fetches no font: opening a letter calls nobody (145)", () => {
    expect(html).not.toMatch(/<link\b/);
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(html).toContain("Georgia");
  });

  // Round 1's small-line rule (his "yes to all", 2026-11-13 about 20:47 UTC):
  // sentence case, never capitals spaced out (docs/brand/design-kit.md,
  // "Labels are sentence case"). The arbiter's call at 22:50 brought it to
  // this shell: the small line over the heading, the labels over a value and
  // a day, and the wordmark in the kit's own letters (docs/brand/kit/email/
  // build.mjs, its masthead). They were 11px capitals spaced 1.6 to 5px.
  it("sets its small lines in sentence case, never capitals spaced out", () => {
    const letter = buildEmail({
      subject: "s",
      heading: "h",
      eyebrow: "Your account",
      paragraphs: ["One."],
      highlight: { label: "Tracking number", value: "1Z999AA1" },
      lines: [
        { day: "Sunday, September 20", name: "Great-martyr Eustathius", kind: "saint" },
        { day: "Monday, September 21", name: "Leave-taking of the Nativity of the Theotokos", kind: "feast" },
      ],
      footer: "f",
    }).html;
    expect(letter).not.toMatch(/text-transform:\s*uppercase/i);
    for (const words of ["Your account", "Tracking number", "Sunday, September 20"]) {
      const style = new RegExp(`<p style="([^"]*)">${words}`).exec(letter)?.[1];
      expect(style, words).toBeDefined();
      expect(style, words).not.toMatch(/letter-spacing/);
      expect(style, words).toContain("font-size:12px;line-height:18px;font-weight:600;");
    }
  });

  it("writes its wordmark in the kit's own letters: Purify in the serif, at 19px, in the ink", () => {
    const style = /<p style="([^"]*)">Purify<\/p>/.exec(html)?.[1] ?? "";
    expect(style).toContain("font-family:Lora,Georgia");
    expect(style).toContain("font-size:19px;line-height:26px;");
    expect(style).toContain(`color:${T.heading}`);
    expect(style).not.toMatch(/letter-spacing|uppercase/);
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
    // The kit marks a feast in words, in the rubric's colour, as well as setting it heavier.
    expect(email.html).toContain(">Feast</span>");
    expect(body.paragraphs).toEqual([]);
  });

  it("still says every day in the plain-text part", () => {
    expect(email.text).toContain("Sunday, September 20: Great-martyr Eustathius");
    expect(email.text).toContain("Dates follow the new calendar.");
  });

  it("says which list it came from, in its foot, and its day at the masthead", () => {
    expect(email.html).toContain("turned on &quot;The Sunday calendar&quot; in your Purify settings");
    expect(email.html).toMatch(/font-weight:600;color:[^"]*">Sunday, September 20<\/td>/);
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
