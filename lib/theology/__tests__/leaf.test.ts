// The pages Theology's four lists open (1.9): a topic, a heresy, an answer,
// and the Creed line by line, in the house style with the lists themselves
// (lib/theology/__tests__/ways.test.ts). His word of 2026-11-10, "I want
// everything in version 1.9", brought in what build 89's note 2 left for
// later: these wore the old shell he called "AI like vibe coded slop" on the
// lists. The plan is docs/1.9-build/notes/theology-fable.md.
//
// What a reader would notice if this broke: two bars stacked, or a bar with
// no name; the "Theology" label and its row of four pills back over a page;
// the search pill floating over the words; a gold line, a red label or an
// outlined box on a quotation; a heading in English on an answer in every
// language; the saints an answer cites listed twice, or the answers beside
// it by their addresses; a page that says something it did not say before,
// or no longer says something it did. Read as text, as the other Theology
// suites are: the built pages are measured by scripts/mock-leaf-pages.mjs.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { APOLOGETICS_TOPICS, getApologeticsMeta } from "@/lib/apologetics/topics";
import { resolveCitation } from "@/lib/citations/resolve";
import { CONDEMNATIONS, OTHER_COUNCILS } from "@/lib/heresies/conciliar";
import { HERESIES } from "@/lib/heresies/heresies";
import { shouldShowBack } from "@/lib/nav/backBar";
import { buildRelated } from "@/lib/theology/relations";
import { THEOLOGY_SUBJECTS } from "@/lib/theology/subjects";
import type { TopicCitation } from "@/lib/topics/topics";
import { kindOf } from "@/lib/ui/routeMotion";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes. */
const code = (file: string) =>
  read(file)
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const MESSAGES = path.join(ROOT, "lib/i18n/messages");
const catalogs = fs
  .readdirSync(MESSAGES)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ lang: f.replace(/\.json$/, ""), messages: JSON.parse(read(`lib/i18n/messages/${f}`)) as Record<string, string> }));

const FRAME = "components/theology/LeafPage.tsx";
const STYLE = "components/theology/wayStyle.ts";
const CARD = "components/citations/CitationCard.tsx";
const RAIL = "components/theology/RelatedRail.tsx";
const READER = "components/apologetics/ApologeticsReader.tsx";
const COUNCIL = "components/theology/CouncilMark.tsx";
const TOPIC = "app/(app)/topics/[slug]/page.tsx";
const HERESY = "app/(app)/heresies/[slug]/page.tsx";
const ANSWER = "app/(app)/apologetics/[slug]/page.tsx";
const CREED = "app/(app)/theology/creed/page.tsx";

/** Each kind: its page, an address of one, the bar it mounts, and where its frame is opened. */
const KINDS = [
  { kind: "topic", page: TOPIC, frame: TOPIC, route: "/topics/theosis", bar: '<MobileTopBar title={topic.title} back backFallback="/topics" revealTitleOn={LEAF_TITLE} searchPlace="theology" />', up: '{ href: "/topics", label: "discover.tile.topics" }' },
  { kind: "heresy", page: HERESY, frame: HERESY, route: "/heresies/arianism", bar: '<MobileTopBar title={h.name} back backFallback="/heresies" revealTitleOn={LEAF_TITLE} searchPlace="theology" />', up: '{ href: "/heresies", label: "discover.tile.heresies" }' },
  { kind: "answer", page: ANSWER, frame: READER, route: "/apologetics/atheism", bar: '<MobileTopBar title={meta.title} back backFallback="/apologetics" revealTitleOn={LEAF_TITLE} searchPlace="theology" />', up: '{ href: "/apologetics", label: "discover.tile.apologetics" }' },
  { kind: "creed", page: CREED, frame: CREED, route: "/theology/creed", bar: '<MobileTopBar titleKey="creed.title" back backFallback="/theology" revealTitleOn={LEAF_TITLE} searchPlace="theology" />', up: '{ href: "/theology", label: "nav.discoverMenu.theology" }' },
] as const;
/** Everything this round wrote or redrew for the leaf pages. */
const OWN = [FRAME, CARD, READER, COUNCIL, TOPIC, HERESY, ANSWER, CREED];

