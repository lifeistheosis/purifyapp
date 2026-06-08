import { AnthemPlayer } from "@/components/prayers/AnthemPlayer";

export const metadata = {
  title: "The Prayer Rope Anthem",
  description:
    "The Prayer Rope Anthem, a contemporary Orthodox chant sung while telling the rope, in English, French, and Arabic with synced lyrics. Play it, loop it, and follow the words.",
};

export default function AnthemPage() {
  return (
    <section className="bg-night min-h-[calc(100dvh-72px)] px-6 md:px-8 py-16 md:py-24">
      <article className="mx-auto w-full max-w-[640px]">
        <header className="text-center">
          <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40 mb-4">
            Prayer · a hymn
          </p>
          <h1 className="font-serif text-title-sm md:text-title leading-snug text-paper/90">
            The Prayer Rope Anthem
          </h1>
          <div aria-hidden className="mx-auto mt-6 h-px w-10 bg-gold/50" />
          <p className="mx-auto mt-6 max-w-[58ch] font-serif text-detail text-paper/70 leading-[1.8]">
            The English Prayer Rope Anthem is a contemporary Orthodox chant for
            the prayer rope, sung knot by knot as the rope is told. Verse by
            verse it lifts the rope&rsquo;s short prayers: to the Holy Trinity,
            to the Lord Jesus, to the Most Holy Theotokos, to St John the
            Baptist, and to all the saints and holy angels, each closing on the
            same refrain.
          </p>
          <p className="mx-auto mt-4 max-w-[58ch] font-serif italic text-detail text-paper/50 leading-[1.8]">
            No single author is recorded for it; the anthem spread across the
            Orthodox world. It is offered here in English, French, and Arabic.
            Choose a language, loop it softly, and follow the words below.
          </p>
        </header>

        <div className="mt-10">
          <AnthemPlayer />
        </div>
      </article>
    </section>
  );
}
