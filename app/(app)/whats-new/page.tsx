export const metadata = {
  title: "What's new - Purify",
  description:
    "Patch notes and a message from the Purify team about what the site offers today and what's coming next.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

export default function WhatsNewPage() {
  return (
    <section className={`${SECTION} bg-night`}>
      <article className="mx-auto max-w-[760px] w-full">
        {/* Eyebrow + version */}
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55">
            What&rsquo;s new
          </p>
          <p className="font-sans text-[12px] uppercase tracking-[1.2px] text-paper/40">
            v2.0 &middot; Beta &middot; Calendar
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
          The full release-by-release log lives below, with the small
          things this round (three more saint icons, smoother highlight
          bars, a date that no longer claims tomorrow is today).
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

        {/* Changelog, accumulates per release. Big patches bump the major
            number and rewrite the letter above; small patches keep the
            letter and append an entry here. */}
        <section className="mt-20 pt-10 border-t border-paper/10">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-6">
            Release notes
          </p>
          <p className="font-sans text-[13px] text-paper/45 mb-10 leading-[1.65]">
            Versioning. Major bumps (1.0 to 2.0) come with a new letter above
            and represent a substantial direction change. Minor bumps (1.0 to
            1.1) keep the letter and add a release note here.
          </p>

          <ChangelogEntry
            version="v2.0"
            kind="Calendar"
            date="May 16, 2026"
            blurb="The first standalone calendar lands. Today's saint, today's fasting status, a Pascha countdown, and a full month grid with each day's commemorations and fast colour-coded. Plus three new saint icons, smoother highlight bars, and the version label finally catches up to itself."
            items={[
              "New /calendar route. Hero shows today's date, today's saint(s) drawn from the saints index, the day's fasting rule with a colour-coded badge, and the days remaining until Pascha.",
              "Full month grid (Sun to Sat) with today tinted gold, every saint feast day dotted in gold, and the fasting rule for each day colour-coded (red strict, gold wine and oil, sage fish allowed, green fast-free). Click any day to pin it.",
              "Fasting helper covers the year-round Wednesday/Friday fast, all four major fasts (Great Lent, Apostles, Dormition, Nativity), and the four fast-free weeks (Bright Week, Trinity Week, the Twelve Days of Christmas, the Publican and Pharisee week).",
              "Pascha is computed by the Julian-based algorithm shared by all canonical Orthodox churches; fixed feasts use the New (Revised Julian) calendar of the Ecumenical Patriarchate.",
              "Three more saint icons sourced from Wikimedia Commons: Augustine of Hippo, Cyril of Alexandria, Irenaeus of Lyons.",
              "Word highlights now extend across the space between adjacent highlighted words. No more gappy two-pill look when you highlight a phrase like 'for God so loved'.",
              "Date and version-label drift fixed: changelog dates corrected to May 16, home banner now matches the /whats-new header.",
            ]}
          />

          <ChangelogEntry
            version="v1.5"
            kind="John and the Fathers"
            date="May 16, 2026"
            blurb="A patch dedicated to the Gospel of John. Three of the great early commentators on the Fourth Gospel are added to the Saints section. Patristic commentary expands from one chapter of John to nine. The letter above is unchanged; this is a content bump, not a direction change."
            items={[
              "Three new saints in the registry: Augustine of Hippo (Doctor of Grace), Cyril of Alexandria (Seal of the Fathers), and Irenaeus of Lyons (Disciple of the Disciple, who heard Polycarp who heard John).",
              "Each new saint ships with a curated selection from his commentary on John: Augustine's Tractates on John, Cyril's Commentary on John, and Irenaeus' Against Heresies on the Fourth Gospel.",
              "St. John Chrysostom gains a third work, Homilies on the Gospel of John, with selections from the eighty-eight homilies he preached at Antioch in the early 390s, the longest patristic treatment of any New Testament book.",
              "Patristic commentary on John expands from one chapter to nine. New verse-level entries on John 1:3, 1:12, 1:18, 1:29, 3:3, 3:5, 3:16, 6:51, 6:53, 10:11, 10:30, 14:6, 14:9, 17:21, 19:34, 20:22, 20:28, the most-cited verses of the Gospel.",
              "Commentary now draws on ten Fathers across the patristic age: Athanasius, Augustine, Basil, Chrysostom, Cyril of Alexandria, Gregory the Theologian, Ignatius of Antioch, Irenaeus, John of Damascus, and Maximus the Confessor.",
              "Saint icons for Augustine, Cyril, and Irenaeus render as deterministic-initials circles until JPGs are uploaded; both icon maps (profile and commentary-rail) are wired with the correct paths.",
            ]}
          />

          <ChangelogEntry
            version="v1.4.1"
            kind="Bible fixes"
            date="May 16, 2026"
            blurb="A correctness patch for the Interlinear column and word lookups. No new features; just clean text where there used to be ingestion debris."
            items={[
              "Fixed: literal <em>of</em>, <em>is</em>, and friends appearing inside the English column of the New Testament when Interlinear was on. The KJV's italicized supplied-words markers had been surviving as HTML through the ingest. 2,444 stray tags removed across 197 chapter files.",
              "Fixed: clicking certain words in the English column landed on a garbage token like G3756] instead of a real word. 3,655 orphan Strong's-bracket fragments scrubbed.",
              "The ingest script now strips italic markers before tokenizing, drops orphan Strong's fragments, and runs a sanity check that fails the build if a <em> or G####] artifact ever reappears.",
              "The loader also defensively scrubs tokens at read time, so a stale data file can't put garbage on screen.",
              "No effect on the regular (non-Interlinear) Bible reader. The OT (Greek LXX) column is unchanged; this fix is NT-only.",
            ]}
          />

          <ChangelogEntry
            version="v1.3"
            kind="Click any Greek word"
            date="May 16, 2026"
            blurb="With Interlinear on, every Greek word in the New Testament is now clickable. Tap a word to see its dictionary form, a short definition, the part of speech, and its Strong's number. Letter above unchanged."
            items={[
              "New WordPopover anchored to the clicked word, flips above if it would run off the bottom of the screen.",
              "Popover shows: the word itself, the lemma (dictionary form) with transliteration, a concise Strong's definition, a friendly parse string (e.g. 'verb · aorist · active · indicative · 3rd sing.'), and the Strong's number badge.",
              "1,200+ Greek words and 5,500+ Strong's entries packed into a slim per-chapter lexicon, only the entries used in the chapter ship to the browser (~5-20 KB per page).",
              "NT text now sourced from the Robinson-Pierpont Byzantine Majority Text with Strong's tagging (PD). Same Textus Receptus tradition as the previous Stephanus rendering; accents are not shown so the words can be tagged precisely.",
              "OT (Greek LXX) keeps its accented text and shows a small 'word lookups coming' marker, OT tagging is planned for a future patch.",
              "Esc, click outside, or the × in the corner all close the popover.",
            ]}
          />

          <ChangelogEntry
            version="v1.2"
            kind="Interlinear"
            date="May 16, 2026"
            blurb="The Bible reader now has an Interlinear toggle. Click it on any chapter and the original Greek appears beside the English. Letter above unchanged."
            items={[
              "New Interlinear button in the chapter header, next to the search bar. Toggle persists across chapters and reloads.",
              "Original-language coverage: KJV New Testament paired with Stephanus 1550 (Textus Receptus) Greek; Brenton Old Testament paired with the Septuagint Greek that Brenton translated from. 1,325 chapters total.",
              "Cardo serif loaded for the Greek column, polytonic accents and breathings render correctly.",
              "Mobile (under md): Greek wraps below the English instead of beside, so verses stay readable on phones.",
              "Verse highlights and notes still work with Interlinear on. The English column owns the toolbar and word-drag highlighting.",
            ]}
          />

          <ChangelogEntry
            version="v1.1"
            kind="Polish patch"
            date="May 16, 2026"
            blurb="A polish-and-fill pass before any new feature work. The letter above is unchanged."
            items={[
              "Three new saints: Ignatius of Antioch, Maximus the Confessor, Symeon the New Theologian, each with a representative work and a real icon.",
              "Verse highlight tint now applies cleanly with the gold inset bar.",
              "Top navigation harmonized between the marketing site and the app: same five primary items, same Pricing and Account links, same Try Free pill.",
              "Footer: removed the duplicate Pricing link and surfaced What's new in the Discover column.",
              "Saint icons resized: total weight dropped from 4.7 MB to ~440 KB, with no visible quality loss.",
              "Focus rings on filter pills are now visible against the dark background.",
            ]}
          />

          <ChangelogEntry
            version="v1.0"
            kind="First release"
            date="May 15, 2026"
            blurb="The first public version. See Edgar's letter above for the full picture."
            items={[
              "The Orthodox Bible: Brenton Septuagint plus KJV, with cross-references and patristic commentary.",
              "Saints: six founding fathers with lives, writings, marginalia, century filter, topic filter.",
              "Smart search across books, chapters, and verses (John 3:16, 1 Cor 13, Ps 23).",
              "Verse highlights and notes saved to your device.",
              "Dark, calm reading typography. Section-snap scrolling.",
            ]}
          />
        </section>
      </article>
    </section>
  );
}

function ChangelogEntry({
  version,
  kind,
  date,
  blurb,
  items,
}: {
  version: string;
  kind: string;
  date: string;
  blurb: string;
  items: string[];
}) {
  return (
    <article className="mb-12 last:mb-0">
      <div className="flex items-baseline gap-3 flex-wrap mb-3">
        <h3 className="font-sans text-[22px] font-bold text-paper tracking-[-0.01em]">
          {version}
        </h3>
        <span className="font-sans text-[12px] uppercase tracking-[1.2px] text-paper/45">
          {kind}
        </span>
        <span className="font-sans text-[12px] text-paper/35 ml-auto">
          {date}
        </span>
      </div>
      <p className="font-sans text-[15px] text-paper/70 mb-4 leading-[1.6]">
        {blurb}
      </p>
      <ul className="space-y-2 font-sans text-[15px] text-paper/85 leading-[1.6] list-disc pl-5 marker:text-paper/30">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </article>
  );
}
