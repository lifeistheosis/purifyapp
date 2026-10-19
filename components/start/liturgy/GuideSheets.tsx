"use client";

// The detail of Your first Liturgy (1.7), in the shared movable sheet
// (components/ui/Sheet.tsx): what a line rests on, every part of the guide to
// jump to, and the sources. On every width, since the guide is the website's
// too. A quotation stays in the public-domain English it was published in,
// as the app's Fathers and councils do, and says so to a reader in another
// language; the words around it are theirs.

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { cn } from "@/lib/cn";
import { requestQuoteFocus } from "@/lib/reading/quoteFocus";
import { SOURCES, SOURCE_LIST, WORDS } from "@/lib/start/firstLiturgy";
import { STEP_IDS, pathFor, type LiturgyPlan, type StepId } from "@/lib/start/liturgyPlan";

import { stepName, type OpenWhy } from "./names";

const DOOR = "tap-press inline-flex min-h-11 items-center gap-1 font-sans text-ui font-semibold text-paper hover:underline hover:underline-offset-4";

/**
 * What a line rests on: why, in the reader's words, then the source's own.
 * `shown` stays set while the sheet slides away, so it leaves with its words.
 * A source's door opens its text on the words quoted from it, lit (1.7.2,
 * components/reading/QuoteFocus.tsx).
 */
export function WhySheet({ open, shown, onClose }: { open: boolean; shown: OpenWhy | null; onClose: () => void }) {
  const { t, locale } = useTranslate();
  const quotes = shown?.why.quotes ?? [];
  return (
    <Sheet open={open && shown !== null} onClose={onClose} title={shown?.title ?? t(WORDS.ui.why.key)} desktop>
      {shown ? (
        <div className="pb-2">
          <p className="font-sans text-body leading-[1.6] text-paper/85">{t(shown.why.line.key)}</p>
          {quotes.map((q, i) => {
            const source = SOURCES[q.source];
            // One door to a source, under the last quotation taken from it.
            const lastFromSource = !quotes.slice(i + 1).some((later) => later.source === q.source);
            const quoted = `“${q.text}”`;
            const where = `${t(source.label.key)}, `;
            return (
              <figure key={`${q.source}-${i}`} className="mt-6">
                <blockquote lang="en" className="font-serif text-body italic leading-[1.7] text-paper/90">
                  {quoted}
                </blockquote>
                <figcaption className="mt-2 font-sans text-caption leading-[1.5] text-paper/55">
                  {where}
                  <span lang="en">{q.at}</span>
                </figcaption>
                {source.href && lastFromSource ? (
                  <Link
                    href={source.href}
                    className={cn(DOOR, "mt-1")}
                    onClick={() => {
                      requestQuoteFocus(
                        source.href as string,
                        quotes.filter((other) => other.source === q.source).map((other) => other.text),
                      );
                      onClose();
                    }}
                  >
                    {t(WORDS.ui.read.key)}
                    <ChevronRight size={15} className="text-paper/50 rtl:-scale-x-100" />
                  </Link>
                ) : null}
              </figure>
            );
          })}
          {locale !== "en" && quotes.length > 0 ? (
            <p className="mt-6 font-sans text-caption text-paper/45">{t(WORDS.ui.english.key)}</p>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}

/** Every card of the guide, to go straight to one; those already read are checked. */
export function PartsSheet({
  open,
  onClose,
  plan,
  current,
  onGo,
  onSources,
}: {
  open: boolean;
  onClose: () => void;
  plan: LiturgyPlan;
  current: StepId;
  onGo: (step: StepId) => void;
  onSources: () => void;
}) {
  const { t } = useTranslate();
  const path: StepId[] = pathFor(plan).filter((s) => s !== "intro");
  return (
    <Sheet open={open} onClose={onClose} title={t(WORDS.ui.parts.key)} desktop>
      <ol className="divide-y divide-paper/[0.07]">
        {path.map((step, i) => {
          const here = step === current;
          const read = !here && STEP_IDS.indexOf(step) <= plan.furthest;
          return (
            <li key={step}>
              <button
                type="button"
                onClick={() => onGo(step)}
                aria-current={here ? "step" : undefined}
                className="tap-press flex min-h-12 w-full items-center gap-3 py-2.5 text-start"
              >
                <span aria-hidden className="w-5 shrink-0 text-end font-sans text-caption font-semibold tabular-nums text-paper/40">
                  {i + 1}
                </span>
                <span className={cn("min-w-0 flex-1 font-sans text-ui", here ? "font-semibold text-paper" : "text-paper/80")}>
                  {stepName(step, t)}
                </span>
                {read ? <Check size={16} className="shrink-0 text-paper/50" /> : null}
              </button>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={onSources} aria-haspopup="dialog" className={cn(DOOR, "mt-3 text-paper/75")}>
        {t(WORDS.ui.sources.key)}
      </button>
    </Sheet>
  );
}

/** Every source the guide rests on, with its edition and where Purify carries it. */
export function SourcesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslate();
  return (
    <Sheet open={open} onClose={onClose} title={t(WORDS.ui.sources.key)} desktop>
      <ul className="divide-y divide-paper/[0.07]">
        {SOURCE_LIST.map((source) => (
          <li key={source.id} className="py-3.5">
            <p className="font-sans text-ui font-semibold leading-snug text-paper">{t(source.label.key)}</p>
            <p lang="en" className="mt-1 font-sans text-caption leading-[1.5] text-paper/55">
              {source.edition}
            </p>
            {source.href ? (
              <Link href={source.href} className={cn(DOOR, "text-detail")} onClick={onClose}>
                {t(WORDS.ui.read.key)}
                <ChevronRight size={14} className="text-paper/50 rtl:-scale-x-100" />
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
