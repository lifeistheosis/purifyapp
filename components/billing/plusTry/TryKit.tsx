"use client";

// The pieces every Plus preview is built with (r3-07 A, components/billing/
// PlusTry.tsx): the window the feature's screen stands in, the carved switch
// for what can be chosen under it, the strip of tiles, and the Example mark
// on words that are not the reader's own. Light on purpose: the Plus page
// draws the window while a feature's screen is still being read.

import type { CSSProperties, ReactNode, Ref } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

/**
 * The window: a page of the feature's own screen, working, set into the Plus
 * page with a soft light at its top and the words fading at its foot. It
 * scrolls inside itself, the way the screen does. The page's own palette
 * (`style`, the Candlelight preview's) stays inside it.
 */
export function TryWindow({
  children,
  loading = false,
  tall = false,
  label,
  overlay,
  className,
  style,
  scrollRef,
}: {
  children?: ReactNode;
  /** The feature's screen is still coming. */
  loading?: boolean;
  /** A screen that needs more room: a card, a profile, a picture. */
  tall?: boolean;
  /** What the window shows, for a screen reader. */
  label?: string;
  /** Over the page, still: the lock's own words once a sound's minute is up. */
  overlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** The part that scrolls, for a screen that puts its page back at the top. */
  scrollRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      role={label ? "group" : undefined}
      aria-label={label}
      aria-busy={loading || undefined}
      data-plus-try-window=""
      className={cn("plus-try-window relative isolate overflow-hidden rounded-[22px] bg-night text-paper", className)}
      style={style}
    >
      <span aria-hidden className="plus-try-glow pointer-events-none absolute left-1/2 top-[-150px] -z-10 h-[300px] w-[420px] -translate-x-1/2" />
      <div ref={scrollRef} className={cn("overflow-y-auto overscroll-contain scrollbar-thin", tall ? "h-[clamp(220px,40dvh,340px)]" : "h-[clamp(200px,34dvh,290px)]")}>
        {loading ? (
          <div aria-hidden className="space-y-3 px-5 pt-8">
            <Skeleton className="mx-auto h-7 w-1/3" weight="faint" />
            <Skeleton className="h-4 w-full" weight="faint" />
            <Skeleton className="h-4 w-5/6" weight="faint" />
            <Skeleton className="h-4 w-2/3" weight="faint" />
          </div>
        ) : (
          children
        )}
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-night" />
      {overlay ? <div className="plus-try-rest absolute inset-0 z-10 grid place-items-center bg-night/85 px-7 text-center">{overlay}</div> : null}
    </div>
  );
}

/**
 * A carved track of a few choices, the chosen one white and softly lit, as
 * the plans' Yearly and Monthly are: never a scatter of pills.
 */
export function TrySwitch<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly { id: T; label: ReactNode; lang?: string; className?: string }[];
  value: T;
  onChange: (id: T) => void;
  /** Names the choice for a screen reader. */
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("plus-try-track mt-3.5 flex gap-1 rounded-pill p-1", className)}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            lang={o.lang}
            onClick={() => onChange(o.id)}
            className={cn(
              "paywall-choice min-h-11 min-w-0 flex-1 rounded-pill px-2 font-sans text-detail font-semibold",
              on ? "bg-paper text-night shadow-[0_0_18px_-4px_rgba(255,255,255,0.6)]" : "text-paper/60 hover:text-paper",
              o.className,
            )}
          >
            <span className="block truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A row of tiles that runs off the page's edge and scrolls sideways: the sounds, the frames. */
export function TryStrip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="group" aria-label={label} className="-mx-5 mt-3.5 overflow-x-auto overscroll-x-contain px-5 pb-1 no-scrollbar">
      <div className="flex w-max gap-2">{children}</div>
    </div>
  );
}

/** One tile of a strip: the chosen one white and softly lit. */
export function TryTile({
  on,
  onClick,
  disabled,
  children,
  className,
  label,
}: {
  on: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  /** Said for the tile when its face is a picture. */
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "tap-press relative flex h-[86px] w-[86px] shrink-0 flex-col justify-between rounded-[12px] p-2.5 text-start",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
        on ? "plus-try-tile-lit bg-paper text-night" : "bg-paper/[0.05] text-paper ring-1 ring-inset ring-paper/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * The mark on words that are not the reader's: an example, in the words of
 * the app's own library (a verse, a Father's line), never theirs.
 */
export function ExampleTag({ className }: { className?: string }) {
  const { t } = useTranslate();
  return (
    <span
      data-plus-try-example=""
      className={cn(
        "inline-flex items-center rounded-pill border border-paper/25 px-2 py-0.5 align-middle font-sans text-[11px] font-semibold leading-tight text-paper/70",
        className,
      )}
    >
      {t("plus.try.example")}
    </span>
  );
}
