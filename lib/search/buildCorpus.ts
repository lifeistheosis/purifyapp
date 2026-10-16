import "server-only";

// Cross-surface command-palette corpus. Assembled once on the server from the
// pure-data registries (saints and their works, prayer rules, akathists,
// lessons, plans, councils, heresies, Bible books) plus the filesystem-loaded
// topics, then written out as one file, app/search-corpus.json, which the
// palette fetches the first time it is opened. No fuzzy index is precomputed
// here: the corpus is small enough (under a thousand entries) that the client
// filters it directly.
//
// What is NOT here: a typed Bible reference ("John 3:16"). That cannot be a
// list, so the palette works it out as the reader types (./references.ts).
//
// Hidden v10.0 setup: this is the single index the expanded library
// (catena, apologetics, audio-bible passages) will be appended to.

import { SAINTS } from "@/lib/saints/saints";
import { COUNCILS } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";
import { BOOKS, NAMED_PASSAGES, getBook } from "@/lib/bible/books";
import { RULES } from "@/lib/prayers/rules";
import { loadAllTopics } from "@/lib/topics/topics";
import { publishedEvents } from "@/lib/history/events";
import { allWorks } from "@/lib/reading/surfaces";
import { listAkathists } from "@/lib/prayers/akathists";
import { LESSONS } from "@/lib/prayers/learning";
import { READING_PLANS } from "@/lib/plans/plans";
import { THEOLOGY_TOPICS } from "@/lib/theology/topics";
import { DICTIONARY } from "@/lib/dictionary/terms";
import { WALKTHROUGHS } from "@/lib/walkthroughs";
import { chantIndex } from "@/lib/chants/registry.server";
import { chantTitleKey, kindKey } from "@/lib/chants/names";
import { walkthroughsEnabled } from "@/lib/walkthroughs/flags";
import { shopEnabled } from "@/lib/shop/flags";
import en from "@/lib/i18n/messages/en.json";
import type { SearchItem } from "./types";

export type { SearchItem, SearchGroup } from "./types";
export { GROUP_ORDER } from "./types";

const MESSAGES = en as Record<string, string>;

/**
 * A line of the app's own wording, with the English it had when this was
 * written as the fallback. The fallback keeps a renamed key from emptying a
 * row in production; the test beside this file is what notices the rename.
 */
function say(key: string, fallback: string): string {
  return MESSAGES[key] || fallback;
}

/**
 * A row's name from the catalog, with the key it came from, so the palette
 * can show the row as the reader's own catalog says it
 * (lib/search/match.ts, inReadersLanguage). All 21 languages carry these.
 */
function said(key: string, fallback: string): { label: string; labelKey: string } {
  return { label: say(key, fallback), labelKey: key };
}

