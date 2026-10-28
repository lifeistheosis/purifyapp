import Link from "next/link";

import { T } from "@/components/i18n/T";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { getServerLocale } from "@/lib/i18n/server";
import { akathistTitleKey, listAkathists } from "@/lib/prayers/akathists";
import { hymnsOf } from "@/lib/saints/hymns";
import { loadWriting } from "@/lib/saints/load";

/**
 * The Hymns door of a saint's page (1.8, round 3b D): the Church's hymns to
 * him that the library already holds (lib/saints/hymns.ts), as his works
 * carry them, word for word, each with the service book it was read from and
 * a way into the work where it stands; and, for the Theotokos, her Akathist.
 * Every hymn is marked the Church's, not his: these are sung about a saint,
 * not written by him (the `liturgical` voice of lib/saints/load.ts).
 *
 * A server component, as MiraclesSection is: the hymns are read from the
 * works' files at build time, a few lines each. The door above names the
 * part, so it carries no heading of its own.
 */
export async function HymnsSection({ slug }: { slug: string }) {
  const locale = await getServerLocale();
  const hymns = (
    await Promise.all(
      hymnsOf(slug).map(async (ref) => {
        const content = await loadWriting(slug, ref.work, locale);
        const section = content?.sections.find((s) => s.n === ref.section);
        return content && section ? { ref, workTitle: content.title, section } : null;
      }),
    )
  ).filter((h): h is NonNullable<typeof h> => h !== null);
  const akathist = listAkathists().find((a) => a.slug === slug);
  if (!hymns.length && !akathist) return null;

  return (
    <div className="max-w-[680px] space-y-12">
      {akathist ? (
        <article>
          <p className="font-sans text-caption font-semibold text-paper/55">
            <T k="saints.voice.liturgicalLabel" />
          </p>
          <Link
            href={`/prayers/akathists/${akathist.slug}`}
            prefetch={false}
            className="press-card mt-2 flex min-h-11 items-center gap-3 rounded-[16px] border border-paper/10 bg-paper/[0.04] px-5 py-4"
          >
            <span className="min-w-0 flex-1 font-serif text-title-sm leading-tight text-paper">
              <T k={akathistTitleKey(akathist.slug)} />
            </span>
            <ChevronRight size={18} className="shrink-0 text-paper/45 rtl:-scale-x-100" />
          </Link>
        </article>
      ) : null}
      {hymns.map(({ ref, workTitle, section }) => (
        <article key={`${ref.work}-${ref.section}`}>
          <p className="font-sans text-caption font-semibold text-paper/55">
            <T k="saints.voice.liturgicalLabel" />
          </p>
          <h2 className="mt-1 text-title-sm leading-tight text-paper">{section.title}</h2>
          {section.framing ? (
            <div className="mt-4">
              <p className="font-sans text-caption font-semibold text-paper/55">
                <T k="saints.editorsNote" />
              </p>
              <p className="mt-1 font-sans text-ui italic leading-[1.65] text-paper/70">{section.framing}</p>
            </div>
          ) : null}
          <div className="mt-5 space-y-4">
            {section.paragraphs.map((p, i) => (
              <p key={i} className="font-serif text-lede leading-[1.7] text-paper/85">
                {p}
              </p>
            ))}
          </div>
          {section.citation ? (
            <p className="mt-4 font-sans text-caption leading-snug text-paper/55">{section.citation}</p>
          ) : null}
          <Link
            href={`/saints/${slug}/${ref.work}#s${ref.section}`}
            prefetch={false}
            className="mt-2 inline-flex min-h-11 items-center font-sans text-detail font-semibold text-paper/80 underline-offset-4 hover:text-paper hover:underline"
          >
            <T k="saints.hymns.readInWork" replacements={{ title: workTitle }} />
          </Link>
        </article>
      ))}
    </div>
  );
}
