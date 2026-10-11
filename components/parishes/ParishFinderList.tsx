// Find a parish: the parish directories of the Orthodox jurisdictions, as a
// list of links out. The addresses and the rules for what may be listed are
// in lib/parishes/finders.ts.
//
// Drawn like the Heresies index (app/(app)/heresies/page.tsx): a short
// header, then one ruled group per region with a small uppercase label over
// it. One tree for phone and desktop, since a list of names needs no second
// layout.
//
// A server component on purpose. Nothing here needs the device, so the whole
// list is plain HTML in the native export and readable with no network; only
// the outside sites need one. The chrome goes through <T> so it follows a
// language switch inside the apps. Names of the bodies and the line under
// each stay as the data has them, as a council's place and year do.

import { T } from "@/components/i18n/T";
import { Eyebrow } from "@/components/ui/Graphite";
import { findersByRegion } from "@/lib/parishes/finders";

// The mark at the end of each row: an arrow leaving to the upper right.
// Drawn, not typed. The typed arrow is not in the subsets the app's own
// fonts load, so the phone picks a fallback for it, and on some phones that
// fallback is the colour emoji, on every row of the list.
function OutArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export function ParishFinderList() {
  const groups = findersByRegion();

  return (
    <section className="bg-night px-5 md:px-8 py-10 md:py-14">
      <div className="mx-auto w-full max-w-[820px]">
        <header>
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/55">
            <T k="nav.discover" />
          </p>
          <h1 className="mt-3 font-serif text-display-sm md:text-display font-bold leading-[1.08] tracking-[-0.02em] text-paper">
            <T k="parishes.title" />
          </h1>
          <p className="mt-5 max-w-[64ch] font-serif text-body text-paper/80 leading-[1.75]">
            <T k="parishes.intro" />
          </p>
          <p className="mt-3 max-w-[64ch] font-sans text-detail text-paper/55 leading-[1.6]">
            <T k="parishes.leaving" />
          </p>
        </header>

        <div className="mt-10 space-y-10">
          {groups.map(({ region, finders }) => {
            const headingId = `parishes-${region.id}`;
            return (
              // Named from its own label so each group is a landmark a screen
              // reader can jump to, and the name stays translated.
              <section key={region.id} aria-labelledby={headingId}>
                {/* The house Eyebrow at level 2, not an h2 tag: globals.css
                    sets every h1 to h6 in the heading serif at 700,
                    unlayered, so the small sans label cannot be drawn on a
                    real heading. This keeps the outline and the look. */}
                <Eyebrow
                  id={headingId}
                  level={2}
                  className="border-b border-paper/[0.08] pb-2 text-eyebrow tracking-[2px] text-paper/55"
                >
                  <T k={region.labelKey} />
                </Eyebrow>
                <ul className="divide-y divide-paper/[0.07]">
                  {finders.map((f) => (
                    <li key={f.url}>
                      {/* A plain anchor in a new context, the way the app
                          opens every outside page (the Footer, a history
                          source, SoftTile's `external`). Inside the apps the
                          shell hands an outside address to the system
                          browser, so the directory opens outside Purify and
                          this list is still here when the reader comes back. */}
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-4 py-4 transition-colors active:bg-paper/[0.04]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-serif text-body font-semibold leading-snug text-paper/90 transition-colors group-hover:text-paper">
                            {f.name}
                          </span>
                          <span className="mt-1 block font-sans text-caption leading-snug text-paper/65">
                            {f.serves}
                          </span>
                        </span>
                        <span aria-hidden className="shrink-0 text-paper/40 transition-colors group-hover:text-paper/70">
                          <OutArrow />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
