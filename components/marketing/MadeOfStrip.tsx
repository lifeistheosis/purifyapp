import { Cross } from "@/components/ui/icons/Cross";

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
    <section className="snap-start md:[min-height:100dvh] flex items-center px-5 md:px-8 pt-24 md:pt-20 pb-10 md:pb-12 bg-night">
      <div className="mx-auto max-w-[1080px] w-full">
        <div className="text-center max-w-[680px] mx-auto mb-6 md:mb-8">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.8px] text-paper/55 mb-2">
            What we are made of
          </p>
          <h2 className="font-sans text-[26px] md:text-[32px] font-bold text-paper tracking-[-0.02em] leading-[1.15]">
            Public domain, plain-text, all the way down.
          </h2>
          <p className="mt-3 font-sans text-[14px] text-paper/65 leading-[1.6]">
            We tell you what we used and where it came from. No black-box
            translations, no proprietary lock-in, no scriptural choices
            hidden from you.
          </p>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {ITEMS.map((it) => (
            <li
              key={it.title}
              className="rounded-md border border-paper/12 bg-paper/[0.03] p-4"
            >
              <div className="flex items-start gap-3">
                <Cross size={14} className="shrink-0 mt-0.5 text-gold" />
                <div className="min-w-0">
                  <p className="font-sans text-[14.5px] font-semibold text-paper leading-tight">
                    {it.title}
                  </p>
                  <p className="mt-1 font-sans text-[13px] text-paper/70 leading-[1.55]">
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
