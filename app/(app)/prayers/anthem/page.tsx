import { AudioPlayer } from "@/components/prayers/AudioPlayer";
import { ANTHEM_LYRICS } from "@/lib/prayers/anthemLyrics";

export const metadata = {
  title: "The Prayer Rope Anthem",
  description:
    "A hymn for the prayer rope — a song to accompany the Jesus Prayer. Play it with looping and follow along with the lyrics.",
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
          <p className="mx-auto mt-6 max-w-[48ch] font-serif italic text-detail text-paper/60 leading-[1.7]">
            A song to keep beside the rope — not the Jesus Prayer itself, but a
            hymn to carry the heart along while you tell it. Loop it softly and
            follow the words.
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
