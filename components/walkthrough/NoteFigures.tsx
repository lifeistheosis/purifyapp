"use client";

// Who a note introduces, under the note's own words (1.8, the owner's note of
// 2026-10-17: "add like icon photos, and then add even more ... like who Job
// is to the Orthodox Church"). The person's icon, small and square beside
// their title as the Church keeps it, their feast under it, then two or three
// plain sentences on what they are to the Church; a place's name and its
// line. All of it in the reader's language: the note around it is English
// for now, and says so (lang="en" on its words).
//
// Calm, as the sheet is: no box, no stripe, no label over the person, only
// the icon and the words. The icon is one the app already shows
// (lib/walkthroughs/people.ts), cut to the face by placing the picture in a
// box that clips it, so no new file is made. It is asked of the website in the
// apps (lib/media/streamed.ts), fades in when it has come (on the app's motion
// switch), and with no signal it is left out and the name stands alone. It is
// beside the name it shows, so it is hidden from a screen reader.

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { streamedUrl } from "@/lib/media/streamed";
import { feastDaysIn } from "@/lib/saints/feastDay";
import { notePerson, notePlace, portraitPlacement, type Portrait } from "@/lib/walkthroughs/people";

const pct = (n: number) => `${+n.toFixed(3)}%`;

function PortraitIcon({ portrait }: { portrait: Portrait }) {
  const src = streamedUrl(portrait.file);
  const [state, setState] = useState<"waiting" | "shown" | "gone">("waiting");
  const img = useRef<HTMLImageElement>(null);

  // A picture already in the cache can finish before React listens.
  useEffect(() => {
    const el = img.current;
    if (!el || !el.complete || !el.currentSrc) return;
    setState(el.naturalWidth > 1 ? "shown" : "gone");
  }, [src]);

  if (state === "gone") return null;
  const at = portraitPlacement(portrait);
  return (
    <span aria-hidden data-walk-portrait={state} className="relative block size-14 shrink-0 overflow-hidden rounded-[10px] bg-paper/[0.06]">
      {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are; the box shows one square of the picture. */}
      <img
        ref={img}
        src={src}
        alt=""
        decoding="async"
        onLoad={(e) => setState(e.currentTarget.naturalWidth > 1 ? "shown" : "gone")}
        onError={() => setState("gone")}
        className={cn(
          "absolute max-w-none motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out",
          state === "shown" ? "opacity-100" : "opacity-0",
        )}
        style={{ width: pct(at.width), height: pct(at.height), left: pct(at.left), top: pct(at.top) }}
      />
    </span>
  );
}

/** The person and the place a note introduces, if it introduces any. */
export function NoteFigures({ cardId }: { cardId: string }) {
  const { t, locale } = useTranslate();
  const person = notePerson(cardId);
  const place = notePlace(cardId);
  if (!person && !place) return null;
  // "Feast May 6", as a saint's own page writes it (components/saints/SaintHero.tsx).
  const feast = person ? [t("saints.feastLabel"), feastDaysIn([person.feast], locale, "long", t)].join(" ") : "";

  return (
    <>
      {person ? (
        <div data-walk-person={person.id} className="mt-6">
          <div className="flex items-center gap-3">
            {/* One picture per instance: the sheet keeps its body between notes. */}
            <PortraitIcon key={person.portrait.file} portrait={person.portrait} />
            <div className="min-w-0">
              <p className="font-serif text-body font-semibold leading-snug text-paper text-pretty">{t(person.nameKey)}</p>
              <p className="mt-0.5 font-sans text-caption text-paper/55">{feast}</p>
            </div>
          </div>
          <p className="mt-3 font-sans text-body leading-[1.6] text-paper/80">{t(person.churchKey)}</p>
        </div>
      ) : null}

      {place ? (
        <div data-walk-place={place.id} className="mt-5">
          <p className="font-sans text-caption font-semibold text-paper/55">{t(place.nameKey)}</p>
          <p className="mt-1 font-sans text-body leading-[1.6] text-paper/80">{t(place.lineKey)}</p>
        </div>
      ) : null}
    </>
  );
}
