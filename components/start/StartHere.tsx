// Start here: seven steps for someone new to Orthodoxy, each a link to a
// screen the app already has. The steps and why they are these seven are in
// lib/start/steps.ts.
//
// Drawn like Find a parish (components/parishes/ParishFinderList.tsx): a
// short header, then one ruled list. One tree for phone and desktop.
//
// A server component on purpose. Nothing here needs the device, so the whole
// page is plain HTML in the native export and opens with no network. The
// words go through <T> so they follow a language switch inside the apps.

import Link from "next/link";

import { T } from "@/components/i18n/T";
import { START_STEPS } from "@/lib/start/steps";

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function StartHere() {
  return (
    <section className="bg-night px-5 md:px-8 py-10 md:py-14">
      <div className="mx-auto w-full max-w-[820px]">
        <header>
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
            <T k="start.eyebrow" />
          </p>
          <h1 className="mt-3 font-serif text-display-sm md:text-display font-bold leading-[1.08] tracking-[-0.02em] text-paper">
            <T k="start.title" />
          </h1>
          <p className="mt-5 max-w-[60ch] font-serif text-body text-paper/80 leading-[1.75]">
            <T k="start.intro" />
          </p>
        </header>

        {/* An ordered list: the order is the point, and a screen reader says
            "1 of 7" without being told to. The numeral is drawn large and
            quiet beside each step, the way a chapter number sits in a margin. */}
        <ol className="mt-10 divide-y divide-paper/[0.07] border-y border-paper/[0.08]">
          {START_STEPS.map((step, i) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="tap-press group flex items-center gap-4 py-5 transition-colors active:bg-paper/[0.04]"
              >
                <span
                  aria-hidden
                  className="w-9 shrink-0 text-center font-serif text-title font-semibold leading-none text-paper/35 transition-colors group-hover:text-paper/60"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-body font-semibold leading-snug text-paper/90 transition-colors group-hover:text-paper">
                    <T k={step.titleKey} />
                  </span>
                  <span className="mt-1 block font-sans text-caption leading-snug text-paper/65">
                    <T k={step.bodyKey} />
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-paper/40 transition-colors group-hover:text-paper/70">
                  <Chevron />
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <p className="mt-8 max-w-[60ch] font-serif italic text-detail text-paper/60 leading-[1.65]">
          <T k="start.closing" />
        </p>
      </div>
    </section>
  );
}
