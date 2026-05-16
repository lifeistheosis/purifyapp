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
            v1.1 &middot; Beta &middot; Polish patch
          </p>
        </div>

        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          A first letter to our readers.
        </h1>

        <p className="mt-8 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          Welcome to Purify. This is the first public version of the site. It
          is still small and rough in places, but everything you see has been
          built with one purpose: to make the Orthodox Christian life of
          prayer, scripture, and the saints easier to enter, day by day.
        </p>

        <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          Below is what is here today, and what is coming. If you find a saint
          we have not added, a writing we should include, a verse that should
          have a note, or a place where the design feels heavy, please tell us.
          We are reading every message.
        </p>

        {/* What's here */}
        <h2 className="mt-14 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
          What&rsquo;s here today
        </h2>
        <ul className="space-y-4 font-sans text-[16px] text-paper/85 leading-[1.65]">
          <li>
            <strong className="text-paper">The Orthodox Bible.</strong>{" "}
            The full canon: Brenton&rsquo;s English Septuagint (1851) for the
            Old Testament, including the deuterocanon, paired with the King
            James New Testament. Over 1,300 chapters, each with cross-
            references and patristic commentary from the Ante-Nicene and
            Nicene Fathers.
          </li>
          <li>
            <strong className="text-paper">A search that knows what you mean.</strong>{" "}
            Type a book, a chapter, or an exact verse. &ldquo;John 3:16&rdquo;,
            &ldquo;1 Cor 13&rdquo;, &ldquo;Ps 23&rdquo; all work.
            Common abbreviations are recognized.
          </li>
          <li>
            <strong className="text-paper">Highlight and annotate.</strong>{" "}
            Highlight any verse and write your own notes. They live on your
            device for now; cross-device sync is on the way.
          </li>
          <li>
            <strong className="text-paper">Lives and writings of the saints.</strong>{" "}
            Six founding fathers and wonderworkers to start: Athanasius the
            Great, Basil the Great, Gregory the Theologian, John Chrysostom,
            John of Damascus, and Seraphim of Sarov. Each profile carries a
            short life, a list of works, and the works themselves with
            editorial marginalia.
          </li>
          <li>
            <strong className="text-paper">Filters that fit how you read.</strong>{" "}
            Browse saints by century. Filter a saint&rsquo;s writings by topic
            (Trinity, Prayer, Pride, Essence and Energies, and others).
          </li>
          <li>
            <strong className="text-paper">A reading experience that doesn&rsquo;t shout.</strong>{" "}
            Dark, calm typography. Smooth section-to-section scrolling. No
            adverts on the reading pages, no notifications, no streaks to
            chase.
          </li>
        </ul>

        {/* What's coming */}
        <h2 className="mt-14 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
          What is coming
        </h2>
        <ul className="space-y-4 font-sans text-[16px] text-paper/85 leading-[1.65]">
          <li>
            <strong className="text-paper">Accounts.</strong>{" "}
            Sign in with email, and your highlights and notes follow you across
            phone, laptop, and tablet.
          </li>
          <li>
            <strong className="text-paper">Daily prayer.</strong>{" "}
            Morning and evening prayers, the Akathists, the Jesus Prayer rope
            companion. Begin and end the day with the Church.
          </li>
          <li>
            <strong className="text-paper">The Orthodox calendar.</strong>{" "}
            Feasts, fasts, and the appointed readings of the day, on both the
            New and Old Calendars.
          </li>
          <li>
            <strong className="text-paper">More saints, more writings.</strong>{" "}
            Maximus the Confessor, Symeon the New Theologian, Gregory Palamas,
            Ignatius of Antioch, Nektarios of Aegina, and many more, with full
            corpora rather than excerpts.
          </li>
          <li>
            <strong className="text-paper">Prayer plans and campaigns.</strong>{" "}
            Walk a 40-day Lenten journey with the Fathers. Pray together with
            other Orthodox Christians around the world for an intention or a
            person.
          </li>
          <li>
            <strong className="text-paper">A marketplace for the Church.</strong>{" "}
            Icons, books, incense, and storefronts for monasteries, with the
            ability to request paid blessings from real clergy.
          </li>
          <li>
            <strong className="text-paper">Audio.</strong>{" "}
            Read-aloud scripture, the Paschal Canon chanted, sample tones from
            the Octoechos. So you can pray with the site even when your eyes
            are tired.
          </li>
          <li>
            <strong className="text-paper">Native apps.</strong>{" "}
            iOS and Android, with offline reading.
          </li>
        </ul>

        {/* How you can help */}
        <h2 className="mt-14 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
          How you can help
        </h2>
        <ul className="space-y-4 font-sans text-[16px] text-paper/85 leading-[1.65]">
          <li>
            Use it. Read a chapter today. Open one saint. Tell us what was
            confusing or what was missing.
          </li>
          <li>
            Send us writings or icons we should include, especially in the
            public domain or with the rights cleared.
          </li>
          <li>
            Pray for the work, and for the people who will read it.
          </li>
        </ul>

        {/* Closing + signature */}
        <div className="mt-16 pt-10 border-t border-paper/10">
          <p className="font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
            More than anything, thank you for being here at the start. Glory to
            God for all things.
          </p>

          <p
            className="mt-10 font-serif italic text-[20px] md:text-[22px] tracking-wide"
            style={{ color: "#d4af37" }}
          >
            From Edgar, the Purify Team.
          </p>
        </div>

        {/* Changelog — accumulates per release. Big patches bump the major
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
