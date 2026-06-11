import Link from "next/link";

import type {
  ApologeticsBody,
  EssayBlock,
  Quotation,
} from "@/lib/apologetics/load";
import { saintsCitedIn } from "@/lib/apologetics/load";
import { getSaint } from "@/lib/saints/saints";

export function ApologeticsReader({ body }: { body: ApologeticsBody }) {
  const saints = saintsCitedIn(body);
  return (
    <article className="mx-auto max-w-[760px] w-full">
      <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
        <Link href="/apologetics" className="hover:text-paper">
          Apologetics
        </Link>
      </p>
      <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
        {body.title}
      </h1>
      {body.subtitle ? (
        <p className="mt-4 font-serif italic text-lede text-paper/70 leading-[1.55]">
          {body.subtitle}
        </p>
      ) : null}

      <p className="mt-8 font-serif text-body text-paper/85 leading-[1.75]">
        {body.summary}
      </p>

      {body.essay.length > 0 ? (
        <section className="mt-14 space-y-6">
          {body.essay.map((b, i) => (
            <EssayPart key={i} block={b} />
          ))}
        </section>
      ) : null}

      {body.florilegium.length > 0 ? (
        <section className="mt-16">
          <SectionTitle>From the Fathers</SectionTitle>
          <ul className="mt-8 space-y-10">
            {body.florilegium.map((q, i) => (
              <li key={i}>
                <QuotationCard q={q} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-12 font-sans text-detail text-paper/45 leading-[1.6] italic">
          The verbatim patristic florilegium for this entry is being assembled
          and will be added here.
        </p>
      )}

      {body.scripture && body.scripture.length > 0 ? (
        <section className="mt-16">
          <SectionTitle>Scripture cross-references</SectionTitle>
          <ul className="mt-6 divide-y divide-paper/10 border-y border-paper/10">
            {body.scripture.map((s, i) => (
              <li key={i} className="py-3 flex items-baseline gap-4">
                <Link
                  href={`/bible?q=${encodeURIComponent(s.bibleRef ?? s.ref)}`}
                  className="shrink-0 font-sans text-ui font-semibold text-paper hover:text-gold transition-colors"
                >
                  {s.ref}
                </Link>
                {s.note ? (
                  <span className="font-serif text-detail text-paper/65 leading-[1.6]">
                    {s.note}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {saints.length > 0 ? (
        <section className="mt-16">
          <SectionTitle>Saints cited</SectionTitle>
          <ul className="mt-6 flex flex-wrap gap-2">
            {saints.map((s) => {
              const saint = getSaint(s.saintSlug);
              return (
                <li key={s.saintSlug}>
                  {saint ? (
                    <Link
                      href={`/saints/${saint.slug}`}
                      className="inline-block rounded-pill border border-paper/15 px-3 py-1.5 font-sans text-detail text-paper/85 hover:border-gold/40 hover:text-paper transition-colors"
                    >
                      {saint.name}
                    </Link>
                  ) : (
                    <span className="inline-block rounded-pill border border-paper/15 px-3 py-1.5 font-sans text-detail text-paper/60">
                      {s.author}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {body.related && body.related.length > 0 ? (
        <section className="mt-16">
          <SectionTitle>Related</SectionTitle>
          <ul className="mt-6 flex flex-wrap gap-2">
            {body.related.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/apologetics/${slug}`}
                  className="inline-block rounded-pill border border-paper/15 px-3 py-1.5 font-sans text-detail text-paper/85 hover:border-gold/40 hover:text-paper transition-colors"
                >
                  {slug.replace(/-/g, " ")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {body.curatedBy || body.origin ? (
        <p className="mt-20 font-sans text-caption text-paper/35 leading-[1.6]">
          {body.curatedBy ? <>Curated by {body.curatedBy}</> : null}
          {body.curatedBy && body.curatedOn ? <> · </> : null}
          {body.curatedOn ?? null}
          {body.origin ? (
            <>
              <br />
              {body.origin}
            </>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/55">
        {children}
      </p>
      <div aria-hidden className="mt-3 h-px w-12 bg-gold/40" />
    </>
  );
}

function EssayPart({ block }: { block: EssayBlock }) {
  if (block.kind === "heading") {
    const level = block.level ?? 2;
    if (level === 2) {
      return (
        <h2 className="mt-10 font-sans text-title-sm md:text-title font-semibold tracking-[-0.015em] text-paper">
          {block.text}
        </h2>
      );
    }
    return (
      <h3 className="mt-8 font-sans text-lede font-semibold text-paper">
        {block.text}
      </h3>
    );
  }
  if (block.kind === "blockquote") {
    return (
      <blockquote className="border-l border-gold/40 pl-5 font-serif italic text-body text-paper/85 leading-[1.7]">
        {block.text}
        {block.source ? (
          <p className="mt-2 not-italic font-sans text-detail text-paper/50">
            {block.source}
          </p>
        ) : null}
      </blockquote>
    );
  }
  if (block.kind === "list") {
    return (
      <ul className="list-disc pl-6 space-y-2 font-serif text-body text-paper/85 leading-[1.7]">
        {block.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
  }
  return (
    <p className="font-serif text-body text-paper/85 leading-[1.75]">
      {block.text}
    </p>
  );
}

function QuotationCard({ q }: { q: Quotation }) {
  return (
    <div>
      <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/60">
        {q.saintSlug ? (
          <Link
            href={`/saints/${q.saintSlug}`}
            className="hover:text-paper transition-colors"
          >
            {q.author}
          </Link>
        ) : (
          q.author
        )}
      </p>
      {q.work || q.reference ? (
        <p className="mt-1 font-sans italic text-caption text-paper/55">
          {q.work}
          {q.work && q.reference ? <> · </> : null}
          {q.reference ?? null}
        </p>
      ) : null}
      <blockquote className="mt-4 border-l border-gold/40 pl-5 font-serif italic text-body text-paper/90 leading-[1.7]">
        {q.text}
      </blockquote>
      {q.gloss ? (
        <p className="mt-3 font-sans text-detail text-paper/60 leading-[1.65]">
          {q.gloss}
        </p>
      ) : null}
      {q.source ? (
        <p className="mt-2 font-sans text-caption text-paper/40">
          <a
            href={q.source}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-paper/20 underline-offset-4 hover:text-paper/60"
          >
            Source
          </a>
        </p>
      ) : null}
    </div>
  );
}
