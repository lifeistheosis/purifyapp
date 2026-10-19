// Start here: seven steps for someone new to Orthodoxy, each a link to a
// screen the app already has (lib/start/steps.ts), and since 1.7 the guide
// for a first Divine Liturgy after them.
//
// A phone page first (the owner's note 27 of 2026-10-16, "every part phone
// first and better looking", and his pattern 1 across the notes): the icon
// at the top, the page's name and its one line, then its parts as clear
// sections. The order is the page's argument: the steps end at a parish, and
// the guide takes the reader into its Liturgy. The words are the ones the
// owner approved on 2026-10-12, unchanged; "New to Orthodoxy?" now opens the
// page's line instead of standing over its name as a label.
//
// The icon is the Sinai Pantocrator the Discover tile for this page shows,
// the Prayers section's own file (lib/media/sections.ts), cut close to the
// face and inside the white of the scan since 1.7.1, shown whole on its plate
// and never enlarged past its pixels: nothing new ships for it.
//
// A server component, with the reader's own state (the guide's card) in a
// client island. Nothing else here needs the device, so the page is plain
// HTML in the native export and opens with no network. The words go through
// <T> so they follow a language switch inside the apps.

import Link from "next/link";

import { T } from "@/components/i18n/T";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { sectionMedia } from "@/lib/media/sections";
import { START_STEPS } from "@/lib/start/steps";

import { FirstLiturgyCard } from "./FirstLiturgyCard";

export function StartHere() {
  const icon = sectionMedia("prayers");
  return (
    <section className="bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14">
      <div className="mx-auto w-full max-w-[720px]">
        <header className="flex flex-col items-center text-center">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are.
            <img
              src={icon.src}
              alt={icon.alt}
              width={icon.width}
              height={icon.height}
              decoding="async"
              className="h-auto w-[min(168px,44vw)] rounded-[14px] bg-night-soft ring-1 ring-inset ring-paper/10 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]"
            />
          ) : null}
          <h1
            id="start-title"
            className="mt-7 font-serif text-display-sm font-bold leading-[1.08] tracking-[-0.02em] text-paper md:text-display"
          >
            <T k="start.title" />
          </h1>
          {/* The question the page answers opens its one line, rather than
              sitting over the heading as a label. */}
          <p className="mt-4 max-w-[46ch] font-sans text-body leading-[1.6] text-paper/70">
            <span className="font-semibold text-paper/85">
              <T k="start.eyebrow" />
            </span>{" "}
            <T k="start.intro" />
          </p>
        </header>

        {/* An ordered list: the order is the point, and a screen reader says
            "1 of 7" without being told to. The numeral sits large and quiet
            beside each step, the way a chapter number sits in a margin. */}
        <ol className="mt-10 divide-y divide-paper/[0.07] border-y border-paper/[0.08]">
          {START_STEPS.map((step, i) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="tap-press group flex min-h-[72px] items-center gap-4 py-4 active:bg-paper/[0.04]"
              >
                <span
                  aria-hidden
                  className="w-8 shrink-0 text-center font-serif text-title font-semibold leading-none text-paper/35 motion-safe:transition-colors group-hover:text-paper/60"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-body font-semibold leading-snug text-paper/90 motion-safe:transition-colors group-hover:text-paper">
                    <T k={step.titleKey} />
                  </span>
                  <span className="mt-1 block font-sans text-detail leading-snug text-paper/60">
                    <T k={step.bodyKey} />
                  </span>
                </span>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-paper/40 motion-safe:transition-colors group-hover:text-paper/70 rtl:-scale-x-100"
                />
              </Link>
            </li>
          ))}
        </ol>

        <FirstLiturgyCard />

        <p className="mx-auto mt-12 max-w-[52ch] text-center font-serif italic text-detail leading-[1.65] text-paper/60">
          <T k="start.closing" />
        </p>
      </div>
    </section>
  );
}
