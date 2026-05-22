export const metadata = {
 title: "FAQ",
 description:
 "Twelve common questions about Purify: Orthodox alignment, Bible translations, calendar styles, prayer book sources, privacy, and the roadmap.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

type QA = {
 q: string;
 a: React.ReactNode;
};

const QUESTIONS: QA[] = [
 {
 q: "Is this Orthodox?",
 a: (
 <>
 <p>
 Yes. Purify is built for Orthodox Christians and for those who are
 curious about, exploring, or being prepared for Holy Orthodoxy. The
 Bible we serve is the Orthodox canon (Septuagint Old Testament with
 the deuterocanon, the King James New Testament). The calendar follows
 the New (Revised Julian) reckoning used by the Ecumenical Patriarchate
 of Constantinople by default, with an Old (Julian) toggle for the
 Russian, Serbian, Athonite, and Jerusalem traditions. The daily prayer
 rules are the common Orthodox prayer-book rules.
 </p>
 </>
 ),
 },
 {
 q: "Which jurisdiction is this aligned with?",
 a: (
 <>
 <p>
 None in particular. We try to serve every canonical Eastern Orthodox
 Christian: the Ecumenical Patriarchate of Constantinople, Antioch,
 Alexandria, Jerusalem, Moscow, Serbia, Romania, Bulgaria, Georgia,
 Greece, Cyprus, the OCA, ROCOR, and the rest of the canonical family.
 Where Greek and Slavic traditions differ (Old vs. New calendar, the
 ranking of certain feasts, fast nuances) we name the difference rather
 than choose one side.
 </p>
 </>
 ),
 },
 {
 q: "Which Bible do you use, and why?",
 a: (
 <>
 <p>
 The Old Testament is Brenton&rsquo;s 1851 English translation of the
 Septuagint, the Greek Old Testament read by the Apostles, the Fathers,
 and the Church in her services. It carries the deuterocanonical books
 (Tobit, Judith, Wisdom, Sirach, Baruch, the Maccabees) and the Psalter
 numbering used in our liturgical books. It is in the public domain.
 </p>
 <p>
 The New Testament is the King James Version (1611), again public
 domain, in the same Textus-Receptus tradition that underlies the
 Greek text the Orthodox Church has always read.
 </p>
 </>
 ),
 },
 {
 q: "Why use the King James for the New Testament?",
 a: (
 <>
 <p>
 Three reasons. It is public domain (every word free to ship, with no
 royalty trap and no hidden translation choices). It is in the
 Textus-Receptus tradition that aligns most closely with the Greek the
 Orthodox Church has read for fifteen centuries. And its English is
 beautiful in a way few modern translations are. We may add a modern
 translation later; we will not drop the King James.
 </p>
 </>
 ),
 },
 {
 q: "The Greek New Testament you show is Nestle 1904, why not Byzantine?",
 a: (
 <>
 <p>
 We started with Robinson&rsquo;s Byzantine Majority Text and switched
 to Nestle 1904 for one practical reason: Nestle 1904 ships with full
 polytonic accents (breathings, circumflex, iota subscript) and the
 public versions of the Byzantine text we could find were stripped of
 their accents. Accents matter for Koine. The two traditions agree on
 the overwhelming majority of the New Testament; where they differ
 (the Pericope Adulterae, certain words in 1 John, the long ending of
 Mark) we surface the verses the Church reads.
 </p>
 </>
 ),
 },
 {
 q: "Which calendar do you follow? Can I switch?",
 a: (
 <>
 <p>
 The default is the New (Revised Julian) calendar used by the
 Ecumenical Patriarchate of Constantinople and the majority of
 canonical Orthodox jurisdictions for fixed feasts. There is a toggle
 at the top of the calendar page for the Old (Julian) calendar used by
 the Russian Patriarchate, Serbia, Jerusalem, and Mount Athos: it
 shifts the lookup back by thirteen days. Pascha and the moveable
 cycle are shared between both calendars (computed by the Julian-based
 algorithm common to every canonical Orthodox church).
 </p>
 </>
 ),
 },
 {
 q: "The fasting rule on the calendar looks different from what my priest says.",
 a: (
 <>
 <p>
 Trust your priest. The fasting rules we surface are a simplified
 reading of common Greek-tradition Orthodox practice, useful for daily
 orientation but not a substitute for spiritual direction. Local
 custom varies, parish dispensations vary, and the Triodion and
 Pentecostarion carry exceptions that a one-line badge cannot capture.
 Your spiritual father knows your circumstances; we do not.
 </p>
 </>
 ),
 },
 {
 q: "Where did the daily prayer texts come from?",
 a: (
 <>
 <p>
 The Morning and Evening Rules are in the common English wording
 carried by the major Orthodox prayer-book traditions of the last
 century: the Jordanville Prayer Book of the Russian Church Abroad, the
 St. Tikhon&rsquo;s Monastery Press editions of the OCA, and the
 Service Book of the Holy Orthodox-Catholic Apostolic Church by Isabel
 Hapgood (1906). These three traditions carry the same prayers in
 nearly identical wording. We use the wording that has stood, leaning
 toward the older Hapgood form where it differs.
 </p>
 </>
 ),
 },
 {
 q: "Where are the Russian saints?",
 a: (
 <>
 <p>
 The saints index leans Greek for now, with a handful of Russian
 saints (St. Seraphim of Sarov, and the Fathers shared by both
 traditions like St. Maximus the Confessor and St. Symeon the New
 Theologian). St. Sergius of Radonezh, St. John of Kronstadt, the
 New Martyrs, the Optina Elders, the Royal Martyrs, and many more are
 on the roadmap. If a particular saint matters to you and is missing,
 write to us; the order of additions can change.
 </p>
 </>
 ),
 },
 {
 q: "Will there be akathists, audio, accounts, and cross-device sync?",
 a: (
 <>
 <p>
 Accounts and cross-device sync landed in v3.3. Sign-in is by an
 emailed magic link, you never make a password. Without an
 account, every highlight, note, bookmark, and prayer-rule streak
 stays in your browser on this device. With an account, the same
 things follow you across devices. You can delete the account, and
 all of the server-side rows it created, from your{" "}
 <a
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 account page
 </a>{" "}
 at any time.
 </p>
 <p>
 Akathists (the Theotokos, Christ, the most-asked-for saints) are
 the next major content drop. Audio recordings of the Morning Rule,
 the Evening Rule, and the Hours are on the roadmap but they require
 either commissioning readers or licensing existing recordings;
 expect a longer wait.
 </p>
 </>
 ),
 },
 {
 q: "Do you collect any of my data?",
 a: (
 <>
 <p>
 <strong>Without an account:</strong> no analytics, no third-party
 scripts, no cookies that identify you. Your highlights, notes,
 bookmarks, prayer-rule completions, and Jesus Prayer counts live in
 your browser&rsquo;s localStorage, on your device. Clear them and
 they are gone. We have no copy.
 </p>
 <p>
 <strong>With an account:</strong> the same items are also stored on
 Supabase under a row-level-security policy that lets only you read
 them. We do not run analytics on this data. We do not share or sell
 it. Delete your account from your account page and every row is
 dropped via cascade.
 </p>
 <p>
 In both cases, our hosting provider (Render) sees the standard
 request data any web server sees: IP address, user-agent, requested
 URL, response time. That is the minimum needed to deliver the page;
 we do not aggregate it, sell it, or correlate it across sessions.
 </p>
 </>
 ),
 },
 {
 q: "How do I install this on my phone, and how do I send feedback?",
 a: (
 <>
 <p>
 Purify is a Progressive Web App. On iOS Safari, tap the Share button
 and choose &ldquo;Add to Home Screen.&rdquo; On Android Chrome, tap
 the three-dot menu and choose &ldquo;Install app&rdquo; or
 &ldquo;Add to Home screen.&rdquo; The site then opens in its own
 window without browser chrome.
 </p>
 <p>
 For feedback: email{" "}
 <a
 href="mailto:team@purify.app"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 team@purify.app
 </a>
 . We read everything. We answer most things.
 </p>
 </>
 ),
 },
];

export default function FaqPage() {
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 Frequently asked
 </p>
 <h1 className="font-sans text-[40px] md:text-[52px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 The questions readers actually ask.
 </h1>
 <p className="mt-6 font-serif text-[17px] text-paper/75 leading-[1.7]">
 Honest answers. The first one is open; tap any other to expand.
 </p>

 <div className="mt-10 space-y-3">
 {QUESTIONS.map((qa, i) => (
 <details
 key={i}
 open={i === 0}
 className="group rounded-md border border-paper/12 bg-paper/[0.03] open:bg-paper/[0.05] transition-colors"
 >
 <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4">
 <span className="font-sans text-[16px] md:text-[17px] font-semibold text-paper leading-tight">
 {qa.q}
 </span>
 <span
 aria-hidden
 className="text-paper/45 group-open:rotate-180 transition-transform duration-200 text-[12px] shrink-0"
 >
 ▾
 </span>
 </summary>
 <div className="px-5 pb-5 -mt-1 font-serif text-[17px] text-paper/85 leading-[1.7] space-y-4">
 {qa.a}
 </div>
 </details>
 ))}
 </div>
 </article>
 </section>
 );
}
