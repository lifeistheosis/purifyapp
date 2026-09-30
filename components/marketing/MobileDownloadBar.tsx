"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Close } from "@/components/ui/icons/Close";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { STORE_LINKS, STORE_RATINGS } from "@/lib/marketing/storeRatings";
import { useMobileStore } from "@/lib/platform/mobileWeb";
import { Stars, STORE_NAME } from "./storeBits";

const DISMISS_KEY = "purify.downloadBar.dismissed";

/** The name on the home screen, the same in every language. */
const APP_NAME = "Purify";

/**
 * The front page's download bar on a phone: the app, its rating, and one
 * button to the visitor's own store, held at the bottom of the screen while
 * they read about Purify.
 *
 * It keeps out of the way of the page's own store buttons: whenever the
 * hero's, the apps section's or the closing section's buttons (anything
 * marked data-store-cta) or the footer are on screen, it steps down, so the
 * page never shows two asks at once. Dismissed, it stays gone for the visit.
 *
 * Phones and tablets in a browser only (useMobileStore); the store apps and
 * desktops never render it.
 */
export function MobileDownloadBar() {
  const { t } = useTranslate();
  const store = useMobileStore();
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!store || dismissed) return;
    const watched = [...document.querySelectorAll("[data-store-cta], footer")];
    if (watched.length === 0) return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        // Past the hero, and no other ask on screen.
        const pastHero = window.scrollY > window.innerHeight * 0.5;
        setShown(pastHero && visible.size === 0);
      },
      { threshold: 0 },
    );
    watched.forEach((el) => io.observe(el));
    // The observer only fires on crossings; scrolling within the gap between
    // two asks also has to re-check "past the hero".
    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.5;
      setShown(pastHero && visible.size === 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [store, dismissed]);

  if (!store || dismissed) return null;
  const r = STORE_RATINGS[store];
  // The width the whole line needs with the store's name in it, measured at
  // the caption size: in px, since a rem here would follow the page's own
  // root size rather than the text's.
  const fitStore = store === "googlePlay" ? "@max-[118px]:hidden" : "@max-[108px]:hidden";

  return (
    <div
      className={cn(
        "md:hidden fixed inset-x-3 z-40 transition-[transform,opacity] duration-500 ease-house motion-reduce:translate-y-0 motion-reduce:transition-opacity",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[140%] opacity-0",
      )}
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      aria-hidden={!shown}
    >
      <div className="flex items-center gap-3 rounded-[20px] bg-night/85 py-2 pl-2.5 pr-1.5 ring-1 ring-inset ring-paper/12 shadow-[0_14px_36px_-10px_rgba(0,0,0,0.7)] backdrop-blur-md">
        <Image src="/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-[11px] ring-1 ring-paper/15" />
        {/* A container, so the store's name steps out whole when the button
            beside it (longer in some languages) or a narrow phone leaves no
            room, rather than being cut to "Goo...". */}
        <div className="@container min-w-0 flex-1 leading-tight">
          <p className="font-sans text-detail font-semibold text-paper">{APP_NAME}</p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <Stars label={t("home.apps.outOfFive", { rating: r.rating.toFixed(1) })} count={1} size={11} />
            <span className="shrink-0 font-sans text-caption tabular-nums text-paper/60">{r.rating.toFixed(1)}</span>
            <span aria-hidden className={cn("h-1 w-1 shrink-0 rounded-full bg-paper/25", fitStore)} />
            <span className={cn("min-w-0 truncate font-sans text-caption text-paper/60", fitStore)}>{STORE_NAME[store]}</span>
          </p>
        </div>
        <a
          href={STORE_LINKS[store]}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={shown ? 0 : -1}
          className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-pill bg-paper px-4 font-sans text-caption font-semibold text-on-paper transition-colors hover:bg-paper/90 active:scale-[0.98]"
        >
          {t("home.getApp")}
        </a>
        <button
          type="button"
          tabIndex={shown ? 0 : -1}
          aria-label={t("translationDisclaimer.dismiss")}
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-paper/50 transition-colors hover:text-paper"
        >
          <Close size={14} />
        </button>
      </div>
    </div>
  );
}
