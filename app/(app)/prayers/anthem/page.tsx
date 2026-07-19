import { AnthemPlayer } from "@/components/prayers/AnthemPlayer";
import { ShareButton } from "@/components/ui/ShareButton";
import { T } from "@/components/i18n/T";

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
            <T k="prayers.anthem.eyebrow" />
          </p>
          <h1 className="font-serif text-title-sm md:text-title leading-snug text-paper/90">
            <T k="today.prayNow.anthemTitle" />
          </h1>
          <div aria-hidden className="mx-auto mt-6 h-px w-10 bg-gold/50" />
          <p className="mx-auto mt-6 max-w-[58ch] font-serif text-detail text-paper/70 leading-[1.8]">
            <T k="prayers.anthem.intro1" />
          </p>
          <p className="mx-auto mt-4 max-w-[58ch] font-serif italic text-detail text-paper/50 leading-[1.8]">
            <T k="prayers.anthem.intro2" />
          </p>
          <div className="mt-7 flex justify-center">
            <ShareButton titleKey="today.prayNow.anthemTitle" />
          </div>
        </header>

        <div className="mt-10">
          <AnthemPlayer />
        </div>
      </article>
    </section>
  );
}
