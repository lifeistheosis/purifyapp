// The foot of an event's page: where it sits in the chain of events (what led
// here, what flowed from it), the councils, teaching and heresies of Purify it
// touches, and the events before and after it on the line. Every link
// resolves into existing Purify content, held by the integrity suite. The
// saints it touches are its people, a part of the account (EventPeople).
//
// 1.7: rows with a drawn chevron, turned for the reading direction; the group
// names come from the catalogs. No tinted boxes and no arrow characters.

import Link from "next/link";

import { T } from "@/components/i18n/T";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { COUNCILS } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";
import { eventBySlug, publishedEvents, type HistoryEventMeta } from "@/lib/history/events";
import { getTopicMeta } from "@/lib/theology/topics";

type RelLink = { label: string; sublabel?: string; href: string };

function resolve(meta: HistoryEventMeta) {
  const rel = meta.rel ?? {};
  const groups: { titleKey: string; links: RelLink[] }[] = [];

  const councils: RelLink[] = (rel.councils ?? []).flatMap((slug) => {
    const c = COUNCILS.find((x) => x.slug === slug);
    return c ? [{ label: c.name, sublabel: String(c.year), href: `/councils/${slug}` }] : [];
  });
  if (councils.length) groups.push({ titleKey: "study.history.rel.councils", links: councils });

  const theology: RelLink[] = (rel.theology ?? []).flatMap((slug) => {
    const t = getTopicMeta(slug);
    return t ? [{ label: t.title, href: `/theology/${slug}` }] : [];
  });
  if (theology.length) groups.push({ titleKey: "study.history.rel.theology", links: theology });

  const heresies: RelLink[] = (rel.heresies ?? []).flatMap((slug) => {
    const h = HERESIES.find((x) => x.slug === slug);
    return h ? [{ label: h.name, href: `/heresies/${slug}` }] : [];
  });
  if (heresies.length) groups.push({ titleKey: "study.history.rel.heresies", links: heresies });

  return groups;
}

const ROW =
  "tap-press flex min-h-14 items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper";

function EventLink({ event, back = false }: { event: HistoryEventMeta; back?: boolean }) {
  return (
    <Link href={`/history/${event.slug}`} className={ROW}>
      {back ? <ChevronLeft size={15} className="shrink-0 text-paper/40 rtl:-scale-x-100" /> : null}
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-caption text-paper/55 tabular-nums">{event.displayDate}</span>
        <span className="block truncate font-sans text-ui font-semibold text-paper/90">
          {event.shortTitle ?? event.title}
        </span>
      </span>
      {back ? null : <ChevronRight size={15} className="shrink-0 text-paper/40 rtl:-scale-x-100" />}
    </Link>
  );
}

function Rows({ labelKey, slugs }: { labelKey: string; slugs: string[] }) {
  const events = slugs.map((s) => eventBySlug(s)).filter((e): e is HistoryEventMeta => Boolean(e));
  if (!events.length) return null;
  return (
    <div>
      <p className="font-sans text-caption font-semibold text-paper/60">
        <T k={labelKey} />
      </p>
      <ul className="mt-1 divide-y divide-paper/8">
        {events.map((e) => (
          <li key={e.slug}>
            <EventLink event={e} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EventRelations({ meta }: { meta: HistoryEventMeta }) {
  const groups = resolve(meta);
  const preceded = meta.rel?.precededBy ?? [];
  const resulted = meta.rel?.resultedIn ?? [];

  // The events either side on the line give every page a way along it, even
  // where no chain of cause is written.
  const all = publishedEvents();
  const idx = all.findIndex((e) => e.slug === meta.slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <section className="mt-14 border-t border-paper/10 pt-8">
      {preceded.length || resulted.length ? (
        <div className="mb-10">
          <h2 className="text-lede leading-snug text-paper">
            <T k="study.history.chainOfEvents" />
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <Rows labelKey="study.history.whatLedHere" slugs={preceded} />
            <Rows labelKey="study.history.whatFlowed" slugs={resulted} />
          </div>
        </div>
      ) : null}

      {groups.length ? (
        <div className="mb-10">
          <h2 className="text-lede leading-snug text-paper">
            <T k="study.relatedInPurify" />
          </h2>
          <div className="mt-4 space-y-5">
            {groups.map((g) => (
              <div key={g.titleKey}>
                <p className="font-sans text-caption font-semibold text-paper/60">
                  <T k={g.titleKey} />
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="font-sans text-ui text-link underline-offset-4 hover:underline">
                        {l.label}
                        {l.sublabel ? <span className="text-paper/55"> · {l.sublabel}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {prev || next ? (
        <nav className="grid gap-x-6 border-t border-paper/10 pt-2 sm:grid-cols-2">
          {prev ? (
            <div>
              <p className="pt-3 font-sans text-caption font-semibold text-paper/60">
                <T k="study.history.earlier" />
              </p>
              <EventLink event={prev} back />
            </div>
          ) : (
            <span aria-hidden />
          )}
          {next ? (
            <div className="sm:text-end">
              <p className="pt-3 font-sans text-caption font-semibold text-paper/60">
                <T k="study.history.later" />
              </p>
              <EventLink event={next} />
            </div>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
