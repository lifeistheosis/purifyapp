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
  const m = getMessages(locale);

  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <article className="mx-auto max-w-[760px] w-full">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          {t(m, "topics.eyebrow")}
        </p>
        <h1 className="font-sans text-[36px] md:text-[46px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {t(m, "topics.h1")}
        </h1>
        <p className="mt-6 font-serif text-[17px] text-paper/80 leading-[1.7]">
          A doctrinal index for enquirers, catechumens, and lay
          apologists. Pick a topic and read what the Fathers confessed,
          with each citation linking straight to the work it is drawn
          from.
        </p>

        {topics.length === 0 ? (
          <p className="mt-12 font-serif italic text-[16px] text-paper/55 leading-[1.7]">
            No curated topics yet. The first entries are landing as the
            editorial team writes them; check back soon.
          </p>
        ) : (
          <ul className="mt-12 space-y-3">
            {topics.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/topics/${t.slug}`}
                  className="block rounded-lg border border-paper/12 bg-paper/[0.03] p-5 hover:border-gold/40 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <p className="font-sans text-[18px] font-semibold text-paper leading-tight">
                    {t.title}
                  </p>
                  <p className="mt-2 font-serif text-[14.5px] text-paper/70 leading-[1.6] line-clamp-3">
                    {t.definition}
                  </p>
                  <p className="mt-3 font-sans text-[11px] uppercase tracking-[1.2px] text-gold/85">
                    {t.citations.length} citation
                    {t.citations.length === 1 ? "" : "s"} from the Fathers
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
