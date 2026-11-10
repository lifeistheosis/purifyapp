// Words a page chooses on the server by the reader's language, and why the
// apps must not have any (1.9, the arbiter's yes of 2026-11-10 to the German
// lessons in the apps, and his "I want everything in version 1.9").
//
// getServerLocale (lib/i18n/server.ts) answers English in the apps: there the
// server is the build, and it knows no reader. So a page that chose its words
// with it showed a German reader the English lesson and the English Morning
// Rule, though the German was written and the website showed it. Short words
// are catalog keys said on the device (<T>; serverWords.test.ts holds them).
// A long text is written by the page in English, and each other language is
// its own file, loaded on the device when the reader's language is one of
// them (components/i18n/useInReadersLanguage.ts; Admin's way for the legal
// sheet): Learn to pray (components/prayers/LessonView.tsx) and the prayer
// rules (components/prayers/RuleInReadersLanguage.tsx), and a council's
// document (components/councils/CouncilTextHere.tsx). A reader shown a long
// text in English though their language is another is told so in one quiet
// line, said on the device too (components/i18n/StillInEnglish.tsx).
//
// The list below may only shrink. Each file still choosing on the server is
// named with why the apps may keep it for now; a new one fails.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SAINTS_AND_PAGES } from "./stillChosen.saintsAndPages";

const ROOT = process.cwd();

const STILL_CHOSEN_ON_THE_SERVER: Record<string, string> = {
  "app/layout.tsx": "the page's lang attribute alone; MessagesProvider sets it on the device",
  "app/page.tsx": "the website's front page, left out of the apps (serverWords.test.ts)",
  "components/marketing/MadeOfStrip.tsx": "a part of the website's front page alone",
  "app/(app)/discover/page.tsx": "the computer's twin of Discover, hidden in the apps (serverWords.test.ts)",
  "app/(app)/account/(you)/page.tsx": "the computer's twin of the account page, hidden in the apps (serverWords.test.ts)",
  // The rest of the sweep, as listed to the arbiter on 2026-11-10, is the
  // saints and the five German pages, the Updates chat's, listed in their own
  // file (stillChosen.saintsAndPages.ts). The councils' documents, a work of
  // the Fathers with its hymns and miracles, and the Creed's page left this
  // list the same day (the Updates 2 chat).
};

