import Link from "next/link";
import { loadAllTopics } from "@/lib/topics/topics";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { TheologyShell } from "@/components/theology/TheologyShell";

export const metadata = {
  title: "Topics",
  description:
    "A reference index for enquirers and apologists: doctrinal topics with their Orthodox definition and the patristic citations that confess them.",
};

export const revalidate = 3600;

// Topics, the approachable mode. A focused question, a plain definition, and
// the Fathers who confess it. Lighter than Doctrine, generous spacing,
// definition-forward.
export default async function TopicsIndexPage() {
  const topics = await loadAllTopics();
  const locale = await getServerLocale();
  const isDe = locale === "de";
  const m = getMessages(locale);

  return (
    <TheologyShell>
      <header>
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-gold/70">
          {isDe ? "Themen" : "Topics"}
        </p>
        <h1 className="mt-3 font-serif text-display-sm md:text-display font-bold leading-[1.08] tracking-[-0.02em] text-paper">
          {isDe
            ? "Was die Väter über jede Lehre bekannten."
            : t(m, "topics.h1")}
        </h1>
        <p className="mt-5 font-serif text-body text-paper/80 leading-[1.75] max-w-[62ch]">
          {isDe
            ? "Ein Lehr-Index für Suchende, Katechumenen und Laienapologeten. Wähle ein Thema und lies, was die Väter bekannten, wobei jedes Zitat unmittelbar auf das Werk verweist, dem es entstammt."
            : "A doctrinal index for enquirers, catechumens, and lay apologists. Pick a topic and read what the Fathers confessed, with each citation linking straight to the work it is drawn from."}
        </p>
      </header>

      {topics.length === 0 ? (
        <p className="mt-12 font-serif italic text-body text-paper/55 leading-[1.7]">
          {isDe
            ? "Noch keine kuratierten Themen. Die ersten Einträge landen, sobald die Redaktion sie schreibt; schau bald wieder vorbei."
            : "No curated topics yet. The first entries are landing as the editorial team writes them; check back soon."}
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-paper/[0.07] border-t border-paper/[0.07]">
          {topics.map((tp) => (
            <li key={tp.slug}>
              <Link href={`/topics/${tp.slug}`} className="group block py-6">
                <p className="font-serif text-title-sm font-semibold text-paper leading-tight group-hover:text-gold transition-colors">
                  {tp.title}
                </p>
                <p className="mt-2 font-serif text-ui text-paper/72 leading-[1.7]">
                  {tp.definition}
                </p>
                <p className="mt-3 font-sans text-eyebrow uppercase tracking-[1.4px] text-gold/80">
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
    </TheologyShell>
  );
}
