import { Diptychs } from "@/components/prayers/Diptychs";

export const metadata = {
  title: "Diptychs — your prayer list",
  description:
    "Two lists: those for whom you pray daily, and those who have fallen asleep in the Lord. Local on your device by default; signed-in users sync across devices.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-20";

export default function PersonalPrayersPage() {
  return (
    <section className={`${SECTION} bg-night`}>
      <article className="mx-auto max-w-[820px] w-full">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
          Personal · diptychs
        </p>
        <h1 className="font-sans text-[36px] md:text-[46px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          The names you carry.
        </h1>
        <p className="mt-6 font-serif text-[17px] text-paper/85 leading-[1.7]">
          Orthodox prayer is named. The Liturgy commemorates the living and
          the departed by name; your private rule does the same. Keep two
          short lists here. Read them in the silence after the
          <em> Most Holy Theotokos, save us</em>, or whenever the rule calls
          for personal commemoration.
        </p>
        <p className="mt-3 font-sans text-[13px] text-paper/55">
          Your entries stay on this device. Sign in to sync them across
          devices; nothing is sold or shared with anyone.
        </p>
        <div className="mt-10">
          <Diptychs />
        </div>
      </article>
    </section>
  );
}
