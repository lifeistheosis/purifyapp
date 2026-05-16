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
            v1.0 &middot; Beta &middot; First release
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
      </article>
    </section>
  );
}