const STATIC_PAGES: SearchItem[] = [
  { id: "page-calendar", label: "The Church calendar", href: "/calendar", group: "Other" },
  { id: "page-discover", ...said("nav.discover", "Discover"), href: "/discover", group: "Other" },
  { id: "page-reading", ...said("nav.reading", "Reading"), href: "/reading", group: "Other" },
  // Chants (1.7), where the Kitchen was; each chant is a row of its own below.
  { id: "page-chants", ...said("chants.title", "Chants"), href: "/chants", group: "Prayers", keywords: "chant hymn hymns music sung byzantine znamenny troparion kontakion psalm tone" },
  { id: "page-support", label: "Support Purify", href: "/support", group: "Other", keywords: "donate give giving" },
  { id: "page-pricing", label: "Pricing", href: "/pricing", group: "Other", keywords: "app pass subscription free" },
  { id: "page-whats-new", label: "What's new", href: "/whats-new", group: "Other", keywords: "release notes changelog updates" },
  { id: "page-about", label: "About Purify", href: "/about", group: "Other" },
  { id: "page-parishes", ...said("parishes.title", "Find a parish"), href: "/parishes", group: "Other", keywords: "church near me parish finder directory locator jurisdiction" },
  { id: "page-start", ...said("nav.discoverMenu.start", "Start here"), href: "/start", group: "Other", keywords: "new to orthodoxy beginner inquirer catechumen convert first steps where to begin" },
  // Your first Liturgy (1.7): the guide for an inquirer going to a first Divine Liturgy.
  { id: "page-first-liturgy", ...said("start.liturgy.title", "Your first Liturgy"), href: "/start/first-liturgy", group: "Other", keywords: "first liturgy visit visiting church service sunday what to expect what to wear etiquette divine liturgy inquirer visitor" },
  // One search (1.6): the screens a reader could reach only by knowing where
  // they were. The owner's test for this list was "prayers, saints, verses
  // and settings"; before it the palette could not find the journal, a
  // reading plan, the walkthrough, the Hours or a single setting. Each is
  // named as its own screen names itself, so the row and the page agree.
  { id: "page-prayers-today", label: "Today's prayer", href: "/prayers/today", group: "Prayers", keywords: "daily rule now pray" },
  { id: "page-hours", label: "The Hours", href: "/prayers/hours", group: "Prayers", keywords: "first third sixth ninth hour compline horologion" },
  { id: "page-akathists", label: "Akathists", href: "/prayers/akathists", group: "Prayers", keywords: "akathist hymn theotokos" },
  { id: "page-learning", label: "Learn to pray", href: "/prayers/learning", group: "Prayers", keywords: "beginner lessons how to pray new start here" },
  { id: "page-personal", label: "Diptychs: your prayer list", href: "/prayers/personal", group: "Prayers", keywords: "personal prayers names living departed intentions pray for" },
  { id: "page-saints", ...said("nav.saints", "Saints"), href: "/saints", group: "Saints", keywords: "lives all the saints index" },
  { id: "page-catechism", label: "Today's Catechism", href: "/catechism", group: "Other", keywords: "questions answers learn faith quiz" },
  { id: "page-plans", ...said("plans.title", "Reading plans"), href: "/plans", group: "Reading", keywords: "plan schedule daily reading" },
  { id: "page-journal", ...said("journal.title", "Your journal"), href: "/journal", group: "Other", keywords: "notes diary write reflection" },
  { id: "page-saved", label: "Your saved", href: "/saved", group: "Other", keywords: "bookmarks highlights favourites favorites saved verses" },
  { id: "page-florilegium", label: "Florilegium", href: "/florilegium", group: "Reading", keywords: "gather collect quotes passages collection" },
  { id: "page-fasting", label: "The Fast", href: "/fasting", group: "Other", keywords: "fasting lent wine oil fish rule" },
  { id: "page-theology", label: "Theology", href: "/theology", group: "Topics", keywords: "doctrine teaching" },
  { id: "page-councils", label: "The Ecumenical Councils", href: "/councils", group: "Councils & Heresies", keywords: "council canons nicaea" },
  { id: "page-history", label: "Orthodox History", href: "/history", group: "History", keywords: "timeline church history" },
  { id: "page-community", ...said("nav.community", "Community"), href: "/community", group: "Other", keywords: "chat posts prayer wall people" },
  { id: "page-faq", label: "FAQ", href: "/faq", group: "Other", keywords: "help questions answers" },
  { id: "page-privacy", label: "Privacy", href: "/privacy", group: "Other", keywords: "data policy" },
];

/**
 * Settings, under the names the Settings screen gives them (the same catalog
 * keys), so the row found here is the row the reader then sees. Most open
 * the one Settings screen: what a search buys is that "dark mode" or "old
 * calendar" finds it at all. Each opens it AT its section (the # is the
 * section's id in components/settings/SettingsClient.tsx, and a test holds
 * the two together), since Settings is three screens long on a phone.
 *
 * Left out on purpose: Animations, the widget and Discord status. Each is
 * shown by some shells and not others, and this list is one file for all of
 * them. A result that opens a screen without the thing it named is worse
 * than no result.
 */
