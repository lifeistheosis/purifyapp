import Link from "next/link";
import type { Commemoration, FastingStatus } from "@/lib/calendar/orthodox";
import type { Saint } from "@/lib/saints/saints";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { DropCap } from "./DropCap";
import { T } from "@/components/i18n/T";

/**
 * The "feast of the day" panel, Hallow-card aesthetic. The saint of the
 * day (or a quiet Cross fallback) sits on the left, the date + name +
 * fast + Pascha countdown stack on the right with simple hairline
 * dividers. No ornament SVGs inside the card; the chrome stays calm so
 * the typography does the work. Labels are <T> client islands; the fast
 * text resolves from the catalog via its stable ruleId.
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
  fast: FastingStatus;
  paschaPrimary: React.ReactNode;
  paschaSecondary: React.ReactNode;
}) {
  // When a real saint icon is available, render a two-column layout
  // (icon + text). When not, drop the icon column entirely, no Cross
  // fallback, no glow, and let the text column run the full panel width.
  const hasIcon = !!headlineSaint;
  return (
    <div
      className="relative rounded-[28px] overflow-hidden ring-1 ring-inset ring-paper/10 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5)]"
      style={{
        background:
          "radial-gradient(120% 85% at 85% 6%, rgba(255,255,255,0.08) 0%, transparent 52%), linear-gradient(165deg, #26262b 0%, #1a1a1d 55%, #101013 100%)",
      }}
    >
      <div
        className={
          hasIcon
            ? "px-6 md:px-10 py-8 md:py-9 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-7 md:gap-10 items-start"
            : "px-6 md:px-10 py-8 md:py-9"
        }
      >
        {hasIcon && (
          <div className="mx-auto md:mx-0 md:mt-1">
            <SaintIcon saint={headlineSaint} size="lg" priority />
          </div>
        )}

        {/* Text column */}
        <div className={hasIcon ? "min-w-0 text-center md:text-left" : "min-w-0"}>
          {/* Date, quiet small-caps line. */}
          <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold font-semibold">
            {dateLabel}
          </p>
          {headline ? (
            <>
              {/^[A-Za-z]/.test(headline.name) ? (
                <DropCap
                  name={headline.name}
                  href={
                    headlineSaint ? `/saints/${headlineSaint.slug}` : undefined
                  }
                />
              ) : (
                <h1 className="mt-3 font-display-serif text-heading md:text-display-sm leading-[1.06] text-paper">
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
                <p className="mt-3 font-serif italic text-body md:text-body text-paper/75 leading-[1.6] clear-left">
                  {headline.note}
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 font-serif text-body text-paper/65 leading-[1.6]">
              <T k="calendar.noSaintsIndexed" />{" "}
              <Link
                href="/saints"
                className="text-gold hover:text-gold/80 underline-offset-2 hover:underline"
              >
                <T k="calendar.browseAllSaints" />
              </Link>
            </p>
          )}

          {/* Inline fast + Pascha, quiet two-column with a single hairline
              above each, no decorative ornament. */}
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 clear-left">
            <div className="border-t border-paper/10 pt-3">
              <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold/70 font-semibold">
                <T k="today.fastEyebrow" />
              </p>
              <p className="mt-1 font-display-serif text-lede text-paper leading-tight">
                <T k={`calendar.fast.${fast.ruleId}.label`} />
              </p>
              <p className="mt-1 font-serif text-detail text-paper/70 leading-[1.55]">
                <T k={`calendar.fast.${fast.ruleId}.rule`} />
              </p>
            </div>
            <div className="border-t border-paper/10 pt-3">
              <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold/70 font-semibold">
                <T k="today.paschaEyebrow" />
              </p>
              <p className="mt-1 font-display-serif text-lede text-paper leading-tight">
                {paschaPrimary}
              </p>
              <p className="mt-1 font-serif text-detail text-paper/70 leading-[1.55]">
                {paschaSecondary}
              </p>
            </div>
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <div className="px-6 md:px-10 pb-7 pt-4 border-t border-paper/10">
          <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold/70 font-semibold mb-3.5 text-center md:text-left">
            <T k="calendar.alsoCommemorated" />
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {others.map((c, i) => (
              <li
                key={i}
                className="flex items-baseline gap-2 font-sans text-detail text-paper/75 leading-[1.5]"
              >
                <span
                  aria-hidden
                  className="shrink-0 translate-y-[2px] text-gold/55 text-eyebrow"
                >
                  ✦
                </span>
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
