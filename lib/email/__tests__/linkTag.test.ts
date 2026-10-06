// Every link to the site in an email says which email it was in
// (lib/email/linkTag.ts). What must NOT change matters as much: the
// unsubscribe link carries the reader's own token and has to work as before.

import { describe, expect, it } from "vitest";

import { TAG_PARAM } from "@/lib/analytics/tag";

import { tagEmailLinks, tagForSend, tagSiteLink } from "../linkTag";

const SITE = "https://purifyapp.net";
const TAG = "email-release-1.5";
const READER = "3f1c2a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f";

describe("one address", () => {
  it("is tagged when it is a page of ours", () => {
    expect(tagSiteLink(`${SITE}/whats-new`, TAG, SITE)).toBe(`${SITE}/whats-new?via=${TAG}`);
    expect(tagSiteLink(SITE, TAG, SITE)).toBe(`${SITE}/?via=${TAG}`);
    expect(tagSiteLink(`${SITE}/community#conversations`, TAG, SITE)).toBe(`${SITE}/community?via=${TAG}#conversations`);
    expect(tagSiteLink(`${SITE}/shop/orders/detail?id=42`, TAG, SITE)).toBe(`${SITE}/shop/orders/detail?id=42&via=${TAG}`);
  });

  it("is left alone when it leads anywhere else", () => {
    for (const other of [
      "https://play.google.com/store/apps/details?id=net.purifyapp.purify",
      "https://apps.apple.com/app/id6798897857",
      "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400",
      "https://purifyapp.net.example.org/whats-new",
      "mailto:lifeistheosis@gmail.com",
      "%%PURIFY_UNSUBSCRIBE%%",
      "",
    ]) {
      expect(tagSiteLink(other, TAG, SITE), other).toBe(other);
    }
  });

  it("never touches the unsubscribe link, an API address or the panels", () => {
    for (const kept of [
      `${SITE}/email/unsubscribe?t=${READER}&l=release_news`,
      `${SITE}/api/email/unsubscribe?t=${READER}&l=release_news`,
      `${SITE}/api/auth/callback?token_hash=abc&type=signup`,
      `${SITE}/admin?tab=calendar`,
      `${SITE}/admin/support`,
      `${SITE}/owner`,
    ]) {
      expect(tagSiteLink(kept, TAG, SITE), kept).toBe(kept);
    }
  });
});

describe("a finished email", () => {
  const html = [
    `<link href="https://fonts.googleapis.com/css2?family=Lora&amp;display=swap" rel="stylesheet">`,
    `<img src="${SITE}/purify-cross-mark.png" width="21" height="37" alt="Purify">`,
    `<a href="${SITE}/whats-new"><img src="${SITE}/whats-new/1.5/email.jpg" alt="Genesis 1"></a>`,
    `<a href="${SITE}/shop/orders/detail?id=42&amp;view=full#reviews">Your order</a>`,
    `<a href="${SITE}/whats-new">See everything that is new</a>`,
    `<a href="${SITE}/email/unsubscribe?t=${READER}&amp;l=release_news">Unsubscribe</a>`,
    `<a href="${SITE}">purifyapp.net</a>`,
    `<a href="https://tools.usps.com/go/TrackConfirmAction?tLabels=9400">Track it</a>`,
  ].join("\n");
  const text = [
    `See everything that is new: ${SITE}/whats-new`,
    `Your order is here (${SITE}/shop/orders/detail?id=42).`,
    `Unsubscribe: ${SITE}/email/unsubscribe?t=${READER}&l=release_news`,
  ].join("\n\n");
  const out = tagEmailLinks({ html, text, subject: "Purify 1.5" }, TAG, SITE);

  it("tags every link to a page of ours, in the HTML", () => {
    expect(out.html).toContain(`<a href="${SITE}/whats-new?via=${TAG}">See everything that is new</a>`);
    expect(out.html).toContain(`<a href="${SITE}/whats-new?via=${TAG}"><img`);
    expect(out.html).toContain(`<a href="${SITE}/?via=${TAG}">purifyapp.net</a>`);
  });

  it("keeps an ampersand written the way an attribute needs it, and the hash last", () => {
    expect(out.html).toContain(`href="${SITE}/shop/orders/detail?id=42&amp;view=full&amp;via=${TAG}#reviews"`);
  });

  it("leaves the unsubscribe button exactly as it was, token and list", () => {
    expect(out.html).toContain(`<a href="${SITE}/email/unsubscribe?t=${READER}&amp;l=release_news">Unsubscribe</a>`);
    expect(out.text).toContain(`Unsubscribe: ${SITE}/email/unsubscribe?t=${READER}&l=release_news`);
  });

  it("leaves pictures, fonts and other sites alone", () => {
    expect(out.html).toContain(`src="${SITE}/purify-cross-mark.png"`);
    expect(out.html).toContain(`src="${SITE}/whats-new/1.5/email.jpg"`);
    expect(out.html).toContain(`href="https://fonts.googleapis.com/css2?family=Lora&amp;display=swap"`);
    expect(out.html).toContain(`href="https://tools.usps.com/go/TrackConfirmAction?tLabels=9400"`);
  });

  it("tags the same links in the plain-text part, and keeps a sentence's own punctuation", () => {
    expect(out.text).toContain(`See everything that is new: ${SITE}/whats-new?via=${TAG}`);
    expect(out.text).toContain(`(${SITE}/shop/orders/detail?id=42&via=${TAG}).`);
  });

  it("carries the rest of the message through untouched", () => {
    expect(out.subject).toBe("Purify 1.5");
    // Exactly the links to our pages gained a tag: four in the HTML, two in the text.
    expect(out.html.split(`${TAG_PARAM}=${TAG}`).length - 1).toBe(4);
    expect(out.text?.split(`${TAG_PARAM}=${TAG}`).length ?? 0).toBe(3);
  });

  it("does nothing to an email with no text part but tag its HTML", () => {
    const only = tagEmailLinks({ html: `<a href="${SITE}/calendar">Open</a>` }, "email-weekly-2026-w38", SITE);
    expect(only.html).toBe(`<a href="${SITE}/calendar?via=email-weekly-2026-w38">Open</a>`);
    expect("text" in only).toBe(false);
  });
});

describe("the tag for one send", () => {
  it("is the mailing for an email to many readers", () => {
    expect(tagForSend({ kind: "release", dedupeKey: `release:1.5:${READER}`, userId: READER })).toBe("email-release-1.5");
    expect(tagForSend({ kind: "terms_changed", dedupeKey: `terms:2026-08-14:${READER}`, userId: READER })).toBe("email-terms-2026-08-14");
  });

  it("is the kind for everything else, whatever its key holds", () => {
    expect(tagForSend({ kind: "welcome", dedupeKey: `welcome:${READER}`, userId: READER })).toBe("email-welcome");
    expect(tagForSend({ kind: "order_confirmation" })).toBe("email-order-confirmation");
    expect(tagForSend({ kind: "name_day", dedupeKey: `name_day:st-nicholas:2026:${READER}`, userId: READER })).toBe("email-name-day");
  });

  it("never holds the reader", () => {
    for (const send of [
      { kind: "release", dedupeKey: `release:1.5:${READER}`, userId: READER },
      { kind: "release", dedupeKey: `release:1.5:${READER}`, userId: null },
      { kind: "welcome", dedupeKey: `welcome:${READER}`, userId: null },
    ]) {
      expect(tagForSend(send)).not.toContain(READER.slice(0, 8));
    }
  });
});
