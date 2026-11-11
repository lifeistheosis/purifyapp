// The saints and five pages in the reader's language in the apps (1.9, the
// reader's language sweep, parts 3 and 4; Updates 2's split of 2026-11-10,
// the Updates chat's share).
//
// In the apps a page is written once, when the app is built, and the server
// there knows no reader (lib/i18n/server.ts), so a page that chose its German
// on the server was English for every reader. Each of these now writes the
// English and draws the German on the device from a file of its own, never
// carried by the page. lib/i18n/__tests__/serverLocale.test.ts holds that no
// page still chooses on the server; this holds where each one's German went.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

const PAGES = [
  "app/(app)/about/page.tsx",
  "app/(app)/privacy/page.tsx",
  "app/(app)/faq/page.tsx",
  "app/(app)/support/page.tsx",
  "app/(app)/whats-new/page.tsx",
  "app/(app)/saints/page.tsx",
  "app/(app)/saints/[slug]/page.tsx",
];

describe("the pages that had German in them", () => {
  it("carry no German of their own any more", () => {
    // German's own letters, in the page's words; a comment may name nothing German.
    for (const page of PAGES) {
      const words = read(page)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(words, page).not.toMatch(/[äöüÄÖÜß]/);
      expect(words, page).not.toMatch(/\bgetServerLocale\(/);
    }
  });

  it("load each one's German from its own file, on the device", () => {
    const wrappers: Record<string, RegExp> = {
      "components/about/AboutInReadersLanguage.tsx": /de: \(\) => import\("\.\/AboutDe"\)/,
      "components/privacy/PrivacyInReadersLanguage.tsx": /de: \(\) => import\("\.\/PrivacyDe"\)/,
      "components/faq/FaqInReadersLanguage.tsx": /de: \(\) => import\("\.\/FaqDe"\)/,
      "components/whats-new/WhatsNewInReadersLanguage.tsx": /de: \(\) => import\("@\/data\/pages\/whats-new\.de\.json"\)/,
    };
    for (const [file, loads] of Object.entries(wrappers)) {
      const src = read(file);
      expect(src.startsWith('"use client";'), file).toBe(true);
      expect(src, file).toMatch(loads);
    }
    // The pages draw the English inside them, and never import the German.
    expect(read("app/(app)/about/page.tsx")).toContain("<AboutInReadersLanguage credits={photoCredits().length > 0}>");
    expect(read("app/(app)/about/page.tsx")).not.toMatch(/AboutDe/);
    expect(read("app/(app)/faq/page.tsx")).not.toMatch(/FaqDe|QUESTIONS_DE/);
    expect(read("app/(app)/privacy/page.tsx")).toContain('<PrivacyText lang="en" />');
    expect(read("app/(app)/privacy/page.tsx")).not.toContain('lang="de"');
    // Support's words are all the catalog's since its rewrite (1.9), so each
    // reader reads their own language with no file of German of its own.
    expect(read("app/(app)/support/page.tsx")).toContain("<SupportBody />");
    expect(read("components/support/SupportBody.tsx")).not.toMatch(/isDe|[äöüÄÖÜß]/);
  });

  it("keep What's New's German words in its file, every one the page asks for", () => {
    const words = JSON.parse(read("data/pages/whats-new.de.json")) as Record<string, string>;
    expect(Object.keys(words).sort()).toEqual(["closing", "eyebrow", "grouped", "releaseNotes", "signature", "update", "updates"]);
    const page = read("app/(app)/whats-new/page.tsx");
    for (const k of [...page.matchAll(/<WhatsNewWord k="([a-zA-Z]+)">/g)].map((m) => m[1])) expect(words, k).toHaveProperty(k);
    expect(page).toContain("<WhatsNewCount n={y.count} />");
  });

  it("say nothing about the language while the reader's own is on its way", () => {
    expect(read("components/i18n/TranslationDisclaimer.tsx")).toContain('if (locale === "en" || coming) return null;');
    expect(read("components/i18n/PageInReadersLanguage.tsx")).toContain("<Coming.Provider value={coming}>");
  });
});

describe("an English page says English only where it is", () => {
  // The first build of the split marked the whole English page lang="en"
  // dir="ltr": on the export an Arabic reader's own words (the catalog's,
  // most of About, the FAQ and Support) were set left to right and announced
  // as English (54 places on About, 44 on the FAQ). Build 90 note 4: words
  // say their language on the smallest element that holds only those words.
  it("the English page as a whole says no language", () => {
    const src = read("components/i18n/PageInReadersLanguage.tsx");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).toContain("return <Coming.Provider value={coming}>{children}</Coming.Provider>;");
    expect(code).not.toContain('lang="en"');
  });

  it("About and the FAQ are in every language the catalogs have, so they have no note that they are English", async () => {
    const { LOCALES } = await import("@/lib/i18n/locales");
    for (const page of ["app/(app)/about/page.tsx", "app/(app)/faq/page.tsx"]) {
      const src = read(page);
      expect(src, page).not.toMatch(/TranslationDisclaimer/);
      const keys = [...new Set([...src.matchAll(/(?:<T k=|\bk: )"([^"]+)"/g)].map((m) => m[1]))];
      expect(keys.length, page).toBeGreaterThan(40);
      for (const { code } of LOCALES) {
        const catalog = JSON.parse(read(`lib/i18n/messages/${code}.json`)) as Record<string, string>;
        expect(keys.filter((k) => !(k in catalog)), `${page} in ${code}`).toEqual([]);
      }
    }
    expect(read("components/faq/FaqList.tsx")).not.toMatch(/TranslationDisclaimer/);
    // The FAQ's one English line, its lead, says so.
    expect(read("app/(app)/faq/page.tsx")).toMatch(/lead="Honest answers\.[^"]*"\s+leadLang="en"/);
    expect(read("components/faq/FaqList.tsx")).toContain("<p lang={leadLang} dir={textDir(leadLang)}");
  });

  it("the Privacy Policy's text says its language under the reader's own heading", () => {
    const text = read("components/legal/PrivacyText.tsx");
    const en = text.slice(text.indexOf("function PrivacyEn()"), text.indexOf("function PrivacyDe()"));
    const de = text.slice(text.indexOf("function PrivacyDe()"));
    expect(en).toMatch(/<T k="privacy\.h1" \/>\s*<\/h1>[\s\S]*?<div lang="en" dir="ltr">/);
    expect(de).toMatch(/<\/h1>[\s\S]*?<div lang="de" dir="ltr">/);
  });
});

describe("Support writes no words of its own", () => {
  // Until its rewrite (1.9, his word of 2026-11-11) the website's Support page
  // wrote its own English, or German, beside the catalog's (the month's goal,
  // the ways to give, the costs), and each such line had to say its language
  // (build 90 note 4). Now every word on it is the catalog's, drawn by <T>, so
  // every reader reads their own language and there is nothing to mark.
  it("draws every word through the catalog", () => {
    const src = read("components/support/SupportBody.tsx");
    const body = src.slice(src.indexOf("export function SupportBody"));
    // No text between tags but a space: a word written into the page would show here.
    expect(body.match(/>[^<>{}]*[A-Za-z][^<>{}]*</g) ?? []).toEqual([]);
    expect(body).not.toMatch(/lang="en"|lang=\{own\}/);
  });
});

describe("a saint's life in the reader's language", () => {
  it("is a file of its own for each of the 55 lives in German, each loaded on the device by its own import()", () => {
    // Inside the bundle's _next, as the councils' and the lessons' are: the
    // export's guard against the translated corpus refuses an i18n folder
    // anywhere else (scripts/native-build.mjs), as the first build of this
    // part, served from /saints-data/<saint>/i18n/, found.
    const dir = path.join(process.cwd(), "data/saints");
    const files = fs
      .readdirSync(dir)
      .filter((saint) => fs.existsSync(path.join(dir, saint, "i18n")))
      .flatMap((saint) => fs.readdirSync(path.join(dir, saint, "i18n")).filter((f) => f.endsWith(".json")).map((f) => `${saint}/i18n/${f}`));
    expect(files.length).toBe(55);
    const loaders = read("components/saints/lifeLoaders.ts");
    // Every life on disk has its loader, and every loader its file.
    for (const f of files) {
      const [saint, , file] = f.split("/");
      expect(loaders, f).toContain(`"${saint}": { ${file.replace(/\.json$/, "")}: () => import("@/data/saints/${f}")`);
    }
    expect([...loaders.matchAll(/import\("@\/data\/saints\/([^"]+)"\)/g)].map((m) => m[1]).sort()).toEqual([...files].sort());
    // Named only inside import(), never imported whole.
    expect(loaders).not.toMatch(/^import [^;]*\/data\//m);
  });

  it("is drawn on the device, the page carrying none of it", () => {
    const page = read("app/(app)/saints/[slug]/page.tsx");
    expect(page).toContain("<SaintInReadersLanguage slug={saint.slug}>");
    expect(page).not.toMatch(/getSaintBioOverrides|ContentNotYetTranslated|\/i18n\/|from "[^"]*lifeLoaders"/);
    const islands = read("components/saints/SaintInReadersLanguage.tsx");
    expect(islands.startsWith('"use client";')).toBe(true);
    expect(islands).toContain("LIFE_LOADERS[slug] ?? NONE");
    // The life keeps its marks where it shares the English one's quotations.
    expect(read("components/saints/SaintLife.tsx")).toContain("<SaintLifeIn slug={saint.slug} quotes=");
    // No route serves the lives outside the bundle's chunks.
    expect(fs.existsSync(path.join(process.cwd(), "app/saints-data/[slug]/i18n"))).toBe(false);
  });
});
