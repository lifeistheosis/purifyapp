import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { marketingFooter } from "../consent";
import { emailLayout } from "../layout";
import { LIST_LABEL, MARKETING_LISTS, RELEASE_NEWS } from "../lists";
import { buildEmail } from "../templates/build";
import { releaseBody } from "../templates/contentBodies";
import { UNSUBSCRIBE_PAGE, UNSUBSCRIBE_SLOT, fillUnsubscribe, hasUnsubscribeSlot, unsubscribeUrl } from "../unsubscribe";

/**
 * Every email Purify sends ends on an unsubscribe button, and the release
 * email goes to every account that has not said stop.
 *
 * Both are the owner's, 2026-10-06: "ensure all emails we send has a
 * unsubscribe button", and, of a release email, "that's just updates to the
 * application". What is held here is that no email can be built without the
 * button, that no email can leave with its link unfilled, that the release
 * email says truthfully why it arrived, and that the privacy page says what
 * the code does.
 */

vi.mock("server-only", () => ({}));

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const TOKEN = "3f1c2a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f";
const ADDRESS = "1 Example Street, Tampa, FL";

describe("the button", () => {
  it("is in every email the shell builds, whatever the template passes", () => {
    const bare = emailLayout({ heading: "Your order", bodyHtml: "<p>Thank you.</p>" });
    expect(bare).toMatch(new RegExp(`<a href="${UNSUBSCRIBE_SLOT}"[^>]*>Unsubscribe</a>`));
    const built = buildEmail({ subject: "s", heading: "h", paragraphs: ["One line."], footer: "Purify." });
    expect(built.html).toMatch(new RegExp(`<a href="${UNSUBSCRIBE_SLOT}"[^>]*>Unsubscribe</a>`));
    // The text part has no buttons, so it says the same in words.
    expect(built.text).toContain(`Unsubscribe: ${UNSUBSCRIBE_SLOT}`);
  });

  it("leads to the reader's own page when the email was built for one reader", () => {
    const href = unsubscribeUrl(TOKEN, "shop_offers");
    const built = buildEmail({ subject: "s", heading: "h", paragraphs: ["One line."], footer: "Purify.", unsubscribeHref: href });
    expect(built.html).toContain(`href="${href.replace(/&/g, "&amp;")}"`);
    expect(built.text).toContain(`Unsubscribe: ${href}`);
    expect(hasUnsubscribeSlot(built)).toBe(false);
  });

  it("is drawn once, as a button and not a line of small print", () => {
    const html = emailLayout({ heading: "h", bodyHtml: "" });
    expect(html.match(/>Unsubscribe</g)?.length).toBe(1);
    expect(html).toMatch(/border-radius:999px[^>]*>\s*<a href="%%PURIFY_UNSUBSCRIBE%%"/);
  });
});

describe("filling the slot", () => {
  const mail = { html: `<a href="${UNSUBSCRIBE_SLOT}">Unsubscribe</a>`, text: `Unsubscribe: ${UNSUBSCRIBE_SLOT}`, subject: "s" };

  it("puts the reader's link in both parts, written for an attribute in the HTML", () => {
    const url = unsubscribeUrl(TOKEN, "release_news");
    const out = fillUnsubscribe(mail, url);
    expect(out.html).toBe(`<a href="${UNSUBSCRIBE_PAGE}?t=${TOKEN}&amp;l=release_news">Unsubscribe</a>`);
    expect(out.text).toBe(`Unsubscribe: ${UNSUBSCRIBE_PAGE}?t=${TOKEN}&l=release_news`);
    expect(out.subject).toBe("s");
    expect(hasUnsubscribeSlot(out)).toBe(false);
  });

  it("gives the page itself when nobody's token is known", () => {
    expect(unsubscribeUrl(null)).toBe(UNSUBSCRIBE_PAGE);
    expect(unsubscribeUrl(undefined, "shop_offers")).toBe(UNSUBSCRIBE_PAGE);
    expect(unsubscribeUrl(TOKEN)).toBe(`${UNSUBSCRIBE_PAGE}?t=${TOKEN}`);
    expect(fillUnsubscribe(mail, UNSUBSCRIBE_PAGE).html).toContain(`href="${UNSUBSCRIBE_PAGE}"`);
  });

  it("leaves an email alone when its link is already in", () => {
    const done = { html: '<a href="https://x/u">Unsubscribe</a>' };
    expect(fillUnsubscribe(done, UNSUBSCRIBE_PAGE)).toBe(done);
  });

  it("is not a URL, so a slot that was missed is never opened as one", () => {
    expect(UNSUBSCRIBE_SLOT).not.toMatch(/^https?:|\//);
  });
});

describe("no email leaves with the slot showing", () => {
  // Source-reading guards, in the idiom of lib/admin/__tests__/fetchGuards.test.ts:
  // they cannot prove a send, they prove nobody has taken the fill out.
  it("the last step before Resend fills whatever is still open", () => {
    const send = read("lib/email/send.ts");
    expect(send).toContain("fillUnsubscribe(");
    // What Resend is handed is the filled email, in both parts.
    const handed = send.slice(send.indexOf("resend.emails.send({"));
    expect(handed).toContain("html: mail.html");
    expect(handed).toContain("text: mail.text");
    expect(handed).not.toContain("opts.html");
  });

  it("both ways of sending fill the reader's own link first", () => {
    const ledger = read("lib/email/ledger.ts");
    expect(ledger.match(/await withUnsubscribe\(/g)?.length).toBe(2);
    expect(ledger).toContain("unsubscribeTokenFor(");
  });

  it("there is one place an email is handed to Resend", () => {
    const callers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && entry.name !== "__tests__") walk(p);
        } else if (/\.tsx?$/.test(entry.name) && /(?<![A-Za-z])sendEmail\(/.test(fs.readFileSync(p, "utf8"))) {
          callers.push(path.relative(ROOT, p).replace(/\\/g, "/"));
        }
      }
    };
    walk(path.join(ROOT, "lib"));
    walk(path.join(ROOT, "app"));
    expect(callers.sort()).toEqual(["lib/email/ledger.ts", "lib/email/send.ts"]);
  });

  it("every file that builds an email builds it in the shared shell", () => {
    // An email with markup of its own would have no button. None exists; this keeps it so.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && entry.name !== "__tests__") walk(p);
        } else if (/\.tsx?$/.test(entry.name)) {
          const text = fs.readFileSync(p, "utf8");
          const sends = /sendEmailOnce\(|sendLoggedEmail\(/.test(text);
          const ownMarkup = /<!doctype html|<html[\s>]/i.test(text);
          if (sends && ownMarkup) offenders.push(path.relative(ROOT, p).replace(/\\/g, "/"));
        }
      }
    };
    walk(path.join(ROOT, "lib"));
    walk(path.join(ROOT, "app"));
    expect(offenders).toEqual([]);
  });
});

