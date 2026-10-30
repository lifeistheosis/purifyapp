import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { T } from "@/components/i18n/T";
import { Book } from "@/components/ui/icons/Book";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Church } from "@/components/ui/icons/Church";
import { Cross } from "@/components/ui/icons/Cross";
import { Scroll } from "@/components/ui/icons/Scroll";
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
 * A band opens where it stands to everything the app holds on its subject.
 * Until round 3 that was a cloud of pills of one look, as many as eleven for
 * the Trinity, and what each one was said only to a screen reader. The
 * owner's note 21 of build 80: "a bunch of pills just like are splattered
 * around ... we should stop doing that". His pick for opening a card, round
 * 3 r3-04, part 1, A, "Contents": the band opens to a raised tray of rows,
 * each kind named once with how many there are: the question with how many
 * of the Fathers it cites, the studies with their length, the errors with
 * their century, the councils with their year. The subject's own icon lies
 * blurred and grey behind the tray's head, its light. A row lights white as
 * it is pressed.
 *
 * Server-drawn: every label comes from its registry as the page builds, and
 * every word of the app's own is a <T> island. A <details> opens without a
 * line of script, in the apps' export as on the web.
 */

type Row = { href: string; title: string; sub?: React.ReactNode; meta?: React.ReactNode };
type Group = {
  kind: "questions" | "studies" | "errors" | "councils";
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  rows: Row[];
};

export async function FaithMap({ className }: { className?: string }) {
  const topics = await loadAllTopics();

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
          const groups: Group[] = [
            {
              kind: "questions" as const,
              Icon: Book,
              rows: s.topics.flatMap((slug) => {
                const topic = topics.find((t) => t.slug === slug);
                return topic
                  ? [{ href: `/topics/${slug}`, title: topic.title, sub: <T k="topics.citations" count={topic.citations.length} /> }]
                  : [];
              }),
            },
            {
              kind: "studies" as const,
              Icon: Cross,
              rows: s.studies.flatMap((slug) => {
                const meta = getTopicMeta(slug);
                if (!meta || meta.planned) return [];
                return [
                  {
                    href: `/theology/${slug}`,
                    title: meta.title,
                    meta: meta.estimatedMinutes ? <T k="bible.minRead" replacements={{ minutes: meta.estimatedMinutes }} /> : undefined,
                  },
                ];
              }),
            },
            {
              kind: "errors" as const,
              Icon: Scroll,
              rows: s.heresies.flatMap((slug) => {
                const h = HERESIES.find((x) => x.slug === slug);
                return h ? [{ href: `/heresies/${slug}`, title: h.name, meta: h.era }] : [];
              }),
            },
            {
              kind: "councils" as const,
              Icon: Church,
              rows: s.councils.flatMap((slug) => {
                const c = COUNCILS.find((x) => x.slug === slug);
                return c ? [{ href: `/councils/${slug}`, title: c.byname, meta: String(c.year) }] : [];
              }),
            },
          ].filter((g) => g.rows.length > 0);

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
                <div data-faith-tray="" className="band-open theology-tray relative mt-2 overflow-hidden rounded-[20px] pb-[5px]">
                  {/* The subject's own icon, blurred and grey: the light behind the tray's head. */}
                  <span aria-hidden className="faith-tray-glow" style={{ backgroundImage: `url(${s.picture.src})` }} />
                  {groups.map((g) => (
                    <div key={g.kind} className="relative">
                      <h4 className="flex items-baseline justify-between px-3.5 pb-1 pt-[11px] font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-paper/50">
                        <T k={`study.theology.tray.${g.kind}`} count={g.rows.length} />
                        <span className="text-[11.5px] font-semibold normal-case tracking-normal tabular-nums text-paper/40">{g.rows.length}</span>
                      </h4>
                      <ul className="faith-rows">
                        {g.rows.map((row) => (
                          <li key={row.href}>
                            <Link
                              href={row.href}
                              className="theology-row mx-1.5 flex min-h-[42px] items-center gap-3 rounded-[14px] px-2 py-[5px]"
                            >
                              <span className="theology-plate grid size-8 shrink-0 place-items-center rounded-[10px] text-paper/85">
                                <g.Icon size={17} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-serif text-[15px] font-semibold leading-[1.24] text-paper/92">{row.title}</span>
                                {row.sub ? <span className="mt-0.5 block font-sans text-caption text-paper/50">{row.sub}</span> : null}
                              </span>
                              {row.meta ? (
                                <span className="shrink-0 whitespace-nowrap font-sans text-caption font-medium tabular-nums text-paper/52">{row.meta}</span>
                              ) : null}
                              <ChevronRight size={14} className="shrink-0 text-paper/32 rtl:-scale-x-100" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
