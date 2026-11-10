// Words say their language and their direction together (1.9, build 90 note 4,
// the arbiter's yes to everything in 1.9).
//
// Under Arabic or Urdu the whole page runs right to left (MessagesProvider
// writes <html lang="ar" dir="rtl">), and English inherits that unless it says
// otherwise: its lines stood against the right edge, a sentence's full stop at
// the start of its last line, a verse's number to the right of its words. A
// `lang` sets no direction. So every element in app/ and components/ that
// says a language says the direction that goes with it, on the same element:
// `lang="en" dir="ltr"` for the app's English, and `lang={x} dir={textDir(x)}`
// where the language comes from data (lib/i18n/textDir.ts), never a direction
// typed by hand beside it. The one exception is the page's own <html>, set
// from its language's row in LOCALES. A component handed a language
// (<SourceList lang="en">) says the direction where it draws it, in its own
// file, which this reads too; only Link and a heading's variable tag pass
// their attributes straight to the page, so they say it where they are used.
//
// The files not yet marked are named with how many, and the count may only
// fall: the Updates 2 chat's families below, the Updates chat's in
// notYetDirected.saintsPagesAndWalks.ts. English that says no language at all
// is found by the walk on the export (scripts/rtl-walk.mjs), not here.

import fs from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { DOWNLOADABLE_BIBLES } from "@/lib/bible/downloads/catalog";
import { LOCALES } from "@/lib/i18n/locales";
import { textDir } from "@/lib/i18n/textDir";

import { SAINTS_PAGES_AND_WALKS } from "./notYetDirected.saintsPagesAndWalks";

const ROOT = process.cwd();

/** The Updates 2 chat's families not yet marked (the Bible, the prayers, the chants, Theology and teaching, the councils, the reading room, Today, the citations, Plus, the start and the rest), with how many. */
const NOT_YET_DIRECTED: Record<string, number> = {
  "app/(app)/apologetics/page.tsx": 5,
  "app/(app)/fathers-on/[topic]/page.tsx": 1,
  "app/(app)/heresies/page.tsx": 3,
  "app/(app)/topics/page.tsx": 2,
  "app/page.tsx": 1,
  "components/bible/BibleRow.tsx": 2,
  "components/bible/ChapterScreen.tsx": 2,
  "components/bible/CompareSheet.tsx": 4,
  "components/bible/DownloadedChapter.tsx": 2,
  "components/bible/StrongsDefinition.tsx": 2,
  "components/bible/TranslationList.tsx": 2,
  "components/bible/VerseRow.tsx": 1,
  "components/bible/WordPopover.tsx": 3,
  "components/bible/WordStudySheet.tsx": 2,
  "components/billing/KeptPaywall.tsx": 3,
  "components/billing/plusTry/TryHistory.tsx": 2,
  "components/billing/plusTry/TryKit.tsx": 1,
  "components/campaigns/CampaignPage.tsx": 2,
  "components/chants/ChantAbout.tsx": 3,
  "components/chants/ChantPage.tsx": 1,
  "components/chants/ChantVersions.tsx": 1,
  "components/chants/ChantWords.tsx": 3,
  "components/citations/CitationCard.tsx": 1,
  "components/citations/Marked.tsx": 1,
  "components/citations/SourceLine.tsx": 3,
  "components/councils/CouncilBookHeader.tsx": 5,
  "components/councils/CouncilSections.tsx": 1,
  "components/councils/CouncilWords.tsx": 1,
  "components/onboarding/ClergySteps.tsx": 3,
  "components/plans/PlanSaying.tsx": 1,
  "components/player/LiveCaptions.tsx": 4,
  "components/prayers/LessonList.tsx": 2,
  "components/prayers/LessonView.tsx": 4,
  "components/prayers/PrayerRuleReader.tsx": 1,
  "components/prayers/mine/ItemSheet.tsx": 1,
  "components/prayers/mine/LibrarySheet.tsx": 1,
  "components/prayers/mine/ReorderList.tsx": 1,
  "components/prayers/service/CommemorationStep.tsx": 1,
  "components/prayers/service/PrayerStep.tsx": 3,
  "components/prayers/service/ServiceHeader.tsx": 3,
  "components/quotes/WhoSaidIt.tsx": 1,
  "components/reading/BookHeader.tsx": 3,
  "components/reading/CollectionView.tsx": 1,
  "components/reading/FeaturedWork.tsx": 1,
  "components/reading/PathView.tsx": 2,
  "components/settings/StorageSection.tsx": 1,
  "components/theology/FathersShelf.tsx": 1,
  "components/theology/PassageDeck.tsx": 3,
  "components/theology/PathRead.tsx": 1,
  "components/theology/RecentStudies.tsx": 1,
  "components/theology/StepView.tsx": 2,
  "components/theology/StudyContents.tsx": 1,
  "components/theology/StudyCover.tsx": 3,
  "components/theology/StudyPartText.tsx": 5,
  "components/theology/StudyReader.tsx": 3,
  "components/theology/StudyShelves.tsx": 3,
  "components/theology/TheologyHub.tsx": 1,
  "components/theology/TheologyLibrary.tsx": 1,
  "components/today/GreetingHeader.tsx": 2,
  "components/today/NameDayCard.tsx": 1,
  "components/today/NativityStarCard.tsx": 2,
  "components/today/SaintWindow.tsx": 1,
  "components/today/SpeakerBand.tsx": 1,
  "components/today/VerseOfDayView.tsx": 2,
};

