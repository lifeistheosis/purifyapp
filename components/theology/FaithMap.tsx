import Link from "next/link";

import { T } from "@/components/i18n/T";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { GalleryBand } from "@/components/ui/GalleryBand";

import { COUNCILS } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";
import { THEOLOGY_SUBJECTS } from "@/lib/theology/subjects";
import { getTopicMeta } from "@/lib/theology/topics";
import { loadAllTopics } from "@/lib/topics/topics";

/**
 * The faith, by subject (1.8, lib/theology/subjects.ts), drawn as a gallery:
 * the owner's pick of 2026-10-27 (round 12, A, "each subject a wide band with
 * its icon, name and line", Homebase/boards/purify-master/variants/
 * 12-theology.png). One band per subject in the order of the Creed, at the
 * head of Theology.
 *
 * Until then each subject was a card with its icon small beside it and, under
 * it, everything the app holds on it: the question, the studies, the errors
 * and the councils. The gallery keeps all of that one tap away: a band opens
 * where it stands to those same links, and closes again. The chevron in its
 * corner is the one mark the mockup does not draw, so a reader can tell that
 * the band opens rather than leads away.
 *
 * Server-drawn: every label comes from its registry as the page builds. A
 * <details> opens without a line of script, in the apps' export as on the web.
 */
export async function FaithMap({ className }: { className?: string }) {
  const topics = await loadAllTopics();
  const topicTitle = (slug: string) => topics.find((t) => t.slug === slug)?.title;

  return (
    // The mockup leads with the bands, so the heading and its line are said
    // to a screen reader and not drawn.
    <section className={className} aria-labelledby="faith-map-title" aria-describedby="faith-map-lead">
      <h2 id="faith-map-title" className="sr-only">
        <T k="study.theology.byFaith" />
      </h2>
      <p id="faith-map-lead" className="sr-only">
        <T k="study.theology.byFaithLead" />
      </p>

      <ul className="grid items-start gap-2.5 md:grid-cols-2 lg:grid-cols-3">
        {THEOLOGY_SUBJECTS.map((s, index) => {
          const links = [
            ...s.topics.map((slug) => ({ href: `/topics/${slug}`, label: topicTitle(slug), kind: "Question" })),
            ...s.studies.map((slug) => ({ href: `/theology/${slug}`, label: getTopicMeta(slug)?.title, kind: "Study" })),
            ...s.heresies.map((slug) => ({
              href: `/heresies/${slug}`,
              label: HERESIES.find((h) => h.slug === slug)?.name,
              kind: "Error",
            })),
            ...s.councils.map((slug) => ({
              href: `/councils/${slug}`,
              label: COUNCILS.find((c) => c.slug === slug)?.byname,
              kind: "Council",
            })),
          ]
            .filter((l): l is { href: string; label: string; kind: string } => Boolean(l.label))
            // A question and a study can share a name (The Theotokos): the
            // second says which it is.
            .map((l, i, all) =>
              all.findIndex((x) => x.label === l.label) < i ? { ...l, label: `${l.label} (${l.kind.toLowerCase()})` } : l,
            );

          return (
            <li key={s.id}>
              <details className="group">
                <GalleryBand
                  summary
                  size="tall"
                  heading="h3"
                  picture={s.picture.src}
                  focus={s.picture.focus}
                  credit={s.picture.credit}
                  title={s.title}
                  line={s.line}
                  // The first four are on a phone's first screen.
                  priority={index < 4}
                  mark={
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-night/70 text-paper/85 ring-1 ring-inset ring-paper/15">
                      <ChevronDown
                        size={15}
                        className="transition-transform duration-300 ease-house group-open:rotate-180 motion-reduce:transition-none"
                      />
                    </span>
                  }
                />
                <ul className="band-open flex flex-wrap gap-1.5 px-1 pt-2.5 pb-2">
                  {links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="tap-press inline-flex min-h-[32px] items-center rounded-full border border-paper/15 px-2.5 font-sans text-caption text-paper/80 transition-colors hover:border-paper/40 hover:text-paper"
                      >
                        <span className="sr-only">{l.kind}: </span>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
