"use client";

import Image from "next/image";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { STORE_LINKS, STORE_RATINGS, type StoreId } from "@/lib/marketing/storeRatings";

/**
 * The pieces every "get the app" surface shares: the store buttons, their
 * real ratings, and the phone drawn around a screenshot. The front page's
 * apps section, its phone screens and the app pop-up (AppNudge) all use
 * these, so a store link or a rating is written once.
 *
 * Plain buttons naming the store, not Apple's or Google's badge artwork: the
 * badges come with their own usage rules and files, and these read as part of
 * the page.
 */

export const STORE_NAME: Record<StoreId, string> = {
  appStore: "App Store",
  googlePlay: "Google Play",
};

/** The status bar clock on the drawn phones, Apple's own convention. */
const STATUS_TIME = "9:41";

/** A store link. `solid` is the one to press; `outline` the alternative. */
export function StoreButton({
  store,
  emphasis = "outline",
  block = false,
  onClick,
  className,
}: {
  store: StoreId;
  emphasis?: "solid" | "outline";
  /** Full width, for a single button in a sheet. */
  block?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const { t } = useTranslate();
  const solid = emphasis === "solid";
  return (
    <a
      href={STORE_LINKS[store]}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        "group inline-flex min-h-[56px] items-center gap-3 rounded-2xl px-4 py-2.5 transition-[background-color,border-color,transform] duration-150 active:scale-[0.98]",
        solid
          ? "bg-paper text-on-paper shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] hover:bg-paper/90"
          : "border border-paper/15 bg-paper/[0.05] text-paper hover:border-paper/35 hover:bg-paper/10",
        block && "w-full justify-center",
        className,
      )}
    >
      <PhoneGlyph android={store === "googlePlay"} className={solid ? "text-on-paper/80" : "text-paper/80"} />
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <span className={cn("font-sans text-caption", solid ? "text-on-paper/65" : "text-paper/60")}>
          {t(store === "appStore" ? "home.apps.appStorePre" : "home.apps.playPre")}
        </span>
        <span className="font-sans text-ui font-semibold">{STORE_NAME[store]}</span>
      </span>
    </a>
  );
}

/** One store's real rating, from lib/marketing/storeRatings.ts. */
export function StoreRating({ store, className }: { store: StoreId; className?: string }) {
  const { t, tn } = useTranslate();
  const r = STORE_RATINGS[store];
  return (
    <p className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <Stars label={t("home.apps.outOfFive", { rating: r.rating.toFixed(1) })} />
      <span aria-hidden className="font-sans text-caption font-semibold tabular-nums text-paper">
        {r.rating.toFixed(1)}
      </span>
      <span className="font-sans text-caption text-paper/60">
        {tn(store === "appStore" ? "home.apps.ratingsAppStore" : "home.apps.ratingsPlay", r.count)}
      </span>
    </p>
  );
}

/**
 * The phone front page's ask: one full-width button for the visitor's own
 * store, its rating, and the other store as a quiet link beneath (the owner
 * chose this over two equal buttons, 2026-09-30, "too cluttered").
 *
 * The page is cached, so the server cannot know the device. Both asks are
 * rendered and app/globals.css shows the one that matches data-store on
 * <html>, which lib/platform/storePrepaint.ts sets before the first paint:
 * nothing rearranges once React loads. A browser the script does not
 * recognise (a desktop window made narrow) sees both stores side by side.
 */
