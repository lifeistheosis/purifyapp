import Link from "next/link";

export const metadata = {
 title: "About",
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
 Purify is one place for the four things an Orthodox Christian
 reaches for on any given day. The Scriptures, with the Fathers
 in the margin. The saint of today, the fast of today, and the
 count to Pascha. Twenty-four saint profiles with their works
 to read in full, from St. John Chrysostom verse by verse
 through fourteen books of the New Testament to St. Athanasius
 and the Theotokos. And the prayers that have carried the
 Church for sixteen centuries, sat down quietly enough to
 actually pray. Anyone is welcome here, whether you grew up
 in the Church, are looking in from the outside, or are
 finding your way back after years away.
 </p>

 {/* What this is made of */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 What this is made of
 </p>
 <p className="mt-3 font-serif text-[19px] text-paper/85 leading-[1.7]">
 Almost everything you see is drawn from public-domain sources.
 The Old Testament is Brenton&rsquo;s 1851 English Septuagint,
 which carries the deuterocanon and the Psalter numbering the
 Church has always sung. The New Testament is the King James
 (1611), paired with the polytonic Nestle 1904 Greek, Robinson&rsquo;s
 morphology, and Strong&rsquo;s numbers, so a word can be hovered
 in either column and its match lights up in the other. Patristic
 commentary comes from Philip Schaff&rsquo;s Ante-Nicene and
 Nicene Fathers (1885&ndash;1900); St. John Chrysostom&rsquo;s
 homilies on John, Acts, Romans, the Corinthian letters,
 Ephesians through Philemon, and Hebrews now sit inline with
 the verses he is preaching.
 </p>
 <p className="mt-4 font-serif text-[19px] text-paper/85 leading-[1.7]">
 Three modern translations, the NKJV, NIV, and NLT, are also
 available, fetched live from API.Bible under the publishers&rsquo;
 license, shown exactly as published, with their copyright and
 the usage tracking the license requires. They are never modified
 and never overlaid with our own tagging. Saint icons are from
 Wikimedia Commons, mostly the early-twentieth-century Greek and
 Russian iconographers. The daily prayer rules use the common
 Orthodox prayer-book wording carried by the Jordanville,
 St. Tikhon&rsquo;s, and Hapgood Service Book traditions. The
 calendar is built on the Pascha algorithm shared by every
 canonical Orthodox church, with both the New (Revised Julian)
 and the Old (Julian) reckonings of the fixed feasts.
 </p>

 {/* What this is not */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 What this is not
 </p>
 <ul className="mt-3 space-y-3 font-serif text-[18px] text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 Not tied to one jurisdiction. Both calendars are surfaced and
 their differences named, the New (Revised Julian) kept by
 Constantinople and most of the Greek-speaking world, and the
 Old (Julian) kept in Russia, Serbia, Jerusalem, and on Mount
 Athos. The fasting and feast indexes lean Greek for now; the
 Russian-specific additions will land as we go.
 </li>
 <li>
 Not the trademarked{" "}
 <em>Orthodox Study Bible</em>, which is published by Thomas
 Nelson. We&rsquo;re a separate, public-domain reader.
 </li>
 <li>
 Not built to keep you here. No notifications, no leaderboards,
 no streaks reported back to us. The streak counters that do
 exist are for you to see, and they live in your browser,
 not in a database.
 </li>
 <li>
 Not a SaaS account product. You don&rsquo;t have to sign in to
 use anything. An account lets your highlights, notes,
 prayer-rule check-offs, and bookmarks sync across devices;
 without one, the same things live in your browser&rsquo;s local
 storage on this device alone. Either way, nothing about your
 reading is sold or shared.
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

 {/* Community */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 Community
 </p>
 <p className="mt-3 font-serif text-[19px] text-paper/85 leading-[1.7]">
 There is a Discord for readers, a quiet place for prayer
 requests, content questions, and a sense of who else is reading.
 You can sit and listen, or come in and say something.{" "}
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="text-[#a4adff] hover:text-paper underline underline-offset-2 decoration-[#a4adff]/35"
 >
 Join the Discord ↗
 </a>
 </p>

 {/* Money */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 Money
 </p>
 <p className="mt-3 font-serif text-[19px] text-paper/85 leading-[1.7]">
 Purify is free, and it&rsquo;s staying free. The pricing tier
 is gone, the marketplace is gone, and the licenses we hold for
 the Scriptures bind us to keep it that way, so there&rsquo;s
 nothing to sell here and nothing planned. Hosting and storage
 cost something to run; if you&rsquo;d like to keep the lights
 on, you can{" "}
 <Link
 href="/support"
 className="text-gold hover:underline underline-offset-2"
 >
 support the project
 </Link>{" "}
 (with a transparent goal and a monthly expense breakdown).
 Everything you see today, accounts and sync included, is yours
 at no cost.
 </p>

 {/* Closing */}
 <div className="mt-16 pt-10 border-t border-paper/10 text-center">
 <p
 className="font-serif italic text-[20px] md:text-[22px] tracking-wide leading-[1.5] max-w-[560px] mx-auto text-gold"
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
 patristic gloss? The{" "}
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="text-[#a4adff] hover:text-paper underline underline-offset-2 decoration-[#a4adff]/35"
 >
 Discord
 </a>{" "}
 is the fastest way in; the{" "}
 <Link
 href="/support"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 support page
 </Link>{" "}
 has a longer form if you&rsquo;d rather write at length. We
 read everything. We answer most things.
 </p>
 </div>
 </article>
 </section>
 );
}
