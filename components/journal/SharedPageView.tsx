"use client";

// A shared journal page, read-only (1.9, docs/1.9-build/JOURNAL.md, step 3,
// "sharing, safely"). The page as its writer set it (cover, title, style,
// blocks), headed by the day it was shared and the Church's day, and marked
// as a reader's page made with Purify, with Report under it. A verse card's
// words come from the server's Bible; a library quote arrives as a plain
// quote, cited, without the library's mark (lib/journal/share.ts).

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useVerseCardLabel } from "@/components/journal/PageBlocks";
import { Candle } from "@/components/ui/icons/Candle";
import { Check } from "@/components/ui/icons/Check";
import { Cross } from "@/components/ui/icons/Cross";
import { Heart } from "@/components/ui/icons/Heart";
import { Info } from "@/components/ui/icons/Info";
import { Star } from "@/components/ui/icons/Star";
import { apiFetch } from "@/lib/api/client";
import { highlightVars } from "@/lib/bible/highlightPalette";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { cn } from "@/lib/cn";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { churchDayLine } from "@/lib/journal/churchDay";
import { coverById } from "@/lib/journal/covers";
import type { CalloutIcon, PageBlock } from "@/lib/journal/page";
import type { SharedPage } from "@/lib/journal/sharedPage";

const CALLOUT: Record<CalloutIcon, ReactNode> = {
  candle: <Candle size={20} />,
  cross: <Cross size={20} />,
  info: <Info size={20} />,
  heart: <Heart size={20} />,
  star: <Star size={20} />,
};

