// A reading's reference, with its book named in the reader's language.
//
// What a reader would notice if this broke: the day's Gospel under an English
// book name on a phone set to Greek (which is how it was until 1.6), or,
// worse, a reference whose book has been swapped for the wrong one.

import { describe, expect, it } from "vitest";

import { dayReadings } from "@/lib/calendar/orthodox";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";

import { BOOKS, getBook, localBookNames, referenceIn } from "../books";

const namesIn = (code: string) => {
  const m = getMessages(code);
  return localBookNames((key: string) => m[key] ?? key);
};

describe("referenceIn", () => {
  const el = namesIn("el");
  const en = namesIn("en");

  it("names the book in the reader's language and keeps the verses as written", () => {
    expect(el.luke).toBeTruthy();
    expect(el.luke).not.toBe("Luke");
    expect(referenceIn("Luke 13:31-35", "luke", el)).toBe(`${el.luke} 13:31-35`);
    expect(referenceIn("1 Thessalonians 5:9-13, 24-28", "1-thessalonians", el)).toBe(
      `${el["1-thessalonians"]} 5:9-13, 24-28`,
    );
    expect(referenceIn("Hebrews 7:26-28", "hebrews", el)).toBe(`${el.hebrews} 7:26-28`);
  });

  it("changes nothing for a reader in English", () => {
    for (const label of ["Luke 13:31-35", "1 Thessalonians 5:9-13, 24-28", "Genesis 1:1-13"]) {
      const slug = BOOKS.find((b) => label.startsWith(b.name))!.slug;
      expect(referenceIn(label, slug, en)).toBe(label);
    }
  });

  it("leaves alone what it cannot be sure of", () => {
    // A book it does not know, or has no name for in this language.
    expect(referenceIn("Luke 13:31-35", "no-such-book", el)).toBe("Luke 13:31-35");
    expect(referenceIn("Luke 13:31-35", "luke", {})).toBe("Luke 13:31-35");
    // A label that does not open with its own book's name.
    expect(referenceIn("Gospel: Luke 13:31-35", "luke", el)).toBe("Gospel: Luke 13:31-35");
    expect(referenceIn("Matthew 5:1-12", "luke", el)).toBe("Matthew 5:1-12");
    // A name that is the start of some other words, not of a reference.
    expect(referenceIn("John the Theologian", "john", el)).toBe("John the Theologian");
    expect(referenceIn("John", "john", el)).toBe("John");
  });

  it("never swaps a shorter book's name out of a longer one", () => {
    // "John" opens "1 John" nowhere, but "Kings", "Samuel" and the numbered
    // books are where a careless prefix test goes wrong.
    for (const book of BOOKS) {
      const label = `${book.name} 1:1`;
      for (const other of BOOKS) {
        if (other.slug === book.slug) continue;
        const out = referenceIn(label, other.slug, el);
        if (!label.startsWith(`${other.name} `)) expect(out, `${label} as ${other.slug}`).toBe(label);
      }
    }
  });
});

describe("the calendar's own references", () => {
  // Every reading the calendar can hand a screen over the span of its tables,
  // on both reckonings. If a label does not open with its book's English
  // name, the reference stays English on that day for every reader, so the
  // list of such labels is held here, and it is meant to be empty.
  const start = Date.UTC(2026, 9, 1, 12);
  const end = Date.UTC(2027, 11, 31, 12);
  const seen = new Map<string, string>();
  for (let t = start; t <= end; t += 86_400_000) {
    for (const official of [true, false]) {
      const day = dayReadings(new Date(t), { official });
      for (const r of [...day.readings, ...day.ordinary, ...day.commemoration]) seen.set(`${r.book}|${r.label}`, r.book);
    }
  }

  it("all open with the name of the book they belong to", () => {
    const strays: string[] = [];
    for (const [key, slug] of seen) {
      const label = key.slice(key.indexOf("|") + 1);
      const book = getBook(slug);
      if (!book || !new RegExp(`^${book.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+\\d`).test(label)) {
        strays.push(`${slug}: ${label}`);
      }
    }
    expect(seen.size).toBeGreaterThan(300);
    expect(strays).toEqual([]);
  });

  it("and a reader in English reads every one exactly as it was written", () => {
    // The English catalog names each book as the tables do. If the two ever
    // part, this is where it shows, before a reference changes on a phone.
    const en = namesIn("en");
    for (const book of BOOKS) expect(en[book.slug], book.slug).toBe(book.name);
    for (const [key, slug] of seen) {
      const label = key.slice(key.indexOf("|") + 1);
      expect(referenceIn(label, slug, en)).toBe(label);
    }
  });

  it("so every one of them reads in Greek, Romanian, Russian and Arabic", () => {
    for (const code of ["el", "ro", "ru", "ar"]) {
      const names = namesIn(code);
      let changed = 0;
      for (const [key, slug] of seen) {
        const label = key.slice(key.indexOf("|") + 1);
        const out = referenceIn(label, slug, names);
        const book = getBook(slug)!;
        if (names[slug] && names[slug] !== book.name) {
          expect(out, `${code}: ${label}`).toBe(names[slug] + label.slice(book.name.length));
          changed += 1;
        }
      }
      expect(changed, code).toBeGreaterThan(300);
    }
  });

  it("has a name for every book of every reading, in every language", () => {
    const books = new Set(seen.values());
    for (const { code } of LOCALES) {
      const names = namesIn(code);
      const missing = [...books].filter((slug) => !names[slug]);
      expect(missing, code).toEqual([]);
    }
  });
});
