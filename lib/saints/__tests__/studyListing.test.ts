// Build 95 note 29 (his "yes to all", 2026-11-13 about 20:47 UTC): Harkins's
// Discourses Against Judaizing Christians on St John Chrysostom's profile,
// among his print books, also known as Against the Jews, with his line word
// for word and the publisher's own page, never the Amazon affiliate link.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { LicensedWorksSection } from "@/components/saints/LicensedWorksSection";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";
import type { LicensedWork } from "@/lib/saints/licensedWorks";

const LINE =
  "Eight sermons preached in Antioch in 386 and 387 to Christians who were keeping the Jewish feasts and fasts. Their words about the Jewish people are harsh, and were later used to justify hatred of Jews. Listed here for study.";
const PUBLISHER = "https://www.cuapress.org/9780813209715/discourses-against-judaizing-christians/";

const works = (): LicensedWork[] =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/saints/john-chrysostom/licensed-works.json"), "utf8")).works;
const book = () => works().find((w) => w.slug === "discourses-against-judaizing-christians");

type ProviderProps = Parameters<typeof MessagesProvider>[0];
const draw = (locale: string, list: LicensedWork[]) =>
  renderToString(
    createElement(MessagesProvider, { locale, messages: getMessages(locale as never) } as ProviderProps, createElement(LicensedWorksSection, { works: list })),
  );

describe("Discourses Against Judaizing Christians on St John Chrysostom's profile", () => {
  it("is listed as he approved it: Harkins's volume 68, 1979, his line word for word, the publisher's page", () => {
    const w = book();
    expect(w).toBeDefined();
    expect(w!.title).toBe("Discourses Against Judaizing Christians");
    expect(w!.alsoKnownAs).toBe("Against the Jews");
    expect(w!.publisher).toBe("The Catholic University of America Press");
    expect(w!.year).toBe(1979);
    expect(w!.subtitle).toContain("volume 68");
    expect(w!.subtitle).toContain("Paul W. Harkins");
    expect(w!.blurb).toBe(LINE);
    expect(w!.amazonAsin).toBeUndefined();
    expect(w!.directPublisherUrl).toBe(PUBLISHER);
  });

  it("draws no Amazon link for it, only the publisher's, and the other title it is known by", () => {
    const out = draw("en", [book()!]);
    expect(out).not.toMatch(/amazon\./i);
    expect(out).toContain(`href="${PUBLISHER}"`);
    expect(out).toContain("Also known as Against the Jews");
    expect(out).toContain(LINE);
  });

  it("keeps Amazon for the books that name it there", () => {
    const sold = works().filter((w) => w.amazonAsin);
    expect(sold.length).toBeGreaterThan(0);
    expect(draw("en", sold)).toMatch(/amazon\./i);
  });

  it("carries his line in English in every language, as every blurb of the section is, and the other title's words in the reader's", () => {
    for (const { code: locale } of LOCALES) {
      const out = draw(locale, [book()!]);
      expect(out, locale).toContain(`<span lang="en" dir="ltr">${LINE}</span>`);
      const aka = getMessages(locale as never)["saints.alsoKnownAs"];
      expect(aka, locale).toContain("{title}");
      expect(out, locale).toContain(aka.replace("{title}", "Against the Jews"));
    }
  });
});
