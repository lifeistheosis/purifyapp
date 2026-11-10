// Photo credits (1.9, the owner's yes to his page's 99: "CC BY and CC BY-SA
// photographs are now allowed, each photographer named on a credits page").
//
// What it holds: the credits are read from the pictures' own registries (the
// reading room's covers and doors, the Bible's read-aloud covers), so nothing
// is written twice; every picture whose licence is CC BY or CC BY-SA names
// its photographer, with the licence's deed and the photograph's page, and is
// on the website with its lighter copy; no other licence than public domain,
// CC0 or those reaches a picture; and the credits page draws every one, in
// the reader's language around it.
//
// What a reader or a photographer would notice if this broke: a photograph
// used with no credit (which the licence forbids), a credit pointing nowhere,
// or a page that names no one.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CC_LICENCES, creditFor, isCcLicence, photoCredits } from "@/lib/credits/photos";
import { FIGURES } from "@/lib/readAloud/covers";
import { COUNCIL_COVERS, FEELING_COVERS } from "@/lib/reading/authorCovers";
import { COVER_ART, WORK_ART } from "@/lib/reading/coverArt";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const EM_DASH = String.fromCharCode(0x2014);
const FREE = /^(public domain|pd-art|cc0)$/i;

/** Every picture the registries carry, with the licence its page states and its credit. */
function pictures(): { file: string; license: string; credit?: string; evidenceUrl: string }[] {
  const out: { file: string; license: string; credit?: string; evidenceUrl: string }[] = [];
  for (const art of [...Object.values(COVER_ART), ...Object.values(WORK_ART), ...Object.values(COUNCIL_COVERS), ...Object.values(FEELING_COVERS)]) {
    if (art.kind === "streamed") out.push(art);
  }
  for (const f of Object.values(FIGURES)) if (f) out.push(f);
  return out;
}

describe("the photo credits", () => {
  it("come from the registries: every CC BY or CC BY-SA picture names its photographer, and nothing else needs to", () => {
    for (const p of pictures()) {
      expect(FREE.test(p.license) || isCcLicence(p.license), `${p.file}: ${p.license} is neither free nor a licence the credits page can name`).toBe(true);
      if (isCcLicence(p.license)) {
        expect(p.credit?.trim(), `${p.file} is ${p.license} and names no photographer`).toBeTruthy();
        expect(p.credit!.includes(EM_DASH), p.file).toBe(false);
        expect(p.evidenceUrl, p.file).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
        expect(creditFor(p.file)?.photographer, p.file).toBe(p.credit);
      } else {
        expect(p.credit, `${p.file} needs no credit`).toBeUndefined();
      }
    }
    for (const [name, deed] of Object.entries(CC_LICENCES)) {
      expect(name).toMatch(/^CC BY(-SA)? \d\.\d$/);
      expect(deed).toMatch(/^https:\/\/creativecommons\.org\/licenses\/by(-sa)?\/\d\.\d\/$/);
    }
  });

  it("list each credited picture once, on the website with its lighter copy", () => {
    const credits = photoCredits();
    expect(new Set(credits.map((c) => c.file)).size).toBe(credits.length);
    for (const c of credits) {
      expect(c.file, c.file).toMatch(/^\/covers\//);
      expect(fs.existsSync(path.join(ROOT, "public", c.file)), c.file).toBe(true);
      expect(fs.existsSync(path.join(ROOT, "public", c.file.replace(/\.jpg$/, ".avif"))), c.file).toBe(true);
    }
  });

  it("are a page the apps carry, in the reader's language around each row, and the About page leads there once there is one", () => {
    const page = read("app/(app)/credits/page.tsx");
    // Static: nothing read on the server, so the export carries it whole.
    expect(page).not.toMatch(/getServerLocale|cookies\(|headers\(|force-dynamic/);
    expect(page).toContain("const credits = photoCredits();");
    expect(page).toContain("credits.map(");
    for (const key of ["credits.title", "credits.intro", "credits.by", "credits.source", "credits.cropped", "credits.none"]) {
      expect(page, key).toContain(`"${key}"`);
    }
    expect(page).toContain("CC_LICENCES[c.licence]");
    const about = read("app/(app)/about/page.tsx");
    expect(about.match(/photoCredits\(\)\.length > 0 \? \(/g)).toHaveLength(2);
    expect(about).toContain('href="/credits"');
  });
});
