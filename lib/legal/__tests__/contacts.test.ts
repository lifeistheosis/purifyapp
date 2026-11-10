import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { DEVELOPER_EMAILS } from "@/lib/dev/developer";

import { LEGAL_EMAIL, SUPPORT_EMAIL } from "../entity";

/**
 * Purify's two addresses, by his word of 2026-11-10: support@ for technical
 * help, legal@ for legal matters, "change out all the stuff with the emails".
 *
 * What would go wrong if this broke: a page that still sends a reader to his
 * own Gmail now that the company is the one they deal with; a copyright notice
 * or an arbitration opt-out written to the help inbox; an address at
 * purify.app, a domain Purify has never shown to be its own.
 */

// The published notes and boards too: the apps carry them (data/changelog).
const ROOTS = ["app", "components", "lib", "data/changelog"];
const ADDRESS = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const PERSONAL = /@(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|proton|protonmail)\.[a-z.]+$/i;

/** Where each of Purify's own addresses, and his account's, may be written. */
const ALLOWED: Record<string, string> = {
  [SUPPORT_EMAIL]: "lib/legal/entity.ts",
  [LEGAL_EMAIL]: "lib/legal/entity.ts",
  // The sender's address, as the example in EMAIL_FROM's comment. Never a contact.
  "hello@purifyapp.net": "lib/email/send.ts",
  // His own account, to keep it out of the counts. Never written to.
  ...Object.fromEntries(DEVELOPER_EMAILS.map((e) => [e, "lib/dev/developer.ts"])),
};

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === "__tests__" || d.name === "node_modules" ? [] : sources(p);
    return /\.(tsx?|json|css|mjs)$/.test(d.name) ? [p] : [];
  });
}

const found = ROOTS.flatMap((root) =>
  sources(path.join(process.cwd(), root)).flatMap((file) => {
    const rel = path.relative(process.cwd(), file).split(path.sep).join("/");
    return [...fs.readFileSync(file, "utf8").matchAll(ADDRESS)].map((m) => ({ file: rel, address: m[0].toLowerCase() }));
  }),
);

describe("Purify's addresses", () => {
  it("are the two his word named", () => {
    expect(SUPPORT_EMAIL).toBe("support@purifyapp.net");
    expect(LEGAL_EMAIL).toBe("legal@purifyapp.net");
  });

  it("are written in one place, and no page carries one of its own", () => {
    const ours = found.filter(
      ({ address }) => address.endsWith("@purifyapp.net") || address.endsWith("@purify.app") || PERSONAL.test(address),
    );
    expect(ours.length).toBeGreaterThan(0);
    // A note is words, not code, and cannot name a constant: the published
    // notes and boards may write the two addresses out, and nothing else.
    const inNotes = (file: string, address: string) =>
      file.startsWith("data/changelog/") && (address === SUPPORT_EMAIL || address === LEGAL_EMAIL);
    const stray = ours
      .filter(({ file, address }) => ALLOWED[address] !== file && !inNotes(file, address))
      .map(({ file, address }) => `${file}: ${address}`);
    expect(stray).toEqual([]);
  });

  it("send every legal matter in the terms to the legal inbox", () => {
    const terms = fs.readFileSync(path.join(process.cwd(), "components/legal/TermsText.tsx"), "utf8");
    // Copyright notices, the informal dispute, the arbitration opt-out and
    // Contact; and, since his yes of 2026-11-10 to the Terms for what
    // readers post (docs/1.9-build/drafts/terms-posts.md), the notice for a
    // picture that is not the poster's own and the poster's answer to it.
    expect(terms.match(/href=\{`mailto:\$\{LEGAL_EMAIL\}`\}/g)?.length).toBe(6);
    // One help line, by the same yes: a report of something posted goes to
    // support, as every report from a page does.
    expect(terms.match(/href=\{`mailto:\$\{SUPPORT_EMAIL\}`\}/g)?.length).toBe(1);
  });

  it("give the legal inbox on the privacy page, in English and in German", () => {
    const privacy = fs.readFileSync(path.join(process.cwd(), "components/legal/PrivacyText.tsx"), "utf8");
    // The company's own line, the closing line and (since his yes of
    // 2026-11-10) a campaign's picture that is not its poster's own, once in
    // each language.
    expect(privacy.match(/href=\{`mailto:\$\{LEGAL_EMAIL\}`\}/g)?.length).toBe(6);
    // A campaign that names someone without their agreement is reported to
    // support, by the same yes, once in each language.
    expect(privacy.match(/href=\{`mailto:\$\{SUPPORT_EMAIL\}`\}/g)?.length).toBe(2);
  });
});