export function SharedPageView({ shared }: { shared: SharedPage }) {
  const { t, locale } = useTranslate();
  const [style] = useCalendarStyleDefault();
  const label = useVerseCardLabel();
  const { page } = shared;
  const cover = coverById(page.cover);
  const font = page.style?.font === "sans" ? "font-sans" : "font-serif";
  const align = page.style?.align === "center" ? "text-center" : "text-start";
  const date = new Date(shared.createdAt);
  let when = "";
  try {
    when = new Intl.DateTimeFormat(dateLocale(locale), { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
  } catch {
    /* the Church's day alone */
  }
  const church = churchDayLine(date, style);

  const block = (b: PageBlock, i: number) => {
    switch (b.type) {
      case "text":
        return (
          <p key={i} dir="auto" className={cn("whitespace-pre-line text-body leading-[1.7] text-paper/90", font, align)}>
            {b.color ? (
              <span data-hl-color={b.color} style={highlightVars(b.color)} className="box-decoration-clone rounded-[4px] bg-[var(--hl-verse)] px-[3px] -mx-[3px] py-[0.1em]">
                {b.text}
              </span>
            ) : (
              b.text
            )}
          </p>
        );
      case "verse": {
        const verses = Array.from({ length: b.to - b.from + 1 }, (_, k) => b.from + k);
        return (
          <figure key={i} className="rounded-2xl border border-paper/10 bg-paper/[0.04] px-4 py-3">
            <blockquote dir="auto" className="font-serif text-body leading-[1.65] text-paper/90">
              {verses.map((v) => {
                const words = shared.verses[`${b.book}/${b.chapter}/${v}`];
                return words ? (
                  <span key={v}>
                    {verses.length > 1 ? <sup className="me-1 font-sans text-[11px] font-semibold text-paper/70">{v}</sup> : null}
                    {`${words} `}
                  </span>
                ) : null;
              })}
            </blockquote>
            <figcaption className="mt-1.5 font-sans text-caption text-paper/70">
              <Link href={`/bible/${b.book}/${b.chapter}#v${b.from}`} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-paper">
                {label(b)}
              </Link>
            </figcaption>
          </figure>
        );
      }
      case "quote":
        return (
          <figure key={i} className="rounded-2xl border border-paper/10 px-4 py-3">
            <blockquote dir="auto" className={cn("whitespace-pre-line italic text-body leading-[1.65] text-paper", font)}>{b.text}</blockquote>
            {b.by ? <figcaption dir="auto" className="mt-1.5 font-sans text-caption text-paper/70">{b.by}</figcaption> : null}
          </figure>
        );
      case "heading":
        return (
          <h2 key={i} dir="auto" className={cn("text-[20px] font-semibold leading-[1.3] text-paper", font, align)}>
            {b.text}
          </h2>
        );
      case "check":
        return (
          <ul key={i} className="space-y-1.5">
            {b.items.map((item, k) => (
              <li key={k} className="flex items-center gap-3">
                <span aria-hidden className={cn("grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border", item.done ? "border-paper bg-paper text-night" : "border-paper/45 text-transparent")}>
                  <Check size={15} strokeWidth={2.6} />
                </span>
                <span dir="auto" className={cn("text-body leading-[1.5]", font, item.done ? "text-paper/70 line-through decoration-paper/45" : "text-paper")}>{item.text}</span>
              </li>
            ))}
          </ul>
        );
      case "divider":
        return b.style === "line" ? (
          <hr key={i} className="border-0 border-t border-paper/25" />
        ) : b.style === "dots" ? (
          <div key={i} aria-hidden className="flex justify-center gap-3 py-2">
            {[0, 1, 2].map((d) => (
              <span key={d} className="block size-1 rounded-full bg-paper/60" />
            ))}
          </div>
        ) : (
          <div key={i} aria-hidden className="h-6" />
        );
      case "callout":
        return (
          <div key={i} className="flex items-start gap-3 rounded-2xl bg-paper/[0.07] px-4 py-3">
            <span className="mt-0.5 shrink-0 text-paper/85">{CALLOUT[b.icon]}</span>
            <p dir="auto" className={cn("min-w-0 whitespace-pre-line text-body leading-[1.65] text-paper", font)}>{b.text}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <article data-shared-page="" className="mx-auto max-w-[720px]">
      {cover ? (
        <figure className="-mx-5 md:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- a file of the site's own */}
          <img src={cover.src} alt={cover.alt} className="block h-48 w-full object-cover md:rounded-3xl" />
          <figcaption className="mt-1 px-5 font-sans text-[12px] text-paper/70 md:px-0">{cover.credit}</figcaption>
        </figure>
      ) : null}
      <p className="mt-6 font-sans text-caption text-paper/70">{[when, church.headline].filter(Boolean).join(" · ")}</p>
      {page.title ? <h1 dir="auto" className={cn("mt-2 text-[32px] font-semibold leading-[1.15] text-paper", font, align)}>{page.title}</h1> : null}
      <div className="mt-6 space-y-4">{page.blocks.map(block)}</div>
      <footer className="mt-10 flex flex-wrap items-center gap-3 border-t border-paper/10 pt-4">
        <p className="min-w-0 flex-1 font-sans text-caption text-paper/70">{t("journal.share.made")}</p>
        <ReportButton id={shared.id} />
      </footer>
    </article>
  );
}

/** Report, signed in, once: Community's words and Community's way. */
function ReportButton({ id }: { id: string }) {
  const { t } = useTranslate();
  const [state, setState] = useState<"idle" | "sending" | "done" | "signin" | "failed">("idle");
  if (state === "done") return <p className="font-sans text-caption text-paper/70">{t("profile.reportedNotice")}</p>;
  if (state === "signin")
    return (
      <Link href={`/signin?next=/p/${id}`} className="inline-flex min-h-11 items-center font-sans text-detail font-semibold text-paper/85 underline underline-offset-4">
        {t("common.signIn")}
      </Link>
    );
  return (
    <span className="flex items-center gap-3">
      {state === "failed" ? <span className="font-sans text-caption text-paper/70">{t("community.reportFailed")}</span> : null}
      <button
        type="button"
        disabled={state === "sending"}
        onClick={async () => {
          setState("sending");
          try {
            const res = await apiFetch("/api/journal/share/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
            setState(res.ok ? "done" : res.status === 401 ? "signin" : "failed");
          } catch {
            setState("failed");
          }
        }}
        className="tap-press inline-flex min-h-11 items-center rounded-pill border border-paper/15 px-4 font-sans text-detail font-semibold text-paper/85 disabled:opacity-60"
      >
        {t("community.report")}
      </button>
    </span>
  );
}
