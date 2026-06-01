import Link from "next/link";
import { loadAllTopics } from "@/lib/topics/topics";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";

export const metadata = {
  title: "Topical Index",
  description:
    "A reference index for enquirers and apologists: doctrinal topics with their Orthodox definition and the patristic citations that confess them.",
};

export const revalidate = 3600;

export default async function TopicsIndexPage() {
  const topics = await loadAllTopics();
  const locale = await getServerLocale();
  const isDe = locale === "de";
  const m = getMessages(locale);

  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <article className="mx-auto max-w-[760px] w-full">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          {isDe ? "Thematischer Index" : t(m, "topics.eyebrow")}
        </p>
        <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {isDe
            ? "Was die Väter über jede Lehre bekannten."
            : t(m, "topics.h1")}
        </h1>
        <p className="mt-6 font-serif text-body text-paper/80 leading-[1.7]">
          {isDe
            ? "Ein Lehr-Index für Suchende, Katechumenen und Laienapologeten. Wähle ein Thema und lies, was die Väter bekannten, wobei jedes Zitat unmittelbar auf das Werk verweist, dem es entstammt."
            : "A doctrinal index for enquirers, catechumens, and lay apologists. Pick a topic and read what the Fathers confessed, with each citation linking straight to the work it is drawn from."}
        </p>

        {topics.length === 0 ? (
          <p className="mt-12 font-serif italic text-body text-paper/55 leading-[1.7]">
            {isDe
              ? "Noch keine kuratierten Themen. Die ersten Einträge landen, sobald die Redaktion sie schreibt; schau bald wieder vorbei."
              : "No curated topics yet. The first entries are landing as the editorial team writes them; check back soon."}
          </p>
        ) : (
          <ul className="mt-12 space-y-3">
            {topics.map((tp) => (
              <li key={tp.slug}>
                <Link
                  href={`/topics/${tp.slug}`}
                  className="block rounded-lg border border-paper/12 bg-paper/[0.03] p-5 hover:border-gold/40 transition-all duration-200"
                >
                  <p className="font-sans text-lede font-semibold text-paper leading-tight">
                    {tp.title}
                  </p>
                  <p className="mt-2 font-serif text-ui text-paper/70 leading-[1.6] line-clamp-3">
                    {tp.definition}
                  </p>
                  <p className="mt-3 font-sans text-eyebrow uppercase tracking-[1.2px] text-gold/85">
                    {tp.citations.length}{" "}
                    {isDe
                      ? tp.citations.length === 1
                        ? "Zitat aus den Vätern"
                        : "Zitate aus den Vätern"
                      : tp.citations.length === 1
                      ? "citation from the Fathers"
                      : "citations from the Fathers"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