type Said = { file: string; line: number; tag: string; lang: string; dir: string | null; literal: boolean };

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name !== "__tests__" && e.name !== "node_modules") out.push(...tsxFiles(rel));
    } else if (e.name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

/** Every element that says a language, with the direction it says (the TypeScript parser's reading, not a pattern's). */
function said(): Said[] {
  const out: Said[] = [];
  for (const file of [...tsxFiles("app"), ...tsxFiles("components")]) {
    const src = fs.readFileSync(path.join(ROOT, file), "utf8");
    if (!/\blang=/.test(src)) continue;
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const value = (a: ts.JsxAttribute | undefined) => {
      if (!a) return null;
      if (!a.initializer) return "true";
      if (ts.isStringLiteral(a.initializer)) return a.initializer.text;
      const e = ts.isJsxExpression(a.initializer) ? a.initializer.expression : undefined;
      return e ? e.getText(sf) : a.initializer.getText(sf);
    };
    const visit = (n: ts.Node) => {
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const attrs = n.attributes.properties.filter(ts.isJsxAttribute);
        const get = (name: string) => attrs.find((a) => a.name.getText(sf) === name);
        const lang = get("lang");
        if (lang) {
          out.push({
            file,
            line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
            tag: n.tagName.getText(sf),
            lang: value(lang)!,
            dir: value(get("dir")),
            literal: !!lang.initializer && ts.isStringLiteral(lang.initializer),
          });
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return out;
}

/** Tags that hand their attributes straight to the page: next/link's <a>, and a heading chosen as h1 or h2. */
const PASS_THROUGH = new Set(["Link", "Heading"]);
/** A component of the app's own, handed a language: it says the direction in its own file, where it draws it. */
const component = (s: Said) => /^[A-Z]/.test(s.tag) && !PASS_THROUGH.has(s.tag);

/** Whether an element says the direction that goes with its language. */
function directed(s: Said): boolean {
  if (s.literal) return s.dir === textDir(s.lang);
  return s.dir === `textDir(${s.lang})`;
}

describe("words say their language and their direction together", () => {
  it("textDir: right to left for Arabic and Urdu and the scripts that run so, left to right for the rest", () => {
    for (const l of LOCALES) expect(textDir(l.code), l.code).toBe(l.dir);
    expect(LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code).sort()).toEqual(["ar", "ur"]);
    for (const b of DOWNLOADABLE_BIBLES) expect(textDir(b.textLang), b.id).toBe(b.dir);
    for (const l of ["he", "fa", "syr", "syc", "arc", "ar-EG", "UR", "ar_SA"]) expect(textDir(l), l).toBe("rtl");
    for (const l of ["en", "grc", "el", "de", "ru", "sr", "la", "en-GB"]) expect(textDir(l), l).toBe("ltr");
    // No language said, no direction said: the words run with the page.
    for (const l of ["", " ", null, undefined]) expect(textDir(l), String(l)).toBeUndefined();
  });

  const all = said();
  const frame = (s: Said) => s.tag === "html";

  it("reads every element that says a language", () => {
    expect(all.length).toBeGreaterThan(150);
    // The page's own <html>: its language's row in LOCALES says both (app/layout.tsx).
    expect(all.filter(frame).map((s) => `${s.file} ${s.lang} ${s.dir}`)).toEqual(["app/layout.tsx localeCode localeRecord.dir"]);
  });

  it("each says its direction, but for the files named, whose counts only fall", () => {
    const counts: Record<string, number> = {};
    for (const s of all.filter((x) => !frame(x) && !component(x) && !directed(x))) counts[s.file] = (counts[s.file] ?? 0) + 1;
    const named = { ...NOT_YET_DIRECTED, ...SAINTS_PAGES_AND_WALKS };
    for (const file of Object.keys(SAINTS_PAGES_AND_WALKS)) expect(NOT_YET_DIRECTED, file).not.toHaveProperty([file]);
    const rule =
      'Say the direction with the language, on the same element: lang="en" dir="ltr", or lang={x} dir={textDir(x)} ' +
      "(lib/i18n/textDir.ts). A file marked lowers its count here, or leaves the list.";
    expect(counts, rule).toEqual(named);
  });

  it("names no direction by hand beside a language from data", () => {
    for (const s of all.filter((x) => !frame(x) && !component(x) && !x.literal && x.dir !== null)) {
      const ok = s.dir === `textDir(${s.lang})` || (NOT_YET_DIRECTED[s.file] ?? SAINTS_PAGES_AND_WALKS[s.file]) !== undefined;
      expect(ok, `${s.file}:${s.line} <${s.tag} lang={${s.lang}} dir={${s.dir}}>`).toBe(true);
    }
  });
});
