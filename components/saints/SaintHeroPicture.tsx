"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { cn } from "@/lib/cn";
import { avifFor } from "@/lib/media/streamed";

/**
 * The picture at the top of a saint's page (1.7, the owner's note 19).
 *
 * With a hero (lib/saints/heroes.ts), on a phone: the icon fills the screen's
 * width from its very top, under the clear top bar, four wide by five tall,
 * and melts into the page below the name. It is a picture on the website,
 * fetched by the apps; until it arrives, and if it cannot (no signal), the
 * icon the app carries stands in the same box at its own size, between the
 * bar and the name and clear of both (`.hero-stand-in`, app/globals.css),
 * smaller only where the box is too short to hold it.
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
 * It is asked for as AVIF first, about 40% lighter (1.7.2), and as its JPEG
 * when the AVIF cannot be had.
 *
 * FADE AND DOORS (1.8, round 3b D, the owner's pick of 2026-10-27): the icon
 * fades in at the top as the page opens (`.saint-icon-in`, still on the
 * motion switch), nine wide by ten tall on a phone, the shape the design
 * drew, with a deeper shade under the bar and the name set over its foot.
 *
 * THE CARD'S ICON LANDS ON THE ICON (1.9, P2; the arbiter's call of
 * 2026-11-11: "where the saint's page shows his icon anywhere, the card's
 * icon flies to it"). A saint with a hero opened with nothing to take the
 * icon of the card that was tapped: the wide picture is another picture,
 * with the name over it, so the card's icon left with its page. But his page
 * does show his icon: the one the app carries stands in the box until the
 * wide picture has come. That icon takes the card's (lib/ui/routeMotion.ts,
 * "A picture that leads to its own page"), and the wide picture waits for it
 * to land before it comes in over it. A hero the phone already holds arrives
 * within a frame, and the icon in flight is drawn from the icon it is landing
 * on: shown at once, the wide picture took that icon away and the card's icon
 * faded out half way there (seen in the film, 2026-11-11). So for the length
 * of the flight the wide picture is held back, on a page an icon travelled
 * to; any other page shows it the moment it has come, as before. With no
 * signal the icon simply stays. Going back, the same icon goes back into its
 * card.
 */

/**
 * How long a picture travels (app/globals.css, `::view-transition-group(carried)`,
 * 320ms), and a frame more. lib/saints/__tests__/heroPicture.test.ts holds the
 * two together.
 */
export const FLIGHT_MS = 340;
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
  const box = useRef<HTMLDivElement>(null);
  const opened = useRef(0);
  const landing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(false);
  const [again, setAgain] = useState(false);
  const [jpegOnly, setJpegOnly] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avif = hero ? avifFor(hero.src) : null;

  // When the page was drawn, which is when a picture that travels to it sets out.
  useLayoutEffect(() => {
    opened.current = performance.now();
  }, []);

  // The wide picture is shown; on a page the card's icon travelled to, not
  // before that icon has landed. The page switch marks what a picture lands
  // on while it wears the name and after (`data-carried-in`, `data-landed`;
  // lib/ui/routeMotion.ts), and it has done so by the time any picture can
  // have loaded.
  const reveal = () => {
    const icon = box.current?.querySelector<HTMLElement>("[data-hero-stand-in]");
    const travelledTo = Boolean(icon && ("carriedIn" in icon.dataset || "landed" in icon.dataset));
    const wait = travelledTo ? opened.current + FLIGHT_MS - performance.now() : 0;
    if (landing.current) clearTimeout(landing.current);
    if (wait <= 0) {
      setShown(true);
      return;
    }
    landing.current = setTimeout(() => setShown(true), wait);
  };

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
    if (img.naturalWidth > 0) reveal();
    // An AVIF that failed before the page woke: the JPEG next, as onError does.
    else if (avif && !jpegOnly && img.currentSrc.endsWith(".avif")) setJpegOnly(true);
    else fail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [again]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (landing.current) clearTimeout(landing.current);
  }, []);

  if (hero) {
    return (
      <div
        ref={box}
        data-saint-hero="picture"
        className={cn(
          "saint-icon-in under-topbar relative -mx-5 aspect-[9/10] max-h-[70svh] overflow-hidden",
          "md:mx-0 md:mt-0 md:aspect-[4/5] md:max-h-none md:w-full md:rounded-[14px] md:ring-1 md:ring-inset md:ring-paper/10",
          !failed && "picture-melt",
        )}
      >
        {iconUrl ? (
          // The app's own icon, as it is, standing in until the hero comes:
          // it too arrives whole (build 85, note 52), and goes as the hero does.
          <ArrivingImage
            src={iconUrl}
            alt={failed ? alt : ""}
            aria-hidden={failed ? undefined : true}
            decoding="async"
            // The icon of the card that opened this page travels here, and
            // back from here: his icon, which the page shows until the wide
            // picture is over it (1.9, P2).
            data-hero-stand-in=""
            data-carry-into={iconUrl}
            className={cn(
              "hero-stand-in absolute inset-0 m-auto h-[240px] max-h-[70%] w-auto rounded-[10px] ring-1 ring-paper/10",
              shown ? "opacity-0" : "opacity-100",
            )}
          />
        ) : null}
        {failed ? null : (
          <picture className="contents">
            {avif && !jpegOnly ? <source type="image/avif" srcSet={avif} /> : null}
            <img
              key={`${again ? "again" : "first"}${jpegOnly ? "#jpeg" : ""}`}
              ref={ref}
              src={hero.src}
              alt={alt}
              width={hero.width}
              height={hero.height}
              decoding="async"
              fetchPriority="high"
              onLoad={(e) => {
                // Shown once it is decoded too, so it never paints in bands
                // (build 85, note 52, the rule of lib/ui/useArrivingImage.ts).
                const done = () => reveal();
                e.currentTarget.decode().then(done, done);
              }}
              onError={(e) => {
                if (avif && !jpegOnly && e.currentTarget.currentSrc.endsWith(".avif")) setJpegOnly(true);
                else fail();
              }}
              data-hero-picture={shown ? "shown" : "waiting"}
              className={cn(
                "absolute inset-0 h-full w-full object-cover object-top motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-out",
                shown ? "opacity-100" : "opacity-0",
              )}
            />
          </picture>
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-night/80 to-transparent md:hidden"
        />
      </div>
    );
  }

  if (!iconUrl) return null;
  return (
    <div data-saint-hero="plate" className="saint-icon-in flex justify-center pt-6 md:block md:pt-0">
      {/* The app's own icon, as it is: whole or not yet at all (build 85, note 52). */}
      <ArrivingImage
        src={iconUrl}
        alt={alt}
        decoding="async"
        fetchPriority="high"
        // The icon of the card that opened this page travels here: the same
        // icon, larger (lib/ui/routeMotion.ts, 1.9). On a page with a wide
        // picture it travels to the icon that stands in for it, above; never
        // into the wide picture, which is another picture with the name over it.
        data-carry-into={iconUrl}
        className="h-[260px] w-auto rounded-[12px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-paper/10 md:h-[300px]"
      />
    </div>
  );
}
