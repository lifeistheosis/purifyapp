import { describe, expect, it } from "vitest";

import { getBook } from "@/lib/bible/books";
import en from "@/lib/i18n/messages/en.json";
import {
  TRANSLATIONS,
  byLanguage,
  currentTranslation,
  isSelectable,
  queryFor,
  translationsFor,
  type TranslationScope,
} from "../translations";

const ids = (list: { id: string }[]) => list.map((t) => t.id);

/** The scope a chapter of this book has, as the chapter screen builds it. */
function scopeOf(slug: string, configured: string[] = []): TranslationScope {
  const book = getBook(slug)!;
  return { testament: book.testament, source: book.source, configured };
}

describe("the translations a chapter offers", () => {
  it("lists the KJV and the WEB in the New Testament, and the WEB cannot be picked yet", () => {
    const list = translationsFor(scopeOf("john"));
    expect(ids(list)).toEqual(["kjv", "web"]);
    expect(list.map((t) => isSelectable(t, []))).toEqual([true, false]);
  });

  it("lists Brenton's Septuagint and the WEB in the Old Testament", () => {
    expect(ids(translationsFor(scopeOf("genesis")))).toEqual(["lxx-brenton", "web"]);
  });

  it("lists only the KJV for an Old Testament book the Septuagint does not carry", () => {
    expect(getBook("2-esdras")?.source).toBe("kjv-pd");
    expect(ids(translationsFor(scopeOf("2-esdras")))).toEqual(["kjv"]);
    expect(currentTranslation({ ...scopeOf("2-esdras"), activeV: null }).id).toBe("kjv");
  });

  it("lists a licensed translation only once it is set up, and only in the New Testament", () => {
    expect(ids(translationsFor(scopeOf("john")))).not.toContain("nkjv");
    expect(ids(translationsFor(scopeOf("john", ["nkjv"])))).toEqual(["kjv", "web", "nkjv"]);
    expect(ids(translationsFor(scopeOf("genesis", ["nkjv", "niv", "nlt"])))).toEqual(["lxx-brenton", "web"]);
  });

  it("reads ?v= only in its own testament, and only when it is set up", () => {
    expect(currentTranslation({ ...scopeOf("john", ["nkjv"]), activeV: "nkjv" }).id).toBe("nkjv");
    expect(currentTranslation({ ...scopeOf("john"), activeV: "nkjv" }).id).toBe("kjv");
    expect(currentTranslation({ ...scopeOf("genesis", ["nkjv"]), activeV: "nkjv" }).id).toBe("lxx-brenton");
    expect(currentTranslation({ ...scopeOf("john"), activeV: null }).id).toBe("kjv");
  });

  it("names a licensed choice in the address and clears it for a public-domain one, keeping the rest", () => {
    const nkjv = TRANSLATIONS.find((t) => t.id === "nkjv")!;
    const kjv = TRANSLATIONS.find((t) => t.id === "kjv")!;
    expect(queryFor(nkjv, "x=1")).toBe("x=1&v=nkjv");
    expect(queryFor(kjv, "v=nkjv&x=1")).toBe("x=1");
    expect(queryFor(kjv, "")).toBe("");
  });

  it("groups rows by language, in the order the list gives them", () => {
    const groups = byLanguage(translationsFor(scopeOf("john", ["niv"])));
    expect(groups.map((g) => g.language)).toEqual(["en"]);
    expect(ids(groups[0].rows)).toEqual(["kjv", "web", "niv"]);
  });

  it("has a note in the catalog for every translation, and a language for each", () => {
    const words = en as Record<string, string>;
    for (const t of TRANSLATIONS) {
      expect(words[`bible.translationNote.${t.id}`], t.id).toBeTruthy();
      expect(t.language, t.id).toMatch(/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/);
    }
  });
});
