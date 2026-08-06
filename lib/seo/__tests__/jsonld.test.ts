// The rule under test is the one that makes this feature worth having:
// attribution follows `voice`, and Purify's prose is never published as a
// Book the saint wrote.

import { describe, expect, it } from "vitest";
import { workAuthorship, writingJsonLd } from "@/lib/seo/jsonld";
import type { WritingContent } from "@/lib/saints/load";
import type { Saint } from "@/lib/saints/saints";

const saint = {
  slug: "polycarp-of-smyrna",
  name: "St. Polycarp of Smyrna",
  epithet: "Bishop and Martyr",
  shortBio: "",
  life: [],
  works: [],
  feastDays: [],
} as unknown as Saint;

function work(voices: (string | undefined)[]): WritingContent {
  return {
    saint: saint.slug,
    slug: "a-work",
    title: "A Work",
    source: "Roberts-Donaldson translation, Ante-Nicene Fathers Vol. 1 (1885).",
    sections: voices.map((v, i) => ({
      n: i + 1,
      title: `s${i + 1}`,
      paragraphs: ["text"],
      ...(v ? { voice: v as never } : {}),
    })),
  };
}

describe("workAuthorship", () => {
  it("credits the saint only when every section is his own words", () => {
    const a = workAuthorship(work(["saint", "saint"]));
    expect(a.type).toBe("Book");
    expect(a.byPurify).toBe(false);
  });

  it("never publishes Purify's prose as a Book the saint wrote", () => {
    const a = workAuthorship(work(["saint", "editorial"]));
    expect(a.type).toBe("CreativeWork");
    expect(a.byPurify).toBe(true);
  });

  it("does not credit the saint for a hymn the Church sang about him", () => {
    const a = workAuthorship(work(["saint", "liturgical"]));
    expect(a.type).toBe("CreativeWork");
    expect(a.byPurify).toBe(false);
  });

  it("does not credit the saint for another author's testimony", () => {
    // The Martyrdom of Polycarp: the church of Smyrna writing about him.
    const a = workAuthorship(work(["witness", "witness"]));
    expect(a.type).toBe("CreativeWork");
    expect(a.byPurify).toBe(false);
  });

  it("claims nothing for a work whose sections are unclassified", () => {
    const a = workAuthorship(work([undefined, undefined]));
    expect(a.type).toBe("CreativeWork");
    expect(a.byPurify).toBe(false);
  });

  it("a single unlabelled section is enough to withhold authorship", () => {
    // Conservative on purpose: an unlabelled section could be anyone's.
    expect(workAuthorship(work(["saint", undefined])).type).toBe("CreativeWork");
  });
});

describe("writingJsonLd", () => {
  it("puts the saint in author for his own book, and not in about", () => {
    const ld = writingJsonLd(saint, work(["saint"]));
    expect(ld["@type"]).toBe("Book");
    expect((ld.author as { name: string }).name).toBe(saint.name);
    expect(ld.about).toBeUndefined();
  });

  it("moves the saint from author to about once Purify's prose is present", () => {
    const ld = writingJsonLd(saint, work(["saint", "editorial"]));
    expect(ld["@type"]).toBe("CreativeWork");
    expect((ld.author as { name: string }).name).toBe("Purify");
    expect((ld.about as { name: string }).name).toBe(saint.name);
  });

  it("carries the edition line verbatim so a machine knows it is a translation", () => {
    const ld = writingJsonLd(saint, work(["saint"]));
    expect(ld.citation).toContain("Roberts-Donaldson");
    expect(ld.inLanguage).toBe("en");
  });

  it("declares translationOfWork only when the corpus states the language", () => {
    const w = work(["saint"]);
    expect(writingJsonLd(saint, w).translationOfWork).toBeUndefined();
    w.originalLanguage = "grc";
    expect(
      (writingJsonLd(saint, w).translationOfWork as { inLanguage: string }).inLanguage,
    ).toBe("grc");
  });

  it("names who spoke a witness section rather than leaving it anonymous", () => {
    const w = work(["witness"]);
    w.sections[0].voiceAuthor = "the Church of Smyrna";
    const parts = writingJsonLd(saint, w).hasPart as {
      spokenByCharacter?: { name: string };
    }[];
    expect(parts[0].spokenByCharacter?.name).toBe("the Church of Smyrna");
  });
});
