// A council in its own words, shared as a picture (1.8, round 3 r3-11, which
// found that "a council's words cannot be made a picture at all"). One line
// of each council's own document, held here letter for letter to the section
// it names, with a Share on the council's page.
//
// What a reader would notice if this broke: a line shared as the council's
// that its document does not say, a link that opens the wrong section, or a
// council that is not received offered as a picture.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { CouncilWords } from "@/components/councils/CouncilWords";
import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { shownCite } from "@/lib/citations/shown";
import { COUNCILS, getCouncil } from "@/lib/councils/councils";
import { councilPicture } from "@/lib/councils/page";
import { getMessages } from "@/lib/i18n";
import { litSpan } from "@/lib/share/verseCard";

import { COUNCIL_FACES, COUNCIL_LINES, councilQuote, councilYear, lineOfCouncil } from "../lines";

const ROOT = path.resolve(__dirname, "..", "..", "..");
type Section = { n: number; title: string; voice?: string; paragraphs: string[] };
const sectionOf = (council: string, document: string, n: number): Section | undefined =>
  (JSON.parse(fs.readFileSync(path.join(ROOT, "data", "councils", council, `${document}.json`), "utf8")) as { sections: Section[] }).sections.find((s) => s.n === n);

describe("a council's own line", () => {
  it("is given for every council the Church receives, and not for the one it does not", () => {
    for (const c of COUNCILS) {
      if (c.reception?.status === "not-received") expect(lineOfCouncil(c.slug), c.slug).toBeNull();
      else expect(lineOfCouncil(c.slug), c.slug).not.toBeNull();
    }
    expect(Object.keys(COUNCIL_LINES).every((slug) => getCouncil(slug))).toBe(true);
  });

  it("is its document's own words, letter for letter, in the section it names", () => {
    for (const [slug, line] of Object.entries(COUNCIL_LINES)) {
      expect(line.cite.council, slug).toBe(slug);
      const section = sectionOf(line.cite.council, line.cite.document, line.cite.section);
      expect(section, `${slug}: ${line.cite.document} s${line.cite.section}`).toBeDefined();
      expect(section!.voice, slug).not.toBe("editorial");
      expect(section!.title, slug).not.toMatch(/^On (the|its) /);
      expect(section!.paragraphs.some((p) => p.includes(line.words)), `${slug}: not in its section`).toBe(true);
      // Never an em dash, though the edition sometimes prints one; never a word cut.
      expect(line.words.includes(String.fromCharCode(0x2014)), slug).toBe(false);
      expect(line.words, slug).toMatch(/^[A-Z]/);
      expect(line.words.length, slug).toBeLessThanOrEqual(240);
    }
  });

  it("opens where it stands: its source line names the council, the document and the section", () => {
    for (const [slug, line] of Object.entries(COUNCIL_LINES)) {
      const shown = shownCite(line.cite);
      expect(shown?.kind, slug).toBe("father");
      if (shown?.kind !== "father") continue;
      expect(shown.href, slug).toBe(`/councils/${slug}/${line.cite.document}#s${line.cite.section}`);
      expect(shown.author, slug).toBe(getCouncil(slug)!.byname);
    }
  });

  it("lights one word only where it plainly carries the line: the honour, at the second Nicaea", () => {
    const lit = Object.entries(COUNCIL_LINES).filter(([, l]) => l.lit);
    expect(lit.map(([slug, l]) => [slug, l.lit])).toEqual([["second-nicaea", "honour"]]);
    for (const [, l] of lit) expect(litSpan(l.words, l.lit)).not.toBeNull();
  });
});

describe("the council's picture", () => {
  it("is cut where each of the seven's own picture has its throne, its Father or its Cross, and a local council has the cross instead", () => {
    const seven = COUNCILS.filter((c) => c.kind !== "local").map((c) => c.slug);
    expect(Object.keys(COUNCIL_FACES).sort()).toEqual([...seven].sort());
    for (const slug of seven) expect(councilPicture(slug, false), slug).not.toBeNull();
    for (const [slug, f] of Object.entries(COUNCIL_FACES)) {
      for (const v of [...f.point, ...f.seal]) {
        expect(v, slug).toBeGreaterThan(0);
        expect(v, slug).toBeLessThan(1);
      }
    }
  });

  it("is the council's subject: its place and year over the cross, its byname, its document, its name round the seal", () => {
    const c = getCouncil("second-nicaea")!;
    const line = lineOfCouncil("second-nicaea")!;
    const subject = councilQuote(c, { line, documentTitle: "The Decree on the Holy Icons", pageHead: "", picture: "/history/media/second-council-of-nicaea.v1.jpg" });
    expect(subject).toEqual({
      name: "The Seventh Ecumenical Council",
      head: "Nicaea in Bithynia · 787",
      byline: "Second Council of Nicaea",
      source: "The Decree on the Holy Icons",
      pageHead: "",
      pageRight: "Nicaea in Bithynia · 787",
      pageSource: "The Decree on the Holy Icons, Second Council of Nicaea",
      ring: "The Seventh Ecumenical Council · 787",
      lit: "honour",
      face: { src: "/history/media/second-council-of-nicaea.v1.jpg", point: [0.5, 0.3], looks: "ahead", seal: [0.5, 0.2, 0.27], fallback: null },
    });
    // A local council has no picture; one met about a year says so.
    const gangra = getCouncil("gangra")!;
    expect(councilYear(gangra)).toBe("c. 340");
    expect(councilQuote(gangra, { line: lineOfCouncil("gangra")!, documentTitle: "x", pageHead: "", picture: null }).face).toBeNull();
  });
});

describe("the council's page", () => {
  const page = fs.readFileSync(path.join(ROOT, "app/(app)/councils/[slug]/page.tsx"), "utf8");

  it("shows its line under its documents' door, made on the server, with its source line", () => {
    expect(page).toContain("const line = lineOfCouncil(c.slug);");
    expect(page).toContain("shownCite(line.cite)");
    expect(page).toMatch(/<CouncilWords[\s\S]*subject=\{lineSubject\}/);
    expect(page.indexOf("<CouncilWords")).toBeGreaterThan(page.indexOf("<DocumentsDoor"));
    expect(page.indexOf("<CouncilWords")).toBeLessThan(page.indexOf('<T k="study.councils.defined" />'));
  });

  it("offers Share as a picture and Read where it's from, the line set whole in its marks", () => {
    type ProviderProps = Parameters<typeof MessagesProvider>[0];
    const en = getMessages("en");
    const c = getCouncil("second-nicaea")!;
    const line = lineOfCouncil("second-nicaea")!;
    const shown = shownCite(line.cite)!;
    const subject = councilQuote(c, { line, documentTitle: "The Decree on the Holy Icons", pageHead: "", picture: null });
    const html = renderToString(
      createElement(MessagesProvider, { locale: "en", messages: en } as ProviderProps, createElement(CouncilWords, { text: line.words, shown, subject, pageHeadKey: "study.theology.ecumenicalCouncils", name: c.name })),
    );
    expect(html).toContain(en["study.heresies.inTheirWords"].replace(/'/g, "&#x27;"));
    expect(html).toContain(`${String.fromCharCode(0x201c)}${line.words}${String.fromCharCode(0x201d)}`);
    expect(html).toMatch(/<button(?=[^>]*data-council-share="")/);
    expect(html).toContain(en["today.verse.shareAsPicture"]);
    expect(html).toMatch(/<a(?=[^>]*data-council-source="")(?=[^>]*href="\/councils\/second-nicaea\/the-decree-on-the-holy-icons#s2")/);
  });
});