const IN_SETTINGS = say("nav.settings", "Settings");
const IN_ACCOUNT = say("settings.account", "Your account");
const SETTINGS: SearchItem[] = [
  { id: "setting-all", label: IN_SETTINGS, labelKey: "nav.settings", href: "/settings", group: "Settings", keywords: "preferences options" },
  { id: "setting-reading-mode", ...said("ui.readingMode", "Reading mode"), sublabel: IN_SETTINGS, sublabelKey: "nav.settings", href: "/settings#reading", group: "Settings", keywords: "theme dark mode light mode true black night candlelight monastery parchment appearance colours colors" },
  { id: "setting-reader-font", ...said("ui.readerFont", "Reader font"), sublabel: IN_SETTINGS, sublabelKey: "nav.settings", href: "/settings#reading", group: "Settings", keywords: "typeface serif sans letters" },
  { id: "setting-reader-size", ...said("ui.readerSize", "Reader size"), sublabel: IN_SETTINGS, sublabelKey: "nav.settings", href: "/settings#reading", group: "Settings", keywords: "text size font size bigger smaller larger large" },
  { id: "setting-interlinear", ...said("ui.interlinearByDefault", "Interlinear by default"), sublabel: IN_SETTINGS, sublabelKey: "nav.settings", href: "/settings#reading", group: "Settings", keywords: "greek hebrew original language word study" },
  { id: "setting-calendar", ...said("ui.calendarReckoning", "Calendar reckoning"), sublabel: IN_SETTINGS, sublabelKey: "nav.settings", href: "/settings#calendar", group: "Settings", keywords: "old calendar new calendar julian revised gregorian" },
  { id: "setting-fasting", ...said("settings.fasting", "Fasting on Today"), sublabel: IN_SETTINGS, sublabelKey: "nav.settings", href: "/settings#space", group: "Settings", keywords: "fast rule hide strict" },
  { id: "setting-space", ...said("settings.space", "Your space"), sublabel: IN_SETTINGS, sublabelKey: "nav.settings", href: "/settings#space", group: "Settings", keywords: "familiarity first focus beginner new to the faith" },
  { id: "setting-language", ...said("settings.language", "Language"), sublabel: IN_SETTINGS, sublabelKey: "nav.settings", href: "/settings#language", group: "Settings", keywords: "translate translation greek romanian filipino russian spanish idioma langue sprache" },
  // The account is the first group of the one Settings from 1.6, and its
  // screens are that group's rows: each result opens the screen its row does.
  { id: "page-account", label: IN_ACCOUNT, labelKey: "settings.account", sublabel: IN_SETTINGS, sublabelKey: "nav.settings", href: "/settings#account", group: "Settings", keywords: "sign in sign out you me plus subscription" },
  { id: "setting-profile", ...said("account.tabs.profile", "Profile"), sublabel: IN_ACCOUNT, sublabelKey: "settings.account", href: "/account/profile", group: "Settings", keywords: "name picture avatar patron saint community handle" },
  { id: "setting-security", ...said("account.tabs.security", "Security"), sublabel: IN_ACCOUNT, sublabelKey: "settings.account", href: "/account/security", group: "Settings", keywords: "password email sign in google apple sessions devices blocked muted" },
  { id: "setting-notifications", ...said("settings.notifications", "Notifications"), sublabel: IN_ACCOUNT, sublabelKey: "settings.account", href: "/account/notifications", group: "Settings", keywords: "push reminders prayer reminder alerts email" },
  { id: "setting-export", ...said("settings.export", "Export your library"), sublabel: IN_SETTINGS, sublabelKey: "nav.settings", href: "/account/export", group: "Settings", keywords: "download backup my data" },
];