export function PhoneStoreAsk({
  className,
  rating = true,
  align = "start",
}: {
  className?: string;
  rating?: boolean;
  /** Line the rating and the other store up with the copy around the ask. */
  align?: "start" | "center";
}) {
  const center = align === "center";
  return (
    <div className={className}>
      {(["googlePlay", "appStore"] as const).map((store) => (
        <div key={store} data-store-pick={store} className={cn("flex-col", center ? "items-center" : "items-start")}>
          <StoreButton store={store} emphasis="solid" block />
          {rating ? <StoreRating store={store} className={cn("mt-4", center && "justify-center")} /> : null}
          <OtherStoreLink store={store === "googlePlay" ? "appStore" : "googlePlay"} className={rating ? "mt-1" : "mt-3"} />
        </div>
      ))}
      <div data-store-pick="none" className="grid-cols-[repeat(auto-fit,minmax(10.25rem,1fr))] gap-2.5">
        <StoreButton store="appStore" />
        <StoreButton store="googlePlay" />
      </div>
    </div>
  );
}

/** The store the visitor is not on, as a line of text: still one tap away
 *  for someone reading on a borrowed phone, without a second button. */
function OtherStoreLink({ store, className }: { store: StoreId; className?: string }) {
  const { t } = useTranslate();
  return (
    <a
      href={STORE_LINKS[store]}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 font-sans text-detail text-paper/60 transition-colors hover:text-paper",
        className,
      )}
    >
      {t(store === "appStore" ? "home.apps.appStorePre" : "home.apps.playPre")} {STORE_NAME[store]}
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3 rtl:-scale-x-100">
        <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

/** A phone drawn in CSS around a real screenshot of the app. */
export function PhoneFrame({
  src,
  alt,
  android,
  priority,
}: {
  src: string;
  alt: string;
  android?: boolean;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#0d0d0f] p-[9px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.65)] ring-1 ring-white/10",
        android ? "rounded-[34px]" : "rounded-[44px]",
      )}
    >
      {/* The screen: a status bar the camera sits in, as on a real phone,
          then the screenshot whole. The screenshots are taken without one,
          so without this strip the camera covered the app's own header. */}
      <div
        className={cn(
          "relative aspect-[390/891] w-full overflow-hidden bg-[#101013]",
          android ? "rounded-[26px]" : "rounded-[36px]",
        )}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 flex h-[5.3%] items-center justify-between px-[9%] font-sans text-[9px] font-semibold text-white/85">
          <span>{STATUS_TIME}</span>
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-[1.5px]">
              <span className="h-[3px] w-[2px] rounded-[1px] bg-white/85" />
              <span className="h-[5px] w-[2px] rounded-[1px] bg-white/85" />
              <span className="h-[7px] w-[2px] rounded-[1px] bg-white/85" />
            </span>
            <span className="h-[7px] w-[13px] rounded-[2px] border border-white/70 p-[1px]">
              <span className="block h-full w-[75%] rounded-[1px] bg-white/85" />
            </span>
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 aspect-[390/844]">
          {/* unoptimized: the screenshots are already pre-sized WebP, 55 and
              76 KB, and the local optimizer's first 256px encode of one of
              them hung and held the page's load event (2026-09-26). */}
          <Image src={src} alt={alt} fill unoptimized sizes="(min-width: 768px) 256px, 240px" className="object-cover object-top" priority={priority} />
        </div>
        {android ? (
          <span aria-hidden className="absolute left-1/2 top-[1.4%] h-[2.6%] w-auto aspect-square -translate-x-1/2 rounded-full bg-black" />
        ) : (
          <span aria-hidden className="absolute left-1/2 top-[1%] h-[3.3%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
        )}
      </div>
    </div>
  );
}

export function Stars({ label, count = 5, size = 13 }: { label: string; count?: number; size?: number }) {
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5 text-premium">
      {Array.from({ length: Math.round(count) }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

export function PhoneGlyph({ android, className }: { android?: boolean; className?: string }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("shrink-0", className ?? "text-paper/80")}
    >
      <rect x="6" y="2.5" width="12" height="19" rx={android ? 2.5 : 3.2} />
      {android ? <circle cx="12" cy="5.4" r="0.7" fill="currentColor" /> : <path d="M10.4 5h3.2" />}
      <path d="M10 18.5h4" />
    </svg>
  );
}
