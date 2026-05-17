import Link from "next/link";

export const metadata = {
  title: "About Purify",
  description:
    "What Purify is, what it is made of, what it is not. The mission, the sources, the privacy promise.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

export default function AboutPage() {
  return (
    <section className={`${SECTION} bg-night`}>
      <article className="mx-auto max-w-[760px] w-full">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          About this work
        </p>
        <h1 className="font-sans text-[40px] md:text-[52px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          A quiet place to stand before God.
        </h1>

        {/* What this is */}
        <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
          What this is
        </p>
        <p className="mt-3 font-serif text-[19px] text-paper/85 leading-[1.7]">
          Purify is an Orthodox Christian prayer companion. The Bible
          (Septuagint and King James), the calendar (the saint of the
          day, the fast, Pascha), the saints (their lives and their
          works), and daily prayer (the Morning Rule, the Evening Rule,
          the Jesus Prayer counter): all in one place, calm enough to
          use at any hour. Built for anyone curious about, exploring,
          or rooted in the Orthodox Faith.
        </p>

        {/* What this is made of */}
        <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
          What this is made of
        </p>
        <p className="mt-3 font-serif text-[19px] text-paper/85 leading-[1.7]">
          Everything you see is drawn from public-domain sources. The
          Old Testament is Brenton&rsquo;s 1851 English translation of
          the Septuagint, which carries the deuterocanonical books and
          the Psalter numbering the Church has always sung. The New
          Testament is the King James (1611), paired with the polytonic
          Nestle 1904 Greek and Robinson&rsquo;s morphology and
          Strong&rsquo;s numbers for the interlinear study mode.
          Patristic commentary is selected from Philip Schaff&rsquo;s
          Ante-Nicene and Nicene Fathers (1885&ndash;1900). Saint icons
          are from Wikimedia Commons, mostly the early-twentieth-century
          tradition of Greek and Russian iconographers. The daily prayer
          rules are in the common Orthodox prayer-book wording carried
          by the Jordanville, St. Tikhon&rsquo;s, and Hapgood Service
          Book traditions.
        </p>

        {/* What this is not */}
        <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
          What this is not
        </p>
        <ul className="mt-3 space-y-3 font-serif text-[18px] text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
          <li>
            Not aligned with one jurisdiction. We surface both the New
            (Revised Julian) and the Old (Julian) calendars and we name
            their differences. The fasting and feast indexes lean Greek
            for now; Russian-specific feasts will be added.
          </li>
          <li>
            Not affiliated with the trademarked{" "}
            <em>Orthodox Study Bible</em> published by Thomas Nelson.
            We are a separate, public-domain edition.
          </li>
          <li>
            Not engagement-optimized. There are no notifications, no
            streaks calculated against your peers, no engagement-loop
            patterns. The streak counters we do have exist for you, not
            for us.
          </li>
          <li>
            Not an account product. You don&rsquo;t sign up. Your
            highlights, notes, prayer-rule check-offs, and Jesus Prayer
            counts live on your own device, in your browser&rsquo;s local
            storage. Clear them and they are gone; we have no copy.
          </li>
        </ul>

        {/* Who we are */}
        <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
          Who is behind this
        </p>
        <p className="mt-3 font-serif text-[19px] text-paper/85 leading-[1.7]">
          The site is built and maintained by Edgar, an Orthodox
          Christian, with a small team of contributors who care about
          the texts and the typography. The release letters at{" "}
          <Link
            href="/whats-new"
            className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
          >
            /whats-new
          </Link>{" "}
          are signed by Edgar; the rest of the copy is the Purify Team.
          We ship slow. We try to ship honestly.
        </p>

        {/* Money */}
        <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
          Money
        </p>
        <p className="mt-3 font-serif text-[19px] text-paper/85 leading-[1.7]">
          Purify is free, with no plans to put a paywall around what
          ships today. Hosting, domain, and storage cost money; if you
          want to keep the lights on or speed up the work, you can{" "}
          <Link
            href="/support"
            className="text-[#d4af37] hover:underline underline-offset-2"
          >
            support the project
          </Link>{" "}
          (transparent goal + monthly expense breakdown). A supporter
          tier is on the roadmap for features that genuinely cost more
          to run (audio recordings, optional account-and-sync, custom
          prayer plans). Everything in v3.1 will stay free.
        </p>

        {/* Closing */}
        <div className="mt-16 pt-10 border-t border-paper/10 text-center">
          <p
            className="font-serif italic text-[20px] md:text-[22px] tracking-wide leading-[1.5] max-w-[560px] mx-auto"
            style={{ color: "#d4af37" }}
          >
            &ldquo;Acquire the spirit of peace, and a thousand souls
            around you will be saved.&rdquo;
          </p>
          <p className="mt-3 font-sans text-[12px] uppercase tracking-[1.5px] text-paper/45">
            St. Seraphim of Sarov
          </p>
        </div>

        {/* Write to us */}
        <div className="mt-16">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45 mb-3">
            Write to us
          </p>
          <p className="font-serif text-[17px] text-paper/85 leading-[1.7]">
            Found a mistake, want a feature, want to argue about a
            patristic gloss?{" "}
            <a
              href="mailto:team@purify.app"
              className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
            >
              team@purify.app
            </a>
            . We read everything. We answer most things.
          </p>
        </div>
      </article>
    </section>
  );
}
