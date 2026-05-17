import { ChangelogControls } from "@/components/whats-new/ChangelogControls";

export const metadata = {
  title: "What's new - Purify",
  description:
    "Patch notes and a message from the Purify team about what the site offers today and what's coming next.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

type Entry = {
  version: string;
  kind: string;
  date: string; // human-readable, used as the group key
  blurb: string;
  items: string[];
};

// Newest first. Grouped by `date` (string equality).
const ENTRIES: Entry[] = [
  {
    version: "v2.5",
    kind: "Massive content patch",
    date: "May 17, 2026",
    blurb:
      "Three new saints, six new book introductions, ten new patristic commentary cards across Matthew and Acts, and a fresh batch of icon mappings. The biggest single content drop since v1.0.",
    items: [
      "Three new saints land in the registry: Holy Apostle Paul (with a selection of his final letters from prison), St. Mary of Egypt (with selections from the Life by St. Sophronius of Jerusalem), and St. Nicholas the Wonderworker of Myra (with the Three Bags of Gold and the troparion sung at his Liturgy).",
      "Six new book introductions: 1 Corinthians, Galatians, Hebrews, James, 1 John, and the Wisdom of Solomon. Each frames the book within its Orthodox liturgical use and the patristic readers who interpret it.",
      "Matthew commentary expands across four new chapters: the Beatitudes (Chrysostom and Gregory of Nyssa on poverty of spirit), the Lord's Prayer (Cyprian and Gregory of Nyssa), 'seek first the Kingdom' (Maximus the Confessor), the Pearl of Great Price (Chrysostom and Gregory the Theologian on Baptism), and the Last Judgment 'least of these' (Chrysostom and Gregory the Theologian on the poor).",
      "Acts commentary expands with five new entries: the four marks of the apostolic community (Chrysostom on Acts 2:42), the all-things-in-common verse (Chrysostom and Basil on 4:32), 'Saul, Saul' on the Damascus road (Augustine and Chrysostom on 9:4), 'in Him we live and move and have our being' (Chrysostom and Maximus on 17:28), and the agraphon 'more blessed to give than to receive' (Chrysostom and Basil on 20:35).",
      "Icon mappings extended for the new saints plus aliases for several Fathers cited in commentary cards (Cyprian of Carthage, Gregory of Nyssa, Jerome).",
      "All new content is original summary prose written for Purify. Brief representative phrases are drawn from genuinely public-domain Schaff and Ante-Nicene Fathers translations (1885-1900) or the King James Version (1611).",
    ],
  },
  {
    version: "v2.4",
    kind: "Saints, faces and full text",
    date: "May 16, 2026",
    blurb:
      "Saint icons render correctly in patristic commentary (path bug fixed plus five more saints mapped), Chrysostom's icon now shows his face not his body, Augustine's Confessions Book I lands complete, and long works get a table of contents with section deep-links.",
    items: [
      "Fixed: every patristic commentary author now renders with their real icon. A path-prefix bug had been silently 404ing every /icons/saints/* URL since v1.1; the actual files live at /saints/icons/*. Same patch maps the five saints that had no icon entry (John of Damascus, Ignatius, Maximus, Symeon, Seraphim) and adds the short-form 'St. Basil' / 'St. Cyril' aliases.",
      "Fixed: St. John Chrysostom's icon was cropping to his lower body because the JPG is a tall full-body portrait. All saint icons now use object-top so the face stays in frame.",
      "Augustine of Hippo gets his Confessions, Book I complete (Pusey translation, public domain via Project Gutenberg ebook #3296). The first interior autobiography in Christian literature, ten reflective sections from his infancy and earliest boyhood.",
      "Long works now ship with a Contents disclosure listing every section with a deep-link. URLs like /saints/augustine-of-hippo/confessions#s7 open the work and scroll to the seventh section. Short works (under four sections) hide the disclosure.",
      "More full signature works ship in v2.5: Athanasius On the Incarnation (full 57 sections), Chrysostom On the Priesthood (six books), Basil On the Holy Spirit, Ignatius Seven Epistles, Irenaeus Against Heresies Book I.",
    ],
  },
  {
    version: "v2.3",
    kind: "Less scroll, better picker",
    date: "May 16, 2026",
    blurb:
      "Patch notes group by date and collapse, the chapter intro tucks behind a disclosure, the patristic commentary scrollbar finally matches the design, and /bible gets a 'Start here' strip plus richer book cards.",
    items: [
      "Patch notes group by date and collapse. Older releases are one click away instead of one long scroll.",
      "'About this book' on chapter 1 of every book is now a closed disclosure. Tap to expand when you want the context; otherwise the verses lead.",
      "Patristic commentary side rail gets a thin paper-colored scrollbar that matches the rest of the chrome.",
      "/bible book picker redesigned. Each book card now shows its chapter count and carries a subtle category color, and a new 'Start here' strip leads with six common entry points (John, Psalms, Genesis, Matthew, Romans, 1 Cor 13).",
      "Hero on /bible trimmed down and the dead quick-nav row removed.",
      "Search hint line under the Bible search box: 'Try: John 3:16, 1 Cor 13, Psalm 23'.",
    ],
  },
  {
    version: "v2.2",
    kind: "Bible reader polish",
    date: "May 16, 2026",
    blurb:
      "Eight quiet improvements so the Bible reads well on a phone: reading progress, a chapter quick-jump strip, copy-verse-link, a floating next-chapter button, and a consolidated reader settings menu.",
    items: [
      "Reading progress bar at the top of every chapter, with a mobile-only context strip showing where you are ('John 3, v12 of 35').",
      "Mobile chapter quick-jump strip below the chrome, a horizontal row of chapter pills so you can hop chapters without the desktop sidebar.",
      "Per-verse copy-link button in the verse toolbar. One tap copies a deep link to the clipboard for sharing.",
      "Floating Next chapter button on mobile, appearing once you have read past the halfway mark. Hidden on the last chapter of Revelation.",
      "Reader font size, font family, and interlinear toggle now consolidate into a single Reader menu on mobile. Translation and book switchers stay inline.",
      "Keyboard shortcuts hint at the bottom of desktop chapters so the arrow-key chapter nav, drag-to-highlight, and save-with-Cmd+Enter are not invisible.",
      "Greek word popover sizes itself to the viewport on narrow screens, no more 300px popover overflowing a 360px phone.",
      "Verse-number-to-commentary link gets a brighter hover state so the affordance reads.",
      "Verse hash links flash gold: clicking a search result or opening a shared deep link scroll-centers the verse and pulses it for a moment.",
    ],
  },
  {
    version: "v2.1",
    kind: "Calendar polish, Koine accuracy",
    date: "May 16, 2026",
    blurb:
      "Three small fixes that matter: the calendar reads cleaner, the interlinear is now New Testament only, and the New Testament Greek finally has its accents back.",
    items: [
      "Calendar readings now show citation plus the first verse with a 'Read full passage' link, instead of two full Gospel and Epistle blocks dominating the page.",
      "Calendar hero and section headings scale down on mobile so the saint of the day fits a phone screen.",
      "Interlinear toggle and Greek column are now hidden on Old Testament chapters. The Septuagint is a Greek translation, but the Old Testament was originally Hebrew; New-Testament-only interlinear matches how most readers think about the text.",
      "New Testament Greek re-sourced as Nestle 1904 with full polytonic accents (smooth and rough breathings, circumflex, iota subscript). 'Bíblos genéseōs' rendered as 'Βίβλος γενέσεως' instead of 'βιβλος γενεσεως', proper Koine the way the Fathers read it.",
    ],
  },
  {
    version: "v2.0",
    kind: "Calendar",
    date: "May 16, 2026",
    blurb:
      "The first standalone calendar lands. Today's saint, today's fasting status, a Pascha countdown, and a full month grid with each day's commemorations and fast colour-coded. Plus three new saint icons, smoother highlight bars, and the version label finally catches up to itself.",
    items: [
      "New /calendar route. Hero shows today's date, today's saint(s) drawn from the saints index, the day's fasting rule with a colour-coded badge, and the days remaining until Pascha.",
      "Full month grid (Sun to Sat) with today tinted gold, every saint feast day dotted in gold, and the fasting rule for each day colour-coded (red strict, gold wine and oil, sage fish allowed, green fast-free). Click any day to pin it.",
      "Fasting helper covers the year-round Wednesday/Friday fast, all four major fasts (Great Lent, Apostles, Dormition, Nativity), and the four fast-free weeks (Bright Week, Trinity Week, the Twelve Days of Christmas, the Publican and Pharisee week).",
      "Pascha is computed by the Julian-based algorithm shared by all canonical Orthodox churches; fixed feasts use the New (Revised Julian) calendar of the Ecumenical Patriarchate.",
      "Three more saint icons sourced from Wikimedia Commons: Augustine of Hippo, Cyril of Alexandria, Irenaeus of Lyons.",
      "Word highlights now extend across the space between adjacent highlighted words. No more gappy two-pill look when you highlight a phrase like 'for God so loved'.",
      "Date and version-label drift fixed: changelog dates corrected to May 16, home banner now matches the /whats-new header.",
    ],
  },
  {
    version: "v1.5",
    kind: "John and the Fathers",
    date: "May 16, 2026",
    blurb:
      "A patch dedicated to the Gospel of John. Three of the great early commentators on the Fourth Gospel are added to the Saints section. Patristic commentary expands from one chapter of John to nine. The letter above is unchanged; this is a content bump, not a direction change.",
    items: [
      "Three new saints in the registry: Augustine of Hippo (Doctor of Grace), Cyril of Alexandria (Seal of the Fathers), and Irenaeus of Lyons (Disciple of the Disciple, who heard Polycarp who heard John).",
      "Each new saint ships with a curated selection from his commentary on John: Augustine's Tractates on John, Cyril's Commentary on John, and Irenaeus' Against Heresies on the Fourth Gospel.",
      "St. John Chrysostom gains a third work, Homilies on the Gospel of John, with selections from the eighty-eight homilies he preached at Antioch in the early 390s, the longest patristic treatment of any New Testament book.",
      "Patristic commentary on John expands from one chapter to nine. New verse-level entries on John 1:3, 1:12, 1:18, 1:29, 3:3, 3:5, 3:16, 6:51, 6:53, 10:11, 10:30, 14:6, 14:9, 17:21, 19:34, 20:22, 20:28, the most-cited verses of the Gospel.",
      "Commentary now draws on ten Fathers across the patristic age: Athanasius, Augustine, Basil, Chrysostom, Cyril of Alexandria, Gregory the Theologian, Ignatius of Antioch, Irenaeus, John of Damascus, and Maximus the Confessor.",
      "Saint icons for Augustine, Cyril, and Irenaeus render as deterministic-initials circles until JPGs are uploaded; both icon maps (profile and commentary-rail) are wired with the correct paths.",
    ],
  },
  {
    version: "v1.4.1",
    kind: "Bible fixes",
    date: "May 16, 2026",
    blurb:
      "A correctness patch for the Interlinear column and word lookups. No new features; just clean text where there used to be ingestion debris.",
    items: [
      "Fixed: literal 'of', 'is', and friends appearing inside the English column of the New Testament when Interlinear was on. The KJV's italicized supplied-words markers had been surviving as HTML through the ingest. 2,444 stray tags removed across 197 chapter files.",
      "Fixed: clicking certain words in the English column landed on a garbage token like G3756] instead of a real word. 3,655 orphan Strong's-bracket fragments scrubbed.",
      "The ingest script now strips italic markers before tokenizing, drops orphan Strong's fragments, and runs a sanity check that fails the build if a fragment ever reappears.",
      "The loader also defensively scrubs tokens at read time, so a stale data file can't put garbage on screen.",
      "No effect on the regular (non-Interlinear) Bible reader. The OT (Greek LXX) column is unchanged; this fix is NT-only.",
    ],
  },
  {
    version: "v1.3",
    kind: "Click any Greek word",
    date: "May 16, 2026",
    blurb:
      "With Interlinear on, every Greek word in the New Testament is now clickable. Tap a word to see its dictionary form, a short definition, the part of speech, and its Strong's number. Letter above unchanged.",
    items: [
      "New WordPopover anchored to the clicked word, flips above if it would run off the bottom of the screen.",
      "Popover shows: the word itself, the lemma (dictionary form) with transliteration, a concise Strong's definition, a friendly parse string (e.g. 'verb · aorist · active · indicative · 3rd sing.'), and the Strong's number badge.",
      "1,200+ Greek words and 5,500+ Strong's entries packed into a slim per-chapter lexicon, only the entries used in the chapter ship to the browser (~5-20 KB per page).",
      "NT text now sourced from the Robinson-Pierpont Byzantine Majority Text with Strong's tagging (PD). Same Textus Receptus tradition as the previous Stephanus rendering; accents are not shown so the words can be tagged precisely.",
      "OT (Greek LXX) keeps its accented text and shows a small 'word lookups coming' marker, OT tagging is planned for a future patch.",
      "Esc, click outside, or the close button in the corner all close the popover.",
    ],
  },
  {
    version: "v1.2",
    kind: "Interlinear",
    date: "May 16, 2026",
    blurb:
      "The Bible reader now has an Interlinear toggle. Click it on any chapter and the original Greek appears beside the English. Letter above unchanged.",
    items: [
      "New Interlinear button in the chapter header, next to the search bar. Toggle persists across chapters and reloads.",
      "Original-language coverage: KJV New Testament paired with Stephanus 1550 (Textus Receptus) Greek; Brenton Old Testament paired with the Septuagint Greek that Brenton translated from. 1,325 chapters total.",
      "Cardo serif loaded for the Greek column, polytonic accents and breathings render correctly.",
      "Mobile (under md): Greek wraps below the English instead of beside, so verses stay readable on phones.",
      "Verse highlights and notes still work with Interlinear on. The English column owns the toolbar and word-drag highlighting.",
    ],
  },
  {
    version: "v1.1",
    kind: "Polish patch",
    date: "May 16, 2026",
    blurb:
      "A polish-and-fill pass before any new feature work. The letter above is unchanged.",
    items: [
      "Three new saints: Ignatius of Antioch, Maximus the Confessor, Symeon the New Theologian, each with a representative work and a real icon.",
      "Verse highlight tint now applies cleanly with the gold inset bar.",
      "Top navigation harmonized between the marketing site and the app: same five primary items, same Pricing and Account links, same Try Free pill.",
      "Footer: removed the duplicate Pricing link and surfaced What's new in the Discover column.",
      "Saint icons resized: total weight dropped from 4.7 MB to ~440 KB, with no visible quality loss.",
      "Focus rings on filter pills are now visible against the dark background.",
    ],
  },
  {
    version: "v1.0",
    kind: "First release",
    date: "May 15, 2026",
    blurb: "The first public version. See Edgar's letter above for the full picture.",
    items: [
      "The Orthodox Bible: Brenton Septuagint plus KJV, with cross-references and patristic commentary.",
      "Saints: six founding fathers with lives, writings, marginalia, century filter, topic filter.",
      "Smart search across books, chapters, and verses (John 3:16, 1 Cor 13, Ps 23).",
      "Verse highlights and notes saved to your device.",
      "Dark, calm reading typography. Section-snap scrolling.",
    ],
  },
];

// Group entries by date, preserving array order.
function groupByDate(entries: Entry[]): { date: string; entries: Entry[] }[] {
  const out: { date: string; entries: Entry[] }[] = [];
  for (const e of entries) {
    const last = out[out.length - 1];
    if (last && last.date === e.date) last.entries.push(e);
    else out.push({ date: e.date, entries: [e] });
  }
  return out;
}

export default function WhatsNewPage() {
  const groups = groupByDate(ENTRIES);

  return (
    <section className={`${SECTION} bg-night`}>
      <article className="mx-auto max-w-[760px] w-full">
        {/* Eyebrow + version */}
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55">
            What&rsquo;s new
          </p>
          <p className="font-sans text-[12px] uppercase tracking-[1.2px] text-paper/40">
            v2.5 &middot; Beta &middot; Massive content patch
          </p>
        </div>

        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          The day, on the page.
        </h1>

        <p className="mt-8 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          Welcome back. v2.0 is the first release where the site tells you
          what today is: which saint the Church remembers, whether the day is
          a fast, and how many days remain until Pascha. A small thing, but a
          real one. The Orthodox day is not abstract; it has a shape.
        </p>

        <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          Beneath that one-line answer there is now a real calendar: the
          month at a glance, with saint dots and fasting colour-codes on
          each day, and a click-through to any other day for its
          commemorations and rule. The reckoning we follow is the New
          (Revised Julian) calendar used by the Ecumenical Patriarchate and
          the majority of Orthodox jurisdictions; an Old Calendar toggle
          for the Russian, Serbian, Jerusalem, and Athonite traditions is
          on the roadmap.
        </p>

        <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          What is still missing is much. Daily prayer is not yet built.
          Audio is not yet built. Accounts and cross-device sync are not
          yet built. We are working in order of what is most-asked-for. If
          your request is not on the list, write to us; the order can
          change.
        </p>

        <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          The full release-by-release log lives below, grouped by date and
          collapsed by default. Pop one open when you want the detail.
        </p>

        {/* Closing + signature */}
        <div className="mt-16 pt-10 border-t border-paper/10">
          <p className="font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
            Thank you for staying with us through two majors. Glory to God for
            all things.
          </p>

          <p
            className="mt-10 font-serif italic text-[20px] md:text-[22px] tracking-wide"
            style={{ color: "#d4af37" }}
          >
            From Edgar, the Purify Team.
          </p>
        </div>

        {/* Changelog: dates collapse, releases inside also collapse. */}
        <section className="mt-20 pt-10 border-t border-paper/10" data-changelog>
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55">
              Release notes
            </p>
            <ChangelogControls />
          </div>
          <p className="font-sans text-[13px] text-paper/45 mb-8 leading-[1.65]">
            Grouped by date. The most recent day is open by default; tap any
            other day to expand. Inside each day, tap a release to read its
            full item list.
          </p>

          <div className="space-y-3">
            {groups.map((g, gi) => (
              <details
                key={g.date}
                open={gi === 0}
                className="group rounded-md border border-paper/12 bg-paper/[0.02] open:bg-paper/[0.04] transition-colors"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3">
                  <span className="flex items-baseline gap-3 min-w-0">
                    <span className="font-sans text-[15px] font-semibold text-paper truncate">
                      {g.date}
                    </span>
                    <span className="font-sans text-[12px] uppercase tracking-[1.2px] text-paper/45">
                      {g.entries.length} update{g.entries.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="text-paper/45 group-open:rotate-180 transition-transform duration-200 text-[12px]"
                  >
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4 space-y-2">
                  {g.entries.map((e) => (
                    <ReleaseDetails key={e.version} entry={e} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      </article>
    </section>
  );
}

function ReleaseDetails({ entry: e }: { entry: Entry }) {
  return (
    <details className="group/rel rounded-md border border-paper/10 bg-night-soft/40 open:bg-night-soft/70 transition-colors">
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-sans text-[16px] font-bold text-paper tracking-[-0.01em]">
            {e.version}
          </span>
          <span className="font-sans text-[11px] uppercase tracking-[1.2px] text-paper/50">
            {e.kind}
          </span>
          <span
            aria-hidden
            className="ml-auto text-paper/40 group-open/rel:rotate-180 transition-transform duration-200 text-[11px]"
          >
            ▾
          </span>
        </div>
        <p className="mt-1.5 font-sans text-[13.5px] text-paper/65 leading-[1.55] group-open/rel:text-paper/80 transition-colors">
          {e.blurb}
        </p>
      </summary>
      <ul className="px-4 pb-4 pt-1 space-y-2 font-sans text-[14px] text-paper/85 leading-[1.6] list-disc pl-9 marker:text-paper/30">
        {e.items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </details>
  );
}