/** What the apps leave out (scripts/native-build.mjs, STASH_PATHS), as paths. */
function webOnly(): string[] {
  const build = fs.readFileSync(path.join(ROOT, "scripts/native-build.mjs"), "utf8");
  const block = build.slice(build.indexOf("const STASH_PATHS = ["), build.indexOf("\n];", build.indexOf("const STASH_PATHS = [")));
  return [...block.matchAll(/\[((?:\s*"[^"]+",?)+)\s*\]/g)].map((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).join("/"));
}

function sourceFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      out.push(...sourceFiles(rel));
    } else if (/\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}

/** Code only: a comment may name getServerLocale as much as it likes. */
function code(file: string): string {
  return fs
    .readFileSync(path.join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("words a page chooses on the server by the reader's language", () => {
  const skipped = webOnly();
  const inTheApps = (file: string) => !skipped.some((p) => file === p || file.startsWith(`${p}/`));
  const choosers = [...sourceFiles("app"), ...sourceFiles("components")].filter(inTheApps).filter((file) => /\bgetServerLocale\(/.test(code(file)));

  it("reads what the apps leave out", () => {
    expect(skipped).toContain("app/(app)/language-editor");
    expect(skipped.length).toBeGreaterThan(10);
  });

  it("are only the pages named, each with why, and the list only shrinks", () => {
    // Each file is named in one list only: the two lists belong to two chats.
    for (const file of Object.keys(SAINTS_AND_PAGES)) expect(STILL_CHOSEN_ON_THE_SERVER, file).not.toHaveProperty([file]);
    const named = [...Object.keys(STILL_CHOSEN_ON_THE_SERVER), ...Object.keys(SAINTS_AND_PAGES)].sort();
    expect(
      [...choosers].sort(),
      "In the apps getServerLocale answers English for every reader. Let the device choose: " +
        "<T> for a short word, components/i18n/useInReadersLanguage.ts for a text written in more than one language.",
    ).toEqual(named);
  });

  it("are not Learn to pray or the prayer rules, which the device chooses", () => {
    for (const page of [
      "app/(app)/prayers/learning/page.tsx",
      "app/(app)/prayers/learning/[lessonId]/page.tsx",
      "app/(app)/prayers/morning/page.tsx",
      "app/(app)/prayers/evening/page.tsx",
      "app/(app)/prayers/[planId]/page.tsx",
    ]) {
      const src = code(page);
      expect(src, page).not.toMatch(/\bgetServerLocale\(/);
      expect(src, page).toMatch(/<LessonView\b|<LessonListHere\b|<RuleInReadersLanguage\b/);
      // The page writes the English alone: no other language's file rides in it.
      expect(src, page).not.toMatch(/\.de\.json|lessonsFor\("de"\)/);
    }
    // A lesson's name in German goes to the bar, a few words; its text never.
    expect(code("app/(app)/prayers/learning/[lessonId]/page.tsx")).toContain("titles={german && german.title !== english.lesson.title ? { de: german.title } : undefined}");
  });

  it("load each other language from its own file, on the device, never with the English", () => {
    const view = code("components/prayers/LessonView.tsx");
    const rules = code("components/prayers/RuleInReadersLanguage.tsx");
    // Only a type is taken from lib/prayers/learning.ts, which holds both lesson files.
    expect(view).toContain('import type { PrayerLesson } from "@/lib/prayers/learning";');
    expect(view).not.toMatch(/import \{[^}]*\} from "@\/lib\/prayers\/learning"/);
    for (const [name, src] of [["LessonView", view], ["RuleInReadersLanguage", rules], ["LessonsInReadersLanguage", code("components/prayers/LessonsInReadersLanguage.tsx")]] as const) {
      // A translation is named only inside import(), never imported statically.
      expect(src, name).not.toMatch(/^import [^;]*\.[a-z]{2,3}\.json"/m);
    }
    // Every translation on disk has its loader, and every loader its file.
    const lessonFiles = fs.readdirSync(path.join(ROOT, "data/prayers/learning")).filter((f) => /^lessons\.[a-z]{2,3}\.json$/.test(f));
    for (const f of lessonFiles) expect(view, f).toContain(`import("@/data/prayers/learning/${f}")`);
    const ruleFiles = fs.readdirSync(path.join(ROOT, "data/prayers/rules")).filter((f) => /\.[a-z]{2,3}\.json$/.test(f));
    for (const f of ruleFiles) {
      const [rule, lang] = f.replace(/\.json$/, "").split(".");
      expect(rules, f).toContain(`"rules/${rule}.json": { ${lang}: () => import("@/data/prayers/rules/${f}")`);
    }
    for (const m of rules.matchAll(/import\("@\/data\/prayers\/rules\/([^"]+)"\)/g)) expect(ruleFiles, m[1]).toContain(m[1]);
    expect(ruleFiles.length).toBeGreaterThanOrEqual(3);
  });

  it("show the English where the reader's language has none, and while its own is on the way", () => {
    const hook = code("components/i18n/useInReadersLanguage.ts");
    expect(hook).toContain('const load = locale === "en" ? undefined : loaders[locale];');
    expect(hook).toContain('return { value: english, lang: "en", coming: Boolean(wanted) };');
    // A rule does not say "not in your language" for the moment its own file takes.
    expect(code("components/prayers/RuleInReadersLanguage.tsx")).toContain("contentLocale={coming ? locale : lang}");
    expect(code("components/nav/MobileTopBar.tsx")).toContain("titleKey ? t(titleKey) : (titles?.[locale] ?? title)");
  });

  it("cite the same places in a lesson's every language, so the page reads them once", () => {
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, "data/prayers/learning/lessons.json"), "utf8")) as { id: string; sources?: { cite: unknown }[] }[];
    for (const f of fs.readdirSync(path.join(ROOT, "data/prayers/learning")).filter((n) => /^lessons\.[a-z]{2,3}\.json$/.test(n))) {
      const other = JSON.parse(fs.readFileSync(path.join(ROOT, "data/prayers/learning", f), "utf8")) as { id: string; sources?: { cite: unknown }[] }[];
      for (const l of en) {
        const o = other.find((x) => x.id === l.id);
        expect(o, `${f} ${l.id}`).toBeDefined();
        expect((o!.sources ?? []).map((s) => s.cite), `${f} ${l.id}`).toEqual((l.sources ?? []).map((s) => s.cite));
      }
    }
  });

  it("have German for every lesson and for the Morning, Evening and Creed rules, which the apps now show", () => {
    const de = JSON.parse(fs.readFileSync(path.join(ROOT, "data/prayers/learning/lessons.de.json"), "utf8")) as { id: string }[];
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, "data/prayers/learning/lessons.json"), "utf8")) as { id: string }[];
    expect(de.map((l) => l.id).sort()).toEqual(en.map((l) => l.id).sort());
    for (const rule of ["morning", "evening", "creed"]) expect(fs.existsSync(path.join(ROOT, `data/prayers/rules/${rule}.de.json`)), rule).toBe(true);
  });

  it("write a council's document in English, and load each other language's file on the device", () => {
    const page = code("app/(app)/councils/[slug]/[document]/page.tsx");
    expect(page).not.toMatch(/\bgetServerLocale\(/);
    expect(page).toContain("const loaded = await loadCouncilDocument(slug, document);");
    // The page writes the English alone: no other language's file rides in it.
    expect(page).not.toMatch(/data\/councils\/[^"]*\/i18n\/|\.de\.json/);
    const here = code("components/councils/CouncilTextHere.tsx");
    expect(here).not.toMatch(/^import [^;]*\/i18n\/[a-z]{2,3}\//m);
    // Every translation on disk has its loader, and every loader its file.
    const dir = path.join(ROOT, "data/councils");
    const files: string[] = [];
    for (const council of fs.readdirSync(dir)) {
      const i18n = path.join(dir, council, "i18n");
      if (!fs.existsSync(i18n)) continue;
      for (const lang of fs.readdirSync(i18n)) for (const f of fs.readdirSync(path.join(i18n, lang))) files.push(`${council}/i18n/${lang}/${f}`);
    }
    expect(files.length).toBeGreaterThanOrEqual(1);
    for (const f of files) {
      const [council, , lang, name] = f.split("/");
      const doc = name.replace(/\.json$/, "");
      expect(here, f).toContain(`"${council}/${doc}": {\n    ${lang}: () => import("@/data/councils/${f}")`);
      // The same sections and paragraphs as the English, so the reader's place is the same place in either.
      type Doc = { sections: { n: number; paragraphs: string[] }[] };
      const en = JSON.parse(fs.readFileSync(path.join(dir, council, `${doc}.json`), "utf8")) as Doc;
      const other = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Doc;
      expect(other.sections.map((x) => [x.n, x.paragraphs.length]), f).toEqual(en.sections.map((x) => [x.n, x.paragraphs.length]));
    }
    for (const m of here.matchAll(/import\("@\/data\/councils\/([^"]+)"\)/g)) expect(files, m[1]).toContain(m[1]);
  });

  it("find no work of the Fathers in another language yet: the first is read on the device", () => {
    // A work's translation would be data/saints/<saint>/i18n/<lang>/<work>.json (lib/saints/load.ts).
    // The work's page, its hymns and its miracles now read English alone, so the
    // first translation needs a loader on the device, as the councils' have.
    const dir = path.join(ROOT, "data/saints");
    const found = fs
      .readdirSync(dir)
      .filter((saint) => fs.existsSync(path.join(dir, saint, "i18n")))
      .flatMap((saint) => fs.readdirSync(path.join(dir, saint, "i18n"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => `${saint}/i18n/${e.name}`));
    expect(found, "a work in another language: give app/(app)/saints/[slug]/[work]/page.tsx a loader on the device first").toEqual([]);
    for (const file of ["app/(app)/saints/[slug]/[work]/page.tsx", "components/saints/HymnsSection.tsx", "components/saints/MiraclesSection.tsx"]) {
      expect(code(file), file).not.toMatch(/\bgetServerLocale\(|loadWriting\([^)]*locale/);
    }
  });

  it("say that a text is English on the device, so the apps say it too", () => {
    const line = code("components/i18n/StillInEnglish.tsx");
    expect(fs.readFileSync(path.join(ROOT, "components/i18n/StillInEnglish.tsx"), "utf8").startsWith('"use client";')).toBe(true);
    expect(line).toContain('if (locale === "en" || coming || shown === locale) return null;');
    expect(line).toContain("t(`content.notYetTranslated.${kind}.body`)");
    // No box, no stripe, no colour: the words alone.
    expect(line).not.toMatch(/\b(?:border|bg|ring)-|gold/);
    for (const file of ["app/(app)/saints/[slug]/[work]/page.tsx", "app/(app)/theology/creed/page.tsx", "components/councils/CouncilTextHere.tsx"]) {
      const src = code(file);
      expect(src, file).toContain("<StillInEnglish");
      expect(src, file).not.toContain("ContentNotYetTranslated");
    }
    // The words are the catalog's own, in every language.
    for (const f of fs.readdirSync(path.join(ROOT, "lib/i18n/messages")).filter((n) => n.endsWith(".json"))) {
      const m = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/i18n/messages", f), "utf8")) as Record<string, string>;
      expect(m["content.notYetTranslated.work.body"], f).toBeTruthy();
    }
  });
});
