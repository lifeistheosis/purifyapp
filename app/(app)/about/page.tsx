import Link from "next/link";

export const metadata = {
 title: "About",
 description:
 "A sanctuary for the Orthodox life outside the Liturgy. What Purify is, what it is made of, how it is kept, and the promises that hold underneath.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

export default function AboutPage() {
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 About this work
 </p>
 <h1 className="font-sans text-[36px] md:text-[46px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 A sanctuary for the Orthodox life outside the Liturgy.
 </h1>

 {/* §1 Manifesto / North Star */}
 <p className="mt-10 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 The north star
 </p>
 <p className="mt-3 font-serif text-[17px] text-paper/85 leading-[1.7]">
 Purify is not an app, not a Bible reader, not a calendar, not a
 prayer book. It is one quiet home for all of those, set together
 so that no part stands alone. The Scriptures with the Fathers in
 the margin. The lives of the saints with their writings to read
 in full. Every day of the Church&rsquo;s year, fast and feast,
 in either reckoning. The morning and evening rules in the wording
 the diaspora has carried.
 </p>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 The Liturgy is where the Church gathers. This is the room you
 come into between Liturgies: to pray when you rise, to read when
 you have an hour, to walk the year, to keep the fast.
 </p>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 Built for the praying life, not for retention loops. There are no
 analytics watching you read, no advertising in the margins, no
 notifications pulling you back. The site is plain on purpose. It
 hopes to be the only thing open on the screen for a little while,
 and then to be closed.
 </p>

 {/* §2 Radical Textual Honesty */}
 <p className="mt-12 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 What it is made of
 </p>
 <h2 className="mt-2 font-sans text-[26px] md:text-[30px] font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 Every text named. Every source open.
 </h2>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 Purify hides nothing about what it puts in front of you. The
 Scriptures, the prayers, and the Fathers are drawn from sources
 you can verify line by line.
 </p>
 <ul className="mt-4 space-y-3 font-serif text-[17px] text-paper/85 leading-[1.65] list-disc pl-6 marker:text-paper/35">
 <li>
 <strong className="text-paper">Old Testament</strong>, Brenton&rsquo;s
 1851 English Septuagint, with the deuterocanonical books and
 the Church&rsquo;s Psalter numbering.
 </li>
 <li>
 <strong className="text-paper">New Testament</strong>, The King
 James Version of 1611.
 </li>
 <li>
 <strong className="text-paper">Greek</strong>, Nestle 1904,
 polytonic, with Strong&rsquo;s numbers and Robinson morphology
 on every word.
 </li>
 <li>
 <strong className="text-paper">The Fathers</strong>, Schaff&rsquo;s
 Ante-Nicene and Nicene Fathers (1885&ndash;1900), the standard
 English critical editions.
 </li>
 <li>
 <strong className="text-paper">Daily prayers</strong>, The wording
 carried by the Jordanville Prayer Book, the editions of St.
 Tikhon&rsquo;s Monastery, and Isabel Hapgood&rsquo;s Service Book.
 </li>
 <li>
 <strong className="text-paper">The Calendar</strong>, Fixed feasts
 on the New (Revised Julian) reckoning of the Ecumenical
 Patriarchate; an Old (Julian) toggle for the Russian, Serbian,
 Athonite, and Jerusalem traditions. Pascha by the algorithm
 shared by all canonical Orthodox churches.
 </li>
 </ul>
 <p className="mt-5 font-serif text-[17px] text-paper/85 leading-[1.7]">
 Over ninety per cent of the textual treasury is in the public
 domain. The site also carries three modern translations under
 proper license, the New King James, the New International,
 and the New Living, fetched live from the publishers and
 shown exactly as set, footnotes and all, with their attribution
 intact. Nothing is repackaged. No translation is concealed inside
 a black-box rendering. There are no proprietary lock-ins.
 </p>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 Where the Orthodox jurisdictions disagree on a point of practice
, most often the calendar and the fast, Purify
 surfaces both readings and does not arbitrate. The Church has not
 asked it to.
 </p>

 {/* §3 Ethical Privacy Covenant */}
 <p className="mt-12 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 Your reading life is yours
 </p>
 <h2 className="mt-2 font-sans text-[26px] md:text-[30px] font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 A covenant on privacy.
 </h2>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 What you highlight, what you note, what you bookmark, the length
 of your prayer streak, these belong to you and only to you.
 </p>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 By default, all of it lives on your device, in the local storage
 of the browser you are reading in. There is no server row, no
 profile, no copy elsewhere. Purify cannot read it because Purify
 never receives it.
 </p>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 If you want your notes and bookmarks to follow you between phone
 and laptop, you may open a{" "}
 <strong className="text-paper">public account</strong>, your
 email and a password, or one of the OAuth providers wired into
 the site. The same data is then stored in a row under your name,
 behind row-level security, so no one else may read it. You may
 sign out at any time, and delete the account and every row
 attached to it from the Data tab on your dashboard. The choice
 between the two paths is named plainly the first time you open{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>
 , and is reversible in either direction.
 </p>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 There is no analytics layer. No third-party tracker. No advertising
 network. The full details, with every field and every third party
 named, are set out on the{" "}
 <Link
 href="/privacy"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 privacy page
 </Link>
 .
 </p>

 {/* §4 Stewardship & the Road Ahead */}
 <p className="mt-12 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45">
 How it is kept
 </p>
 <h2 className="mt-2 font-sans text-[26px] md:text-[30px] font-bold text-paper tracking-[-0.02em] leading-[1.15]">
 Mission-first, independently built.
 </h2>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 This work is kept by an independent steward, not a company. There
 is no investor to satisfy, no growth team to feed, and no incentive
 to keep you on the page longer than you came to be. What ships,
 and what does not, is decided for the sake of the Faith confessed
 by the Fathers and for the sake of the readers who pray with us.
 </p>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 The{" "}
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="text-[#a4adff] hover:text-paper underline underline-offset-2 decoration-[#a4adff]/35"
 >
 Discord server
 </a>{" "}
 and the Instagram account{" "}
 <a
 href="https://instagram.com/purifymylife"
 target="_blank"
 rel="noopener noreferrer"
 className="text-gold hover:text-paper underline underline-offset-2 decoration-gold/35"
 >
 @purifymylife
 </a>{" "}
 exist for the community, not for the algorithm. Conversation
 about the texts, about the saints, about the year, that
 is what they are for.
 </p>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 Purify is funded today by freewill gifts, transparently itemized
 on the{" "}
 <Link
 href="/support"
 className="text-gold hover:underline underline-offset-2"
 >
 Support page
 </Link>
 . The core spiritual treasury, every saint&rsquo;s life,
 every primary writing of the Fathers, the Scriptures with the
 Greek beside them, the daily prayers, the calendar, will
 remain free of charge, always.
 </p>
 <p className="mt-4 font-serif text-[17px] text-paper/85 leading-[1.7]">
 A heavier infrastructure layer is on the way, and the licensing
 is being upgraded so that it can be offered honestly. When that
 optional, subscription-funded layer arrives, it will exist solely
 to pay for the work it requires, the servers, the
 production, the rights, and to keep the core forever open
 to anyone who needs it. What is free today will still be free
 then.
 </p>

 {/* §5 Closing Doxology */}
 <div className="mt-16 pt-10 border-t border-paper/10 text-center">
 <p className="font-serif italic text-[22px] md:text-[26px] tracking-wide leading-[1.4] max-w-[560px] mx-auto text-gold">
 Glory to God for all things.
 </p>
 </div>
 </article>
 </section>
 );
}
