// The long-form body of a history event page: masthead (era, date, place,
// certainty), then the editorial sections, context, narrative, significance,
// consequences, and the uncertainty note when the account needs one. Server
// component; the narrative must be crawlable HTML for SEO.

import Link from "next/link";

import type { EssayBlock } from "@/lib/theology/load";
import type { HistoryEventBody } from "@/lib/history/load";
import {
  categoryById,
  eraById,
  type Era,
  type HistoryEventMeta,
} from "@/lib/history/events";
import { cn } from "@/lib/cn";
import { CertaintyBadge } from "./CertaintyBadge";
import { T } from "@/components/i18n/T";

// One ornament glyph per era, so each account carries its age's mark
// between sections (paired with the era hue set on the page wrapper).
const ERA_ORNAMENT: Record<Era, string> = {
  apostolic: "☩",
  persecution: "✠",
  "imperial-conciliar": "❖",
  christological: "✦",
  iconoclasm: "◈",
  "byzantine-expansion": "✶",
  estrangement: "◆",
  "late-byzantine": "✧",
  ottoman: "✤",
  "global-missions": "✺",
  modern: "✚",
};

function Block({ block, dropCap = false }: { block: EssayBlock; dropCap?: boolean }) {
  switch (block.kind) {
    case "heading": {
      const H = block.level === 3 ? "h3" : "h2";
      return (
        <H className="font-sans text-title-sm md:text-title font-bold tracking-[-0.015em] text-paper pt-4">
          {block.text}
        </H>
      );
    }
    case "blockquote":
      return (
        <blockquote className="border-l-2 border-paper/25 pl-5">
          <p className="font-serif italic text-body text-paper/80 leading-[1.75]">
            {block.text}
          </p>
          {block.source ? (
            <cite className="mt-2 block font-sans text-caption not-italic text-paper/55">
              {block.source}
            </cite>
          ) : null}
        </blockquote>
      );
    case "list":
      return (
        <ul className="list-disc space-y-2 pl-6 font-serif text-body text-paper/85 leading-[1.7]">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    default:
      return (
        <p
          className={cn(
            "font-serif text-body text-paper/85 leading-[1.75]",
            dropCap && "account-dropcap",
          )}
        >
          {block.text}
        </p>
      );
  }
}

function Section({
  title,
  blocks,
  ornament,
  dropCap = false,
}: {
  title: string;
  blocks?: EssayBlock[];
  /** Era glyph drawn above the section heading. */
  ornament?: string;
  /** Give the section's first paragraph the era drop cap. */
  dropCap?: boolean;
}) {
  if (!blocks?.length) return null;
  return (
    <section className="account-reveal mt-12">
      {ornament ? (
        <div aria-hidden className="account-ornament mb-6">
          {ornament}
        </div>
      ) : null}
      <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
        {title}
      </h2>
      <div className="mt-5 space-y-6">
        {blocks.map((b, i) => (
          <Block key={i} block={b} dropCap={dropCap && i === 0 && b.kind === "para"} />
        ))}
      </div>
    </section>
  );
}

export function EventArticle({
  meta,
  body,
}: {
  meta: HistoryEventMeta;
  body: HistoryEventBody;
}) {
  const era = eraById(meta.era);
  return (
    <article className="w-full max-w-[760px]">
      <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55">
        <Link href="/history" className="hover:text-paper">
          <T k="nav.discoverMenu.history" />
        </Link>
        <span aria-hidden className="mx-2 text-paper/30">
          ·
        </span>
        <span className="text-paper/55">{era.label}</span>
      </p>

      <h1 className="mt-4 font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
        {meta.title}
      </h1>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-serif text-lede text-paper/75">
          {meta.displayDate}
          {meta.region ? (
            <span className="text-paper/60"> · {meta.region}</span>
          ) : null}
        </p>
        <CertaintyBadge certainty={meta.certainty} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {meta.categories.map((c) => {
          const cat = categoryById(c);
          return (
            <span
              key={c}
              title={cat.description}
              className="rounded-pill bg-paper/[0.06] px-2.5 py-0.5 font-sans text-caption text-paper/55"
            >
              {cat.label}
            </span>
          );
        })}
      </div>

      <p className="mt-8 font-serif text-body text-paper/85 leading-[1.75]">{meta.summary}</p>

      <Section
        title="The world before"
        blocks={body.context}
        ornament={ERA_ORNAMENT[meta.era]}
        dropCap
      />
      <Section
        title="What happened"
        blocks={body.narrative}
        ornament={ERA_ORNAMENT[meta.era]}
        dropCap={!body.context?.length}
      />
      <Section
        title="Why it matters to Orthodoxy"
        blocks={body.significance}
        ornament={ERA_ORNAMENT[meta.era]}
      />
      <Section
        title="What flowed from it"
        blocks={body.consequences}
        ornament={ERA_ORNAMENT[meta.era]}
      />

      {body.uncertainty ? (
        <aside className="account-reveal mt-12 rounded-md border border-paper/12 bg-paper/[0.03] px-5 py-4">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/60">
            <T k="study.history.certaintyNote" />
          </p>
          <p className="mt-2 font-sans text-detail text-paper/65 leading-[1.6]">
            {body.uncertainty}
          </p>
        </aside>
      ) : null}
    </article>
  );
}