describe("release news", () => {
  it("is a list of its own, and the only one that starts on", () => {
    expect(MARKETING_LISTS).toContain(RELEASE_NEWS);
    expect(LIST_LABEL[RELEASE_NEWS]).toBe("New versions of Purify");
    const sql = read("supabase/migrations/20261011000000_release_news.sql");
    expect(sql).toMatch(/release_news boolean not null default true/);
    // The lists a reader has to turn on are not touched by it.
    expect(sql).not.toMatch(/set\s+(shop_offers|product_updates|community_digest)/i);
    expect(sql).not.toMatch(/drop |delete |truncate /i);
  });

  it("says truthfully why it arrived, where a list says what the reader turned on", () => {
    const release = marketingFooter({ list: RELEASE_NEWS, postalAddress: ADDRESS });
    expect(release).toContain("because you have a Purify account");
    expect(release).toContain("a few times a year");
    expect(release).not.toContain("you turned on");
    expect(release).toContain(ADDRESS);
    expect(marketingFooter({ list: "shop_offers", postalAddress: ADDRESS })).toContain('you turned on "New in the shop"');
  });

  it("leaves out a point that sells, since the letter goes to every account as news", () => {
    const note = { version: "9.1", kind: "A lamp", blurb: "What changed." };
    const letter = {
      picture: null,
      intro: "Here is what is new.",
      closing: "The library stays free.",
      points: [
        { emoji: "🔥", name: "A lamp", text: "It burns through the night." },
        { emoji: "✨", name: "Better with Plus", text: "More for members.", sells: true },
        { emoji: "🛒", name: "The shop", text: "Ten percent off.", sells: true },
      ],
    };
    const body = releaseBody(note, letter);
    expect(body.points?.map((p) => p.name)).toEqual(["A lamp"]);
    // And nothing about selling rides along on the point that stays.
    expect(body.points?.[0]).toEqual({ emoji: "🔥", name: "A lamp", text: "It burns through the night." });
    // A letter with only selling points has no points, and falls back to the note's own blurb.
    expect(releaseBody(note, { ...letter, points: letter.points.slice(1) }).paragraphs).toEqual(["What changed."]);
  });

  it("only the release email may be given every account", () => {
    const route = read("app/api/admin/email/campaign/route.ts");
    expect(route).toContain('audience: draft.list === RELEASE_NEWS ? "all_accounts" : draft.list');
    const drafts = read("lib/email/campaignDrafts.ts");
    expect(drafts.match(/list: RELEASE_NEWS/g)?.length).toBe(1);
    expect(drafts.slice(drafts.indexOf('case "release"'), drafts.indexOf('case "shop_new"'))).toContain("list: RELEASE_NEWS");
  });

  it("is what the privacy page tells readers", () => {
    const page = read("app/(app)/privacy/page.tsx").replace(/\s+/g, " ");
    expect(page).toContain("No marketing email unless you ask for it.");
    expect(page).toContain("when a new version of Purify is released, we email every account");
    expect(page).toContain("on unless you turn it off");
    expect(page).toContain("Every email we send ends with an unsubscribe button.");
  });
});