describe("each page the four lists open", () => {
  it("wears one bar: the page's name, back to its list, the search turned to Theology", () => {
    for (const k of KINDS) {
      // In the page's own file, where lib/nav/__tests__/backBar.test.ts looks for it.
      expect(code(k.page), k.page).toContain(k.bar);
      // The apps' back bar steps aside for it, so there is one bar and not two.
      expect(shouldShowBack(k.route), k.route).toBe(false);
      expect(shouldShowBack(`${k.route}/`), `${k.route}/`).toBe(false);
    }
    // Every one of them, not the three the test walks.
    for (const h of HERESIES) expect(shouldShowBack(`/heresies/${h.slug}`), h.slug).toBe(false);
    for (const a of APOLOGETICS_TOPICS) expect(shouldShowBack(`/apologetics/${a.slug}`), a.slug).toBe(false);
    // The bar takes the name once the page's own heading has gone up under it.
    expect(code(STYLE)).toContain('export const LEAF_TITLE = "leaf-title";');
    expect(code(FRAME)).toMatch(/<h1\s+id=\{LEAF_TITLE\}\s/);
  });

  it("stands in the frame the four kinds share, under the way back up to its list", () => {
    for (const k of KINDS) {
      const frame = code(k.frame);
      expect(frame, k.frame).toMatch(new RegExp(`<LeafPage\\s+kind="${k.kind}"\\s+up=\\{${k.up.replace(/[{}./]/g, "\\$&")}\\}`));
    }
    const frame = code(FRAME);
    // On a computer the list's name leads back up; a phone has the bar's.
    expect(frame).toMatch(/hidden[^"]*md:block native-md-hidden">\s*<Link href=\{up\.href\}/);
    // The head: its mark, its name, its one small line.
    for (const hook of ["data-leaf-page={kind}", "data-leaf-head", "data-leaf-name", "data-leaf-line"]) expect(frame, hook).toContain(hook);
    // The name is in Lora at title size, never a small label over a giant headline.
    expect(frame).toMatch(/<h1\s+id=\{LEAF_TITLE\}\s+data-leaf-name=""\s+lang=\{nameLang\}\s+dir=\{textDir\(nameLang\)\}\s+className="font-serif text-title font-bold /);
    // A long word breaks where its language allows: in German the Creed's name ran off a phone's edge.
    expect(frame).toMatch(/<h1\s[^>]* hyphens-auto break-words"\s*>/);
    for (const file of OWN) expect(code(file), file).not.toMatch(/text-display/);
  });

  it("left the old shell: no label over a row of pills, and no floating search pill", () => {
    for (const file of OWN) {
      for (const gone of ["TheologyShell", "TheologyNav", "TheologyArticleNav", "<TheologySearch", "rounded-full px-4"]) expect(code(file), `${file}: ${gone}`).not.toContain(gone);
    }
    for (const gone of ["components/theology/TheologyShell.tsx", "components/theology/TheologyNav.tsx", "components/theology/TheologyArticleNav.tsx"]) {
      expect(fs.existsSync(path.join(ROOT, gone)), `${gone} is the old shell, which no page wears`).toBe(false);
    }
  });

  it("draws in the ink and the ground: no gold, no colour typed in, no outlined box, no pill as a place to go", () => {
    for (const file of [...OWN, RAIL]) {
      const src = code(file);
      expect(src, `${file}: gold`).not.toMatch(/gold/);
      expect(src, `${file}: a colour typed in`).not.toMatch(/#[0-9a-fA-F]{3,8}\b|--ink-rubric|rgba?\(/);
      // The old boxes: an outline with a faint fill.
      expect(src, `${file}: an outlined box`).not.toMatch(/rounded-(?:md|lg) border border-paper/);
      // A place to go is a row in a tray, never a pill (CLAUDE.md, "Floating pills only where they belong").
      expect(src, `${file}: a pill`).not.toMatch(/rounded-pill/);
    }
  });
});

describe("the head is the row that was tapped, grown", () => {
  it("a question wears its subject's icon whole on its plate, and the card's own picture travels into it", () => {
    const page = code(TOPIC);
    expect(page).toContain("const subject = THEOLOGY_SUBJECTS.find((s) => s.topics.includes(topic.slug));");
    expect(page).toContain("mark={subject ? <LeafPicture src={subject.picture.src} carry={`topic:${topic.slug}`} /> : <LeafGlyph icon={Book} />}");
    // How many of the Fathers it cites, as its card and the path say it.
    expect(page).toContain('line={<T k="topics.citations" count={topic.citations.length} />}');
    expect(code("app/(app)/topics/page.tsx")).toContain('<span aria-hidden data-row-picture="" data-carry={`topic:${card.slug}`} className="path-plate w-[78px] shrink-0">');
    const frame = code(FRAME);
    expect(frame).toMatch(/data-leaf-mark="picture" data-carry-into=\{carry\} className="path-plate w-\[96px\] shrink-0">\s*<WholeIcon src=\{src\} eager /);
  });

  it("every question on file belongs to a subject, so every one has its picture", () => {
    const files = fs.readdirSync(path.join(ROOT, "data/topics")).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const slug = (JSON.parse(read(`data/topics/${file}`)) as { slug: string }).slug;
      expect(THEOLOGY_SUBJECTS.some((s) => s.topics.includes(slug)), `${slug} belongs to no subject: its page wears the book`).toBe(true);
    }
  });

  it("an error wears the scroll and its century, an answer the shield and its length, the Creed the book", () => {
    const heresy = code(HERESY);
    expect(heresy).toContain("mark={<LeafGlyph icon={Scroll} carry={`heresy:${h.slug}`} />}");
    expect(heresy).toMatch(/name=\{h\.name\}\s+nameLang="en"\s+line=\{h\.era\}\s+lineLang="en"/);
    // The list's row wears no icon tile (1.9, the fifteen screens, rule 4), so nothing is carried from it:
    // the house's page transition runs as for any link.
    expect(code("app/(app)/heresies/page.tsx")).not.toContain("data-carry={`heresy:${h.slug}`}");

    const reader = code(READER);
    expect(reader).toContain("mark={<LeafGlyph icon={Shield} carry={`answer:${body.slug}`} />}");
    expect(reader).toContain('line={minutes ? <T k="bible.minRead" replacements={{ minutes }} /> : undefined}');
    expect(code(ANSWER)).toContain("<ApologeticsReader body={body} minutes={meta.estimatedMinutes} groups={groups} />");
    // The list's card wears no icon tile (1.9, the fifteen screens, rule 4), so nothing is carried from it.
    expect(code("app/(app)/apologetics/page.tsx")).not.toContain("data-carry={`answer:${answer.slug}`}");

    const creed = code(CREED);
    expect(creed).toContain('mark={<LeafGlyph icon={Codex} carry="creed:lines" />}');
    expect(creed).toContain('name={<T k="creed.title" />}');
    // The Creed's row wears no icon tile (rule 4), so nothing is carried from it.
    expect(code("components/theology/TheologyLibrary.tsx")).not.toContain('data-carry="creed:lines"');

    // A glyph is lit at the head as a way's own page lights its own.
    expect(code(FRAME)).toMatch(/data-leaf-mark="glyph" data-carry-into=\{carry\} className="theology-glyph shrink-0 text-paper">\s*<Glyph size=\{32\} \/>/);
    // Each name a mark travels under has a kind the stylesheet can tell (lib/ui/routeMotion.ts).
    for (const key of ["topic:theosis", "heresy:arianism", "answer:atheism", "creed:lines"]) expect(kindOf(key), key).toBe(key.split(":")[0]);
  });
});

describe("a quotation on these pages", () => {
  it("is a Father's words on a raised surface, his face beside our line on them, and the line that opens them", () => {
    const card = code(CARD);
    expect(card).toContain("<figure data-citation=\"\" className={LEAF_CARD}>");
    expect(card).toContain("<FatherFace father={{ slug: c.saintSlug, name: c.saintName, iconUrl: c.saintIcon }} size={34} />");
    // Only beside a work that is his own; the book on a plate beside any other.
    expect(card).toMatch(/\{c\.ownWork \? \(\s*<FatherFace /);
    expect(card).toContain('data-citation-mark="work"');
    expect(card).toContain("{c.ownWork ? c.saintName : c.workTitle}");
    expect(card).toContain("<blockquote lang=\"en\" dir=\"ltr\" {...VERBATIM} className={`mt-3 ${LEAF_WORDS}`}>");
    expect(card).toContain("<SourceLine cite={c.cite} />");
    // His words alone: no marks typed round them.
    expect(card).not.toMatch(/&[lr]dquo;|[“”]/);
    // A summary in our voice quotes nothing: the words are drawn only when they are his.
    expect(card).toContain("{c.paragraph ? (");
    // The face needs his page's slug, which a resolved citation now carries,
    // and whether the work is his own, which the resolver already knew.
    expect(code("lib/citations/resolve.ts")).toContain("saintSlug: c.saintSlug,");
    expect(code("lib/citations/resolve.ts")).toContain("ownWork: hisWords,");
    const style = code(STYLE);
    expect(style).toContain('export const LEAF_CARD = "theology-tray rounded-[18px] px-4 py-4";');
    expect(style).toMatch(/export const LEAF_WORDS = "font-serif text-\[16\.5px\] italic leading-\[1\.7\] text-paper\/88";/);
  });

  it("puts a Father's face only beside a work that is his own, on every topic and heresy on file", async () => {
    const topics = fs
      .readdirSync(path.join(ROOT, "data/topics"))
      .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
      .map((f) => JSON.parse(read(`data/topics/${f}`)) as { slug: string; citations: TopicCitation[] });
    const cited = [...topics.map((t) => ({ where: t.slug, citations: t.citations })), ...HERESIES.map((h) => ({ where: h.slug, citations: h.refutedBy }))];
    let faces = 0;
    let books = 0;
    for (const { where, citations } of cited) {
      for (const c of citations) {
        const r = await resolveCitation(c);
        if (!r) continue;
        const named = r.cite?.kind === "father" ? r.cite.author : "";
        if (r.ownWork) {
          faces++;
          // His own work: its line names him, as the card's face shows him.
          expect(named, `${where}: ${c.saintSlug}/${c.workSlug} is his own, and its line names no author`).toBeTruthy();
        } else {
          books++;
          // Not his own words: nothing is quoted as his, and the line puts no author to it.
          expect(r.paragraph, `${where}: ${c.saintSlug}/${c.workSlug} is quoted as his words`).toBeNull();
          expect(named, `${where}: ${c.saintSlug}/${c.workSlug}`).toBe("");
        }
      }
    }
    // Both kinds are on file: the florilegium on St Gregory Palamas's page is the case in hand.
    expect(faces).toBeGreaterThan(0);
    expect(books).toBeGreaterThan(0);
    const palamas = await resolveCitation({ saintSlug: "gregory-palamas", workSlug: "essence-and-energies", sectionN: 1, stance: "affirms" });
    expect(palamas?.ownWork).toBe(false);
    const athanasius = await resolveCitation({ saintSlug: "athanasius-the-great", workSlug: "on-the-incarnation", sectionN: 1, stance: "affirms" });
    expect(athanasius?.ownWork).toBe(true);
  });

  it("is held by both pages that quote the Fathers, each part named in Lora with how many it holds", () => {
    const topic = code(TOPIC);
    expect(topic).toContain('<LeafPart id="topic-confessed" title={<T k="topics.confessed" />} count={resolvedAffirming.length}');
    expect(topic).toContain('<LeafPart id="topic-refuted" title={<T k="topics.refuted" />} count={resolvedRefuting.length}');
    // Never an empty part.
    expect(topic).toContain("{resolvedAffirming.length > 0 ? (");
    expect(topic).toContain("{resolvedRefuting.length > 0 ? (");
    const heresy = code(HERESY);
    expect(heresy).toContain('<LeafPart id="heresy-refuted" title={<T k="study.heresies.refutedByFathers" />} count={resolvedRefutations.length}');
    for (const page of [topic, heresy]) expect(page).toContain("<CitationCard c={c} />");
    const frame = code(FRAME);
    expect(frame).toMatch(/<h2 id=\{id\} className=\{WAY_H2\}>/);
    expect(frame).toContain("{count === undefined ? null : <span className={WAY_FACT}>{count}</span>}");
  });
});

describe("English on these pages", () => {
  it("says its direction with its language, so it reads left to right under Arabic and Urdu", () => {
    // Build 90 note 4 (lib/i18n/__tests__/textDirection.test.ts holds the whole app to it):
    // none of these files is on the list of those not yet marked.
    for (const file of [...OWN, RAIL]) {
      const src = code(file);
      const said = src.match(/\blang="en"/g)?.length ?? 0;
      const directed = src.match(/\blang="en" dir="ltr"/g)?.length ?? 0;
      // A component handed a language says the direction where it draws it (SourceList, in its own file).
      const handed = src.match(/<SourceList [^>]*lang="en"/g)?.length ?? 0;
      expect(directed, file).toBe(said - handed);
    }
    // The head: a name from a registry says its language and direction on the heading itself, where
    // the walk on the export measures it (scripts/rtl-walk.mjs reads the innermost block); a name
    // and a line both in English are one block of it, and say so together. A catalog's name says none.
    const frame = code(FRAME);
    expect(frame).toContain("const both = line && nameLang && nameLang === lineLang ? nameLang : undefined;");
    expect(frame).toContain('<div className="min-w-0" lang={both} dir={textDir(both)}>');
    expect(frame).toContain('<p data-leaf-line="" lang={lineLang} dir={textDir(lineLang)} ');
    expect(code(TOPIC)).toMatch(/name=\{topic\.title\}\s+nameLang="en"/);
    expect(code(READER)).toMatch(/name=\{body\.title\}\s+nameLang="en"/);
    expect(code(CREED)).not.toContain("nameLang");
    // A line that opens its place: the words say it, and the link with its chevron runs with the page.
    // Under Arabic and Urdu the words stand at the row's start, beside the chevron (the rows rule, build 90 note 4).
    expect(code(HERESY)).toMatch(/<Link href=\{href\} prefetch=\{false\} className=\{PLACE\}>\s*<span lang="en" dir="ltr" className="min-w-0 rtl:text-right">/);
  });
});

describe("words the app did not write", () => {
  it("keep their edition's dashes by name, on the words themselves and on nothing of the app's own", () => {
    // A Father's text is quoted as its edition prints it (a dash after "Chapter I."),
    // and the app's own words never carry an em dash: the check that fails a
    // screen for one lists these instead, with the reason.
    const verbatim = code("components/citations/verbatim.ts");
    expect(verbatim).toContain('"data-mock-allow": "emdash",');
    expect(verbatim).toMatch(/"data-mock-why": "[^"]{8,}",/);
    const checker = read("scripts/mock-check.mjs");
    expect(checker).toContain('allowance(el, "emdash")');
    expect(checker).toContain('for (const d of dark.dashes) allow("emdash", d.name, d.allow);');
    // A label is the app's own: no allowance reaches it.
    expect(checker).toContain('emDash: labels.includes("\\u2014") || dashes.some((d) => !d.allow)');
    // Only the quoted words wear it: three blockquotes, and no element else.
    for (const file of [CARD, HERESY, READER]) {
      const src = code(file);
      expect(src.match(/\{\.\.\.VERBATIM\}/g), file).toHaveLength(1);
      expect(src, file).toMatch(/<blockquote lang="en" dir="ltr" \{\.\.\.VERBATIM\} /);
    }
    // And the app's own words on these pages carry none.
    for (const file of [...OWN, RAIL, FRAME]) expect(code(file), file).not.toContain("\u2014");
  });
});

describe("a heresy's record", () => {
  it("says the century once, at the head, and the rest at a glance on one raised surface", () => {
    const page = code(HERESY);
    expect(page).toContain('<dl data-heresy-facts="" className="theology-tray ');
    for (const key of ["study.proponent", "study.heresies.alsoCalled", "study.heresies.condemnedAt"]) expect(page, key).toContain(`key: "${key}"`);
    // The century is the head's own line: it is not said again beneath it.
    expect(page).not.toContain("study.period");
    expect(page.match(/h\.era/g)).toHaveLength(1);
  });

  it("keeps every word it had: the claim and the response with their sources, the council's words, the councils, the Fathers", () => {
    const page = code(HERESY);
    for (const part of [
      '<T k="study.heresies.theClaim" />',
      "{named(marked(h.definition, sources, HERESY_SOURCE))}",
      '<T k="study.heresies.orthodoxResponse" />',
      "{named(marked(h.response, sources, HERESY_SOURCE))}",
      '<SourceList id="heresy-sources" idPrefix={HERESY_SOURCE} sources={sources} lang="en"',
      '<T k="study.heresies.oursAwaitingReview" />',
      '<T k="study.heresies.inTheirWords" />',
      '{/^[a-z]/.test(c.words) ? "… " : ""}',
      "{c.words}",
      '{/[.;:!?]$/.test(c.words) ? "" : " …"}',
      "href={`/councils/${c.council}/${c.document}#s${c.section}`}",
      "href={`/history/${c.event}`}",
      "{afterName(c.source)}",
      '<T k="study.heresies.condemnedByChurch" />',
      "{c.byname}",
      "{c.year} &middot; {c.location}",
      "href={c.href ?? `/history/${c.history}`}",
      '<T k="study.curatedBy" /> {h.curatedBy}',
    ]) {
      expect(page, part).toContain(part);
    }
    // The claim before the response, the sources under the two.
    expect(page.indexOf("study.heresies.theClaim")).toBeLessThan(page.indexOf("study.heresies.orthodoxResponse"));
    expect(page.indexOf("study.heresies.orthodoxResponse")).toBeLessThan(page.indexOf("<SourceList "));
  });

  it("sets the council's own words on their own type, each opening where it stands", () => {
    const page = code(HERESY);
    expect(page).toContain('<li key={i} data-council-words="" className={LEAF_CARD}>');
    expect(page).toContain('<blockquote lang="en" dir="ltr" {...VERBATIM} className={LEAF_WORDS}>');
    // The place is the link, drawn as the line under every quotation is, 44px to the touch.
    expect(page).toMatch(/const PLACE = "tap-press hit-44 inline-flex /);
    // Every error with a council's words has somewhere for them to open.
    for (const [slug, lines] of Object.entries(CONDEMNATIONS)) {
      expect(HERESIES.some((h) => h.slug === slug), slug).toBe(true);
      for (const line of lines) expect(line.kind === "council" ? line.document : line.event, `${slug}: ${line.label}`).toBeTruthy();
    }
  });

  it("lists the councils that condemned it as rows, each with its picture where it has one", () => {
    const page = code(HERESY);
    expect(page).toContain("<CouncilMark slug={c.slug} />");
    expect(page).toContain("<CouncilMark />");
    expect(page).toMatch(/const ROW = "theology-row flex min-h-\[54px\] /);
    const mark = code(COUNCIL);
    expect(mark).toContain("councilPicture(slug, IS_STATIC_EXPORT)");
    // Where it has none, nothing: a row has no icon tile (1.9, the fifteen screens, rule 4).
    expect(mark).toContain("if (!slug || !picture) return null;");
    expect(mark).not.toContain("theology-plate");
    // A council outside the seven has a place to open all the same.
    for (const [slug, others] of Object.entries(OTHER_COUNCILS)) for (const c of others) expect(c.href ?? c.history, `${slug}: ${c.name}`).toBeTruthy();
  });
});

describe("an answer", () => {
  it("takes its headings from the catalog, in every language", () => {
    const reader = code(READER);
    const keys = ["study.theology.fromTheFathers", "study.theology.scriptureCrossRefs", "study.apologetics.goDeeper", "study.curatedBy", "study.source", "bible.minRead", "discover.tile.apologetics"];
    for (const key of keys) {
      expect(reader, key).toContain(`"${key}"`);
      for (const { lang, messages } of catalogs) expect(messages[key], `${lang}: ${key}`).toBeTruthy();
    }
    // Until 1.9 these were typed into the file in English.
    for (const typed of [">Apologetics<", "From the Fathers", "Scripture cross-references", "Saints cited", ">Related<", "Curated by", ">\n            Source\n"]) {
      expect(reader, typed).not.toContain(typed);
    }
  });

  it("keeps the study's own words as they stood: its line, its summary, its essay, its note", () => {
    const reader = code(READER);
    for (const part of ["{body.subtitle}", "{body.summary}", "<EssayPart key={i} block={b} />", "{q.text}", "{q.gloss}", "{q.author}", "{q.work}", "{q.reference ?? null}", "{s.ref}", "{s.note}"]) {
      expect(reader, part).toContain(part);
    }
    // Two things it showed were written for editors and are gone (lib/prayers/__tests__/noStandIns.test.ts):
    // the promise where an answer has no passages yet, and the file's own note under who curated it.
    expect(reader).not.toContain("being assembled");
    expect(reader).not.toContain("body.origin");
    expect(reader).toContain('<T k="study.curatedBy" /> {body.curatedBy}');
    // Where the words stand, as every quotation's line names it (lib/citations/__tests__/quotes.test.ts).
    expect(reader).toContain("shownCite(q.cite)");
    expect(reader).toContain("<SourceLine cite={shown} />");
  });

  it("lists what it leads to once, as rows: the saints it quotes and the answers beside it among them", () => {
    const reader = code(READER);
    expect(reader).toContain('<RelatedRail groups={groups} title={<T k="study.apologetics.goDeeper" />} />');
    // Not again as pills over it.
    expect(reader).not.toContain("saintsCitedIn");
    expect(reader).not.toContain('slug.replace(/-/g, " ")');
    const page = code(ANSWER);
    expect(page).toContain("apologetics: (body.related ?? []).filter(");
    expect(page).toContain("saints: body.florilegium");
    // An answer beside it is listed by its name, and only once it is written.
    for (const answer of APOLOGETICS_TOPICS.filter((a) => !a.planned)) {
      const body = JSON.parse(read(`data/apologetics/${answer.slug}.json`)) as { related?: string[] };
      const beside = (body.related ?? []).filter((s) => {
        const meta = getApologeticsMeta(s);
        return Boolean(meta) && !meta?.planned;
      });
      const rows = buildRelated("apologetics", answer.slug, { apologetics: beside }).apologetics;
      expect(rows.map((r) => r.slug), answer.slug).toEqual(beside);
      for (const row of rows) {
        expect(row.label, `${answer.slug} → ${row.slug}`).toBe(getApologeticsMeta(row.slug)?.title);
        expect(row.href).toBe(`/apologetics/${row.slug}`);
      }
    }
  });

  it("sets the Scriptures it cites as rows into the Bible, 44px and more to the touch", () => {
    const reader = code(READER);
    expect(reader).toContain("href={`/bible?q=${encodeURIComponent(s.bibleRef ?? s.ref)}`}");
    expect(reader).toMatch(/className="theology-row flex min-h-\[54px\] items-start /);
  });
});

describe("what a page leads to", () => {
  it("is one part named in Lora over one tray, each row with its mark and its kind", () => {
    const rail = code(RAIL);
    expect(rail).toContain('<LeafPart id="related-title" title={title} count={rows.length} data-related="">');
    expect(rail).toContain("const rows = ORDER.flatMap((g) => groups[g].map((link) => ({ g, link })));");
    expect(rail).toContain('className="theology-row flex min-h-[60px] items-center gap-3 rounded-[14px] px-2.5 py-2.5"');
    expect(rail).toContain("<RelatedMark group={g} link={link} />");
    expect(rail).toContain("<T k={GROUP_LABEL[g]} />");
    // Pictures lead: a Father's face, a council's picture; a way's row wears no icon tile (1.9, the fifteen screens, rule 4).
    expect(rail).toContain('if (group === "saints")');
    expect(rail).toContain("<FatherFace father={{ slug: link.slug, name: link.label, iconUrl: getSaint(link.slug)?.iconUrl }} size={34} />");
    expect(rail).toContain('if (group === "councils") return <CouncilMark slug={link.slug} />;');
    expect(rail).not.toContain("theology-plate");
    // The kinds are named from the catalog, in every language.
    for (const key of ["study.doctrine", "discover.tile.apologetics", "discover.tile.heresies", "discover.tile.topics", "nav.councils", "footer.theFathers", "study.related"]) {
      for (const { lang, messages } of catalogs) expect(messages[key], `${lang}: ${key}`).toBeTruthy();
    }
  });

  it("leaves a doctrine's own rows as they were approved", () => {
    const rail = code(RAIL);
    // r3-13's rows: each kind named once over its tray, no mark.
    expect(rail).toContain('<aside className="mt-8">');
    expect(rail).toContain('className="theology-row mx-1.5 flex min-h-[44px] items-center gap-3 rounded-[14px] px-3 py-2"');
    expect(code("components/theology/TopicReader.tsx")).toContain("<RelatedRail groups={rest} bare />");
    // And these three are the pages that draw the new form.
    for (const file of [TOPIC, HERESY, READER]) expect(code(file), file).toMatch(/<RelatedRail groups=\{(?:related|groups)\}(?: title=\{<T k="study\.apologetics\.goDeeper" \/>\})? \/>/);
  });
});

describe("the Creed line by line", () => {
  it("is the Creed it was: its key, its twelve articles, the words Constantinople added lit", () => {
    const page = code(CREED);
    for (const part of [
      '<p className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 font-sans text-ui text-paper/72">',
      '<T k="creed.nicaea" />',
      '<mark className="creed-added">',
      '<T k="creed.constantinople" />',
      '<StillInEnglish kind="work" className="mt-6" />',
      '<ol className="mt-10 md:mt-12 space-y-7" data-creed="">',
      "{CREED_ARTICLES.map((a) => (",
      'p.from === "first-constantinople" ? (',
      '<p lang="en" dir="ltr" className="min-w-0 font-serif text-lede leading-[1.7] text-paper/80">',
    ]) {
      expect(page, part).toContain(part);
    }
  });

  it("closes on the two Symbols it is read from, as rows in one tray, each with its council's picture", () => {
    const page = code(CREED);
    expect(page).toContain('<ul data-creed-sources="" className={`${WAY_TRAY} mt-10`}>');
    expect(page).toContain("href={`/councils/${s.council}/${s.document}`}");
    expect(page).toContain("<CouncilMark slug={s.council} />");
    expect(page).toMatch(/className="theology-row flex min-h-\[56px\] /);
  });
});