export async function buildSearchCorpus(): Promise<SearchItem[]> {
  const items: SearchItem[] = [];

  for (const b of BOOKS) {
    items.push({
      id: `book-${b.slug}`,
      label: b.name,
      labelKey: `bible.books.${b.slug}`,
      sublabelKey: "bible.chapterCount",
      sublabelCount: b.chapters,
      sublabel: `${b.chapters} ${b.chapters === 1 ? "chapter" : "chapters"}`,
      href: `/bible/${b.slug}/1`,
      group: "Bible",
    });
  }

  // The passages the Church knows by their own name. They live inside
  // Daniel here, as the Septuagint files them, so a reader looking for
  // Susanna found nothing and took her for missing (lib/bible/books.ts).
  for (const p of NAMED_PASSAGES) {
    const book = getBook(p.book);
    const name = MESSAGES[`bible.passages.${p.id}`];
    if (!book || !name) continue;
    items.push({
      id: `passage-${p.id}`,
      label: name,
      labelKey: `bible.passages.${p.id}`,
      sublabel: p.verse ? `${book.name} ${p.chapter}:${p.verse}` : `${book.name} ${p.chapter}`,
      href: p.verse ? `/bible/${p.book}/${p.chapter}#v${p.verse}` : `/bible/${p.book}/${p.chapter}`,
      group: "Bible",
      keywords: p.names.join(" "),
    });
  }

  for (const s of SAINTS) {
    items.push({
      id: `saint-${s.slug}`,
      label: s.name,
      sublabel: s.epithet,
      href: `/saints/${s.slug}`,
      group: "Saints",
      keywords: s.byname,
    });
  }

  for (const r of RULES) {
    if (r.planned) continue;
    items.push({
      id: `rule-${r.id}`,
      label: r.title,
      sublabel: r.description,
      href: r.href,
      group: "Prayers",
    });
  }

  for (const c of COUNCILS) {
    items.push({
      id: `council-${c.slug}`,
      label: c.name,
      sublabel: `Council · ${c.year}`,
      href: `/councils/${c.slug}`,
      group: "Councils & Heresies",
      keywords: c.byname,
    });
  }

  for (const h of HERESIES) {
    items.push({
      id: `heresy-${h.slug}`,
      label: h.name,
      sublabel: `Heresy · ${h.era}`,
      href: `/heresies/${h.slug}`,
      group: "Councils & Heresies",
      keywords: [h.alsoCalled?.join(" "), h.heresiarch].filter(Boolean).join(" "),
    });
  }

  for (const e of publishedEvents()) {
    items.push({
      id: `history-${e.slug}`,
      label: e.title,
      sublabel: `History · ${e.displayDate}`,
      href: `/history/${e.slug}`,
      group: "History",
      keywords: [e.aliases?.join(" "), e.region, String(e.yearStart)]
        .filter(Boolean)
        .join(" "),
    });
  }

  const topics = await loadAllTopics();
  for (const t of topics) {
    items.push({
      id: `topic-${t.slug}`,
      label: t.title,
      sublabel: "Topic",
      href: `/topics/${t.slug}`,
      group: "Topics",
    });
  }

  // The works of the Fathers. Until 1.6 the palette knew the saints and
  // none of what they wrote.
  for (const w of allWorks()) {
    items.push({
      id: `work-${w.saintSlug}-${w.workSlug}`,
      label: w.title,
      sublabel: w.saintName,
      href: w.href,
      group: "Reading",
      keywords: [w.subtitle, w.topics.join(" ")].filter(Boolean).join(" "),
    });
  }

  for (const a of listAkathists()) {
    items.push({
      id: `akathist-${a.slug}`,
      label: a.title,
      sublabel: a.subtitle ?? "Akathist",
      href: `/prayers/akathists/${a.slug}`,
      group: "Prayers",
      keywords: "akathist hymn",
    });
  }

  for (const l of LESSONS) {
    items.push({
      id: `lesson-${l.id}`,
      label: l.title,
      sublabel: "Learn to pray",
      href: `/prayers/learning/${l.id}`,
      group: "Prayers",
      keywords: l.summary,
    });
  }

  // Every chant in the library (1.7), found by its name in its own script,
  // its kind, its tone and its psalm number too. Its row reads in the
  // reader's language by its catalog line.
  for (const c of chantIndex()) {
    const kind = say(kindKey(c.kind), c.kind);
    items.push({
      id: `chant-${c.slug}`,
      ...said(chantTitleKey(c.key), c.title),
      sublabel: kind,
      sublabelKey: kindKey(c.kind),
      href: `/chants/${c.slug}`,
      group: "Prayers",
      keywords: [
        c.originalTitle ?? "",
        "chant",
        c.tone ? `tone ${c.tone}` : "",
        c.psalm ? `psalm ${c.psalm}` : "",
        ...c.variants.map((v) => v.label),
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  for (const p of READING_PLANS) {
    const name = MESSAGES[`plans.${p.id}.name`];
    // A plan with no name on file is not listed: an id is not a title.
    if (!name) continue;
    items.push({
      id: `plan-${p.id}`,
      label: name,
      labelKey: `plans.${p.id}.name`,
      sublabel: "Reading plan",
      href: `/plans/${p.id}`,
      group: "Reading",
      keywords: MESSAGES[`plans.${p.id}.body`],
    });
  }

  // The Orthodox dictionary (1.7): the page, and each word at its anchor,
  // found by the word, its other names and its Greek. Only the name goes
  // into the corpus; the definition stays on the page.
  items.push({ id: "page-dictionary", ...said("dictionary.title", "Orthodox dictionary"), href: "/dictionary", group: "Topics", keywords: "glossary words terms meaning definitions what does mean" });
  for (const d of DICTIONARY) {
    items.push({
      id: `dictionary-${d.id}`,
      label: d.term,
      sublabel: say("dictionary.title", "Orthodox dictionary"),
      sublabelKey: "dictionary.title",
      href: `/dictionary#${d.id}`,
      group: "Topics",
      keywords: [d.greek ?? "", ...(d.also ?? [])].join(" "),
    });
  }

  for (const t of THEOLOGY_TOPICS) {
    // A topic marked as coming has no page yet (topicParams leaves it out).
    if (t.planned) continue;
    items.push({
      id: `theology-${t.slug}`,
      label: t.title,
      sublabel: "Theology",
      href: `/theology/${t.slug}`,
      group: "Topics",
      keywords: t.subtitle,
    });
  }

  // Behind their switches: a row for a screen this build does not have
  // would open the front door instead.
  if (walkthroughsEnabled()) {
    items.push({ id: "page-walkthroughs", label: "Walkthroughs", href: "/walkthroughs", group: "Reading", keywords: "guided reading study book" });
    for (const w of Object.values(WALKTHROUGHS)) {
      items.push({
        id: `walkthrough-${w.book}`,
        label: w.title,
        sublabel: `Walkthrough · ${w.bookName}`,
        href: `/walkthroughs/${w.book}`,
        group: "Reading",
        keywords: w.bookName,
      });
    }
  }
  if (shopEnabled()) {
    items.push({ id: "page-shop", ...said("nav.shop", "Shop"), href: "/shop", group: "Other", keywords: "eikon icons prayer ropes buy store" });
  }

  items.push(...SETTINGS, ...STATIC_PAGES);

  // One row for one screen. A registry and the list of pages can both name
  // the same address (the Hours are prayer rules AND pages); the first to
  // name it keeps it, except Settings, where several rows open one screen
  // on purpose.
  const seen = new Set<string>();
  return items.filter((item) => {
    if (item.group === "Settings") return true;
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}
