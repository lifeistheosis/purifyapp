import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import sharp from "sharp";
import { afterAll, describe, expect, it, vi } from "vitest";

import { SITE_URL } from "@/lib/site";
import { ENTRIES } from "@/lib/whatsNew/entries";
import { RELEASE_EMAIL } from "@/lib/whatsNew/releaseEmail";
import { CURRENT_VERSION, featureRelease } from "@/lib/whatsNew/version";

import { checkEmailCopy } from "../doctrine";
import { renderMarketing } from "../marketing";
import { escapeHtml } from "../send";
import { releaseBody } from "../templates/contentBodies";
import { bodyLines } from "../templates/marketingBodies";
import { EMAIL_THEMES, type EmailMode } from "../theme";
import { explainEmail } from "./emailCopyHelpers";

/**
 * The release email for the release this checkout IS, built the way the
 * campaign route builds it, from the committed note and the release's own
 * letter (lib/whatsNew/releaseEmail.ts).
 *
 * It exists because of 1.5. The send route would have refused that email
 * outright, because the note says "streak" and the copy rules read the word
 * as pressure, and nothing showed it until somebody pressed send. Now a
 * release whose email cannot be sent fails here first.
 *
 * `node scripts/release.mjs email` runs this file with RELEASE_EMAIL_PREVIEW
 * set, and the last test then writes the email as a page, in each of the four
 * reading modes, for a person to open and read before anything is sent.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");
const TOKEN = "3f1c2a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f";
// The real address is a server setting. A preview written without it says so
// in the footer, where a made-up address would read as the real one.
const ADDRESS = process.env.EMAIL_POSTAL_ADDRESS?.trim() || "(the postal address set on the server)";
const PREVIEW = process.env.RELEASE_EMAIL_PREVIEW?.trim();
const EM_DASH = String.fromCharCode(0x2014);

// A patch announces nothing of its own: the email is its release's.
const ANNOUNCED = featureRelease(CURRENT_VERSION);
const entry = ENTRIES.find((e) => e.version === ANNOUNCED);
const letter = RELEASE_EMAIL.version === ANNOUNCED ? RELEASE_EMAIL : null;

describe("the letter written for a release", () => {
  it("never belongs to a release that has not happened", () => {
    expect(ENTRIES.some((e) => e.version === RELEASE_EMAIL.version), RELEASE_EMAIL.version).toBe(true);
  });

  it("is a handful of points, each a mark, a short name and a line", () => {
    expect(RELEASE_EMAIL.points.length).toBeLessThanOrEqual(10);
    for (const pt of RELEASE_EMAIL.points) {
      expect(pt.emoji.trim().length, pt.name).toBeGreaterThan(0);
      expect(pt.name.length, pt.name).toBeLessThanOrEqual(40);
      // The full stop after a name is the layout's, so a name has none of its own.
      expect(pt.name, pt.name).not.toMatch(/[.:!?]$/);
      expect(pt.text.length, pt.name).toBeLessThanOrEqual(230);
      expect(pt.text, pt.name).toMatch(/\.$/);
    }
    expect(JSON.stringify(RELEASE_EMAIL)).not.toContain(EM_DASH);
  });
});

describe.runIf(entry)(`the release email for ${ANNOUNCED}`, () => {
  const body = releaseBody(entry!, letter);
  const email = renderMarketing(body, "product_updates", TOKEN, ADDRESS);

  it("can be sent: the words pass the rules a release note is held to", () => {
    // What the campaign route checks, and then everything a reader is sent.
    const v = checkEmailCopy({ subject: body.subject, body: bodyLines(body).join("\n\n") }, { naming: true });
    expect(v, explainEmail(v)).toEqual([]);
    const whole = checkEmailCopy({ subject: email.subject, body: email.text }, { naming: true });
    expect(whole, explainEmail(whole)).toEqual([]);
  });

  it("has every line it sends in what the route checks", () => {
    const checked = bodyLines(body).join("\n\n");
    for (const pt of body.points ?? []) expect(checked, pt.name).toContain(`${pt.name}. ${pt.text}`);
    for (const line of [...body.paragraphs, ...(body.after ?? [])]) expect(checked, line).toContain(line);
  });

  it("says the release's name in the note's own words, and leads to the note", () => {
    expect(email.subject).toContain(`Purify ${ANNOUNCED}`);
    expect(email.subject).not.toContain(`Purify ${ANNOUNCED}.`);
    if (entry!.kind) {
      expect(email.html).toContain(escapeHtml(entry!.kind));
      expect(email.text).toContain(entry!.kind);
    }
    expect(email.html).toContain("/whats-new");
  });

  it("is a letter and not the changelog", () => {
    // Read aloud in about a minute and a half. The lines of the note are on /whats-new.
    // The words a reader reads; a picture's alt text is said in place of it, not as well as it.
    const read = [
      body.deck ?? "",
      ...body.paragraphs,
      ...(body.points ?? []).map((pt) => `${pt.name}. ${pt.text}`),
      ...(body.after ?? []),
    ];
    expect(read.join(" ").split(/\s+/).length).toBeLessThan(260);
    // Gmail cuts a message at 102 KB of HTML and hides the rest, the
    // unsubscribe link with it, behind "View entire message".
    expect(Buffer.byteLength(email.html, "utf8")).toBeLessThan(40_000);
  });

  const pictures = letter ? [letter.picture, ...letter.points.map((pt) => pt.picture)].filter((x) => x != null) : [];

  it.runIf(pictures.length)("shows pictures that exist, are JPEGs, and say what they show", async () => {
    for (const picture of pictures) {
      const file = path.join(ROOT, "public", picture.src);
      expect(fs.existsSync(file), picture.src).toBe(true);
      const meta = await sharp(file).metadata();
      // Outlook on Windows draws no WebP, and an email picture cannot fall back.
      expect(meta.format, picture.src).toBe("jpeg");
      expect([meta.width, meta.height], picture.src).toEqual([picture.width, picture.height]);
      expect(fs.statSync(file).size, picture.src).toBeLessThan(200_000);
      expect(picture.alt.length, picture.src).toBeGreaterThan(20);
      // Sent with the whole address, drawn at half its width, and said in words too.
      expect(email.html).toContain(`alt="${escapeHtml(picture.alt)}"`);
      expect(email.html).toContain(`${picture.src}"`);
      expect(email.html).not.toContain(`src="${picture.src}"`);
      expect(email.text).toContain(picture.alt);
    }
  });
});

describe.runIf(entry && PREVIEW)("the preview", () => {
  afterAll(() => {
    vi.doUnmock("../theme");
    vi.resetModules();
  });

  it("is written in each reading mode, for a person to read before the send", async () => {
    const dir = path.resolve(ROOT, PREVIEW!);
    fs.mkdirSync(dir, { recursive: true });
    const site = SITE_URL.replace(/\/$/, "");
    const local = pathToFileURL(path.join(ROOT, "public")).href;

    for (const mode of Object.keys(EMAIL_THEMES) as EmailMode[]) {
      vi.resetModules();
      vi.doMock("../theme", async (original) => {
        const real = await original<typeof import("../theme")>();
        return { ...real, EMAIL_MODE: mode, T: real.EMAIL_THEMES[mode] };
      });
      const marketing = await import("../marketing");
      const bodies = await import("../templates/contentBodies");
      const out = marketing.renderMarketing(bodies.releaseBody(entry!, letter), "product_updates", TOKEN, ADDRESS);
      // The pictures are on the site only after the deploy. Before it, draw
      // them from this checkout; the links still go to the site.
      const html = out.html.replaceAll(`src="${site}/`, `src="${local}/`);
      fs.writeFileSync(path.join(dir, `release-${mode}.html`), html);
      if (mode === "night") fs.writeFileSync(path.join(dir, "release.txt"), `Subject: ${out.subject}\n\n${out.text}\n`);
      expect(html).toContain(EMAIL_THEMES[mode].card);
    }
  });
});
