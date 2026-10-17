"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

/**
 * The picture at the top of a saint's page (1.7, the owner's note 19).
 *
 * With a hero (lib/saints/heroes.ts), on a phone: the icon fills the screen's
 * width from its very top, under the clear top bar, four wide by five tall,
 * and melts into the page below the name. It is a picture on the website,
 * fetched by the apps; until it arrives, and if it cannot (no signal), the
 * icon the app carries stands in the middle of the same box at its own size.
 * A short shade at the top keeps the clock and the bar's buttons readable.
 * On a tablet and a computer it is a rounded picture beside the name.
 *
 * Without a hero: the carried icon at its own size, 260px tall at most,
 * never enlarged: an icon 420 pixels tall across a phone's width is the
 * "super blurry photo" the owner sent back. No icon at all: nothing.
 *
 * ONE ARRIVAL (1.7.1: the owner saw the picture "load in sporadically" in
 * the app). The hero waits unseen until it has loaded, then fades in over
 * the icon as the icon fades out (on the app's motion switch,
 * `motion-safe:`), so it never draws itself down the screen or pops in. A
 * hero that fails is asked for once more, quietly, before the icon stays.
 */
export function SaintHeroPicture({
  name,
  iconUrl,
  hero,
}: {
  name: string;
  iconUrl?: string;
  /** The hero's address (the website's, in the apps) and its pixels. */
  hero?: { src: string; width: number; height: number } | null;
}) {
  const { t } = useTranslate();
  const alt = t("saints.iconAlt", { name });
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(false);
  const [again, setAgain] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fail = () => {
    if (again) {
      setFailed(true);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAgain(true), 2500);
  };

  // A picture that loaded or failed before the page could listen (the
  // website's first paint) is read from the <img> itself, so a broken image
  // never shows and a loaded one is not held back.
  useEffect(() => {
    const img = ref.current;
    if (!img || !img.complete || !img.currentSrc) return;
    if (img.naturalWidth > 0) setShown(true);
    else fail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [again]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (hero) {
    return (
      <div
        data-saint-hero="picture"
        className={cn(
          "under-topbar relative -mx-5 aspect-[4/5] max-h-[70svh] overflow-hidden",
          "md:mx-0 md:mt-0 md:max-h-none md:w-full md:rounded-[14px] md:ring-1 md:ring-inset md:ring-paper/10",
          !failed && "picture-melt",
        )}
      >
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- the app's own icon, as it is.
          <img
            src={iconUrl}
            alt={failed ? alt : ""}
            aria-hidden={failed ? undefined : true}
            decoding="async"
            className={cn(
              "absolute inset-0 m-auto h-[240px] max-h-[70%] w-auto rounded-[10px] ring-1 ring-paper/10 motion-safe:transition-opacity motion-safe:duration-500",
              shown ? "opacity-0" : "opacity-100",
            )}
          />
        ) : null}
        {failed ? null : (
          // eslint-disable-next-line @next/next/no-img-element -- streamed from the website, served as it is.
          <img
            key={again ? "again" : "first"}
            ref={ref}
            src={hero.src}
            alt={alt}
            width={hero.width}
            height={hero.height}
            decoding="async"
            fetchPriority="high"
            onLoad={() => setShown(true)}
            onError={fail}
            data-hero-picture={shown ? "shown" : "waiting"}
            className={cn(
              "absolute inset-0 h-full w-full object-cover object-top motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-out",
              shown ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-night/60 to-transparent md:hidden"
        />
      </div>
    );
  }

  if (!iconUrl) return null;
  return (
    <div data-saint-hero="plate" className="flex justify-center pt-6 md:block md:pt-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- the app's own icon, as it is. */}
      <img
        src={iconUrl}
        alt={alt}
        decoding="async"
        fetchPriority="high"
        className="h-[260px] w-auto rounded-[12px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-paper/10 md:h-[300px]"
      />
    </div>
  );
}
