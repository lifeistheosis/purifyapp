const ITEMS: { title: string; body: string }[] = [
  {
    title: "The whole Orthodox canon",
    body: "Septuagint Old Testament (Brenton, 1851) with the deuterocanon and the appointed Psalter numbering, paired with the King James New Testament.",
  },
  {
    title: "Polytonic Koine Greek New Testament",
    body: "Nestle 1904 with Strong's numbers and Robinson morphology on every word. Click any Greek word for the lemma, parse, and short definition.",
  },
  {
    title: "Patristic commentary",
    body: "Selections from Schaff's Ante-Nicene and Nicene Fathers: Athanasius, Chrysostom, Augustine, the Cappadocians, John of Damascus, Maximus, and more.",
  },
  {
    title: "Daily prayer in the common form",
    body: "The Morning and Evening Rules in the wording carried by the Jordanville, St. Tikhon's, and Hapgood Service Book traditions, with a guided Jesus Prayer counter.",
  },
  {
    title: "The calendar in both reckonings",
    body: "New (Revised Julian) of the Ecumenical Patriarchate by default; an Old (Julian) toggle for the Russian, Serbian, Athonite, and Jerusalem traditions. Pascha is shared.",
  },
  {
    title: "No tracking. No advertising. Optional account.",
    body: "Your highlights, notes, bookmarks, and prayer streaks live on your device by default. Sign in to sync them across devices. We don't run analytics or sell ad placement, either way. Built for the praying life, not for engagement.",
  },
];

export function MadeOfStrip() {
  return (
    <section className="px-5 md:px-8 py-16 md:py-20 bg-night">
      <div className="mx-auto max-w-[1080px] w-full">
        <div className="text-center max-w-[680px] mx-auto mb-12">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.8px] text-paper/55 mb-3">
            What we are made of
          </p>
          <h2 className="font-sans text-[28px] md:text-[36px] font-bold text-paper tracking-[-0.02em] leading-[1.15]">
            Public domain, plain-text, all the way down.
          </h2>
          <p className="mt-4 font-sans text-[15px] text-paper/65 leading-[1.65]">
            We tell you what we used and where it came from. No black-box
            translations, no proprietary lock-in, no scriptural choices
            hidden from you.
          </p>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ITEMS.map((it) => (
            <li
              key={it.title}
              className="rounded-md border border-paper/12 bg-paper/[0.03] p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="shrink-0 mt-0.5 text-gold text-[16px] leading-none"
                >
                  ✦
                </span>
                <div className="min-w-0">
                  <p className="font-sans text-[15px] font-semibold text-paper leading-tight">
                    {it.title}
                  </p>
                  <p className="mt-1.5 font-sans text-[13.5px] text-paper/70 leading-[1.6]">
                    {it.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
