import { AudioPlayer } from "@/components/prayers/AudioPlayer";
import { ANTHEM_LYRICS } from "@/lib/prayers/anthemLyrics";

export const metadata = {
  title: "The Prayer Rope Anthem",
  description:
    "The English Prayer Rope Anthem, a contemporary Orthodox chant sung while telling the rope, lifting the Trinity, Christ, the Theotokos, and the saints, verse by verse. Play it, loop it, and follow the words.",
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
            Orthodox world and is sung in Serbian, Greek, Russian, and this
            English setting. Loop it softly, and follow the words below.
          </p>
        </header>

        <div className="mt-10">
          <AudioPlayer
            src="/audio/prayer-rope-anthem.mp3"
            title="The English Prayer Rope Anthem"
            subtitle="Loop to keep pace · tap Lyrics to follow along"
            lyrics={ANTHEM_LYRICS}
          />
        </div>
      </article>
    </section>
  );
}
