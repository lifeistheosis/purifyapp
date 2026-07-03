// "Related" foot of an event page: the saints, councils, doctrine, heresies,
// and scripture the event connects to, plus its place in the chain of events
// (what led here, what flowed from it). Every link resolves into existing
// Purify content, validated by the integrity suite.

import Link from "next/link";

import { COUNCILS } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";
import { getSaint } from "@/lib/saints/saints";
import { getTopicMeta } from "@/lib/theology/topics";
import {
  eventBySlug,
  publishedEvents,
  type HistoryEventMeta,
} from "@/lib/history/events";

type RelLink = { label: string; sublabel?: string; href: string };

function resolve(meta: HistoryEventMeta) {
  const rel = meta.rel ?? {};
  const groups: { title: string; links: RelLink[] }[] = [];

  const saints: RelLink[] = (rel.saints ?? []).flatMap((slug) => {
    const s = getSaint(slug);
    return s ? [{ label: s.name, href: `/saints/${slug}` }] : [];
  });
  if (saints.length) groups.push({ title: "Saints & fathers", links: saints });

  const councils: RelLink[] = (rel.councils ?? []).flatMap((slug) => {
    const c = COUNCILS.find((x) => x.slug === slug);
    return c ? [{ label: c.name, sublabel: String(c.year), href: `/councils/${slug}` }] : [];
  });
  if (councils.length) groups.push({ title: "Councils", links: councils });

  const theology: RelLink[] = (rel.theology ?? []).flatMap((slug) => {
    const t = getTopicMeta(slug);
    return t ? [{ label: t.title, href: `/theology/${slug}` }] : [];
  });
  if (theology.length) groups.push({ title: "Theology", links: theology });

  const heresies: RelLink[] = (rel.heresies ?? []).flatMap((slug) => {
    const h = HERESIES.find((x) => x.slug === slug);
    return h ? [{ label: h.name, href: `/heresies/${slug}` }] : [];
  });
  if (heresies.length) groups.push({ title: "Heresies", links: heresies });

  return groups;
}

function EventChip({ slug }: { slug: string }) {
  const e = eventBySlug(slug);
  if (!e) return null;
  return (
    <Link
      href={`/history/${e.slug}`}
      className="tap-press block rounded-md border border-paper/12 bg-paper/[0.03] px-4 py-3 hover:border-paper/25"
    >
      <span className="font-sans text-caption text-paper/55">{e.displayDate}</span>
      <span className="mt-0.5 block font-sans text-ui font-semibold text-paper/85">
        {e.shortTitle ?? e.title}
      </span>
    </Link>
  );
}

export function EventRelations({ meta }: { meta: HistoryEventMeta }) {
  const groups = resolve(meta);
  const preceded = (meta.rel?.precededBy ?? []).filter((s) => eventBySlug(s));
  const resulted = (meta.rel?.resultedIn ?? []).filter((s) => eventBySlug(s));
  const scripture = meta.rel?.scripture ?? [];

  // Chronological neighbors give every page a walkable timeline context even
  // when no causal chain is curated.
  const all = publishedEvents();
  const idx = all.findIndex((e) => e.slug === meta.slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const hasAny =
    groups.length || preceded.length || resulted.length || scripture.length || prev || next;
  if (!hasAny) return null;

  return (
    <section className="mt-14 border-t border-paper/10 pt-8" aria-label="Related content">
      {preceded.length || resulted.length ? (
        <div className="mb-10">
          <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
            The chain of events
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {preceded.length ? (
              <div>
                <p className="mb-2 font-sans text-caption uppercase tracking-[1.4px] text-paper/55">
                  What led here
                </p>
                <div className="space-y-2">
                  {preceded.map((s) => (
                    <EventChip key={s} slug={s} />
                  ))}
                </div>
              </div>
            ) : null}
            {resulted.length ? (
              <div>
                <p className="mb-2 font-sans text-caption uppercase tracking-[1.4px] text-paper/55">
                  What flowed from it
                </p>
                <div className="space-y-2">
                  {resulted.map((s) => (
                    <EventChip key={s} slug={s} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {groups.length ? (
        <div>
          <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
            Related in Purify
          </h2>
          <div className="mt-5 space-y-5">
            {groups.map((g) => (
              <div key={g.title}>
                <p className="font-sans text-caption uppercase tracking-[1.4px] text-paper/55">
                  {g.title}
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="font-serif text-ui text-link hover:underline underline-offset-4"
                      >
                        {l.label}
                        {l.sublabel ? (
                          <span className="text-paper/55"> · {l.sublabel}</span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {scripture.length ? (
        <div className="mt-8">
          <p className="font-sans text-caption uppercase tracking-[1.4px] text-paper/55">
            Scripture
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
            {scripture.map((ref) => (
              <li key={ref} className="font-serif text-ui text-paper/70">
                {ref}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {prev || next ? (
        <nav
          aria-label="Chronological neighbors"
          className="mt-10 grid gap-3 sm:grid-cols-2"
        >
          {prev ? (
            <Link
              href={`/history/${prev.slug}`}
              className="tap-press rounded-md border border-paper/12 px-4 py-3 hover:border-paper/25"
            >
              <span className="font-sans text-caption text-paper/55">
                ← Earlier · {prev.displayDate}
              </span>
              <span className="mt-0.5 block font-sans text-ui font-semibold text-paper/85">
                {prev.shortTitle ?? prev.title}
              </span>
            </Link>
          ) : (
            <span aria-hidden />
          )}
          {next ? (
            <Link
              href={`/history/${next.slug}`}
              className="tap-press rounded-md border border-paper/12 px-4 py-3 text-right hover:border-paper/25"
            >
              <span className="font-sans text-caption text-paper/55">
                Later · {next.displayDate} →
              </span>
              <span className="mt-0.5 block font-sans text-ui font-semibold text-paper/85">
                {next.shortTitle ?? next.title}
              </span>
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
