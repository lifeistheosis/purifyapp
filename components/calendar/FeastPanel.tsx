import Link from "next/link";
import type { Commemoration, FastKind } from "@/lib/calendar/orthodox";
import type { Saint } from "@/lib/saints/saints";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { Cross } from "@/components/ui/icons/Cross";
import { Halo } from "@/components/ui/icons/Halo";
import { OrnamentRule } from "./OrnamentRule";
import { SectionLabel } from "./SectionLabel";
import { DropCap } from "./DropCap";

/**
 * The illuminated "feast of the day" panel: the haloed saint icon lit by a
 * tinted lampada glow, framed by ornament rules, with the name set in the
 * ornamental display serif. The fast + Pascha render as small inline tablets.
 * Reads the `--tone` var set by the page wrapper.
 */
export function FeastPanel({
  dateLabel,
  headline,
  headlineSaint,
  others,
  fast,
  paschaPrimary,
  paschaSecondary,
}: {
  dateLabel: string;
  headline: Commemoration | null;
  headlineSaint: Saint | null;
  others: Commemoration[];
  fast: { kind: FastKind; label: string; rule: string };
  paschaPrimary: string;
  paschaSecondary: string;
}) {
  const isFeast = headline?.kind === "feast";
  return (
    <div className="relative rounded-xl border border-gold/20 bg-paper/[0.025] overflow-hidden">
      <div className="px-6 md:px-10 pt-6">
        <OrnamentRule tinted />
      </div>

      <div className="px-6 md:px-10 py-7 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-7 md:gap-10 items-center">
        {/* Haloed icon, lit */}
        <div className="lampada-glow mx-auto md:mx-0">
          {headlineSaint ? (
            <SaintIcon saint={headlineSaint} size="lg" priority />
          ) : (
            <span
              aria-hidden
              className="flex h-[140px] w-[140px] items-center justify-center rounded-lg border border-gold/30 bg-paper/[0.04] text-gold"
            >
              {isFeast ? <Halo size={64} /> : <Cross size={56} />}
            </span>
          )}
        </div>

        {/* Text column */}
        <div className="min-w-0 text-center md:text-left">
          <SectionLabel className="justify-center md:justify-start">
            {dateLabel}
          </SectionLabel>
          {headline ? (
            <>
              {/* Saint name with illuminated drop-cap when this is a named
                  saint or feast; without it (would-be drop cap collides
                  with non-Latin/short labels), fall through to a plain
                  display-serif heading. */}
              {/^[A-Za-z]/.test(headline.name) ? (
                <DropCap
                  name={headline.name}
                  href={
                    headlineSaint ? `/saints/${headlineSaint.slug}` : undefined
                  }
                />
              ) : (
                <h1 className="mt-3 font-display-serif text-[30px] md:text-[42px] leading-[1.06] text-paper">
                  {headlineSaint ? (
                    <Link
                      href={`/saints/${headlineSaint.slug}`}
                      className="hover:text-gold transition-colors"
                    >
                      {headline.name}
                    </Link>
                  ) : (
                    headline.name
                  )}
                </h1>
              )}
              {headline.note && (
                <p className="mt-3 font-serif italic text-[16px] md:text-[17px] text-paper/75 leading-[1.6] clear-left">
                  {headline.note}
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 font-serif text-[17px] text-paper/65 leading-[1.6]">
              No saints indexed for this day yet.{" "}
              <Link
                href="/saints"
                className="text-gold hover:text-gold/80 underline-offset-2 hover:underline"
              >
                Browse all saints
              </Link>
            </p>
          )}

          {/* Inline rubric: fast rule + Pascha countdown. Two thin gold
              hairlines instead of bordered tablets; the surrounding space
              is the container. */}
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 clear-left">
            <div className="border-t border-gold/30 pt-3">
              <p className="font-sans text-[10.5px] uppercase tracking-[2px] text-gold/70 font-semibold">
                The Fast
              </p>
              <p className="mt-1 font-serif text-[17px] leading-[1.45] rubric">
                {fast.label}
              </p>
              <p className="mt-1 font-serif text-[13.5px] text-paper/70 leading-[1.55]">
                {fast.rule}
              </p>
            </div>
            <div className="border-t border-gold/30 pt-3">
              <p className="font-sans text-[10.5px] uppercase tracking-[2px] text-gold/70 font-semibold">
                Pascha
              </p>
              <p className="mt-1 font-display-serif text-[19px] text-paper leading-tight">
                {paschaPrimary}
              </p>
              <p className="mt-1 font-serif text-[13.5px] text-paper/70 leading-[1.55]">
                {paschaSecondary}
              </p>
            </div>
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <div className="px-6 md:px-10 pb-6">
          <OrnamentRule className="mb-4" />
          <p className="font-sans text-[10.5px] uppercase tracking-[1.5px] text-paper/45 mb-2.5 text-center md:text-left">
            Also commemorated today
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {others.map((c, i) => (
              <li
                key={i}
                className="flex items-baseline gap-2 font-sans text-[13px] text-paper/75 leading-[1.5]"
              >
                <Cross size={11} className="shrink-0 translate-y-[2px] text-gold/55" />
                <span>
                  <span className="text-paper/90">{c.name}</span>
                  {c.note && <span className="text-paper/45"> · {c.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
