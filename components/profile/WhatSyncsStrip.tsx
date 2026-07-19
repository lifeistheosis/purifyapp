import { T } from "@/components/i18n/T";
/**
 * Three small cards explaining what travels across devices with a Purify
 * account. Lives under the SignInPanel on the signed-out /account page,
 * plus a single italic privacy reassurance line below. Server component;
 * no client state.
 */
export function WhatSyncsStrip() {
  const ITEMS: { label: string; body: string }[] = [
    {
      label: "Highlights & notes",
      body: "Verse and paragraph highlights, the notes you write alongside them.",
    },
    {
      label: "Bookmarks",
      body: "Verses, chapters, and saint-writing sections you've kept.",
    },
    {
      label: "Diptychs",
      body: "The names you carry — the living and the reposed — in your prayers.",
    },
  ];
  return (
    <section className="mt-10">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
        <T k="ui.whatSyncs" />
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ITEMS.map((it) => (
          <li
            key={it.label}
            className="rounded-md border border-paper/12 bg-paper/[0.03] px-4 py-4"
          >
            <p className="font-display-serif text-body text-paper leading-tight">
              {it.label}
            </p>
            <p className="mt-1.5 font-sans text-caption text-paper/65 leading-[1.55]">
              {it.body}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-5 font-serif italic text-ui text-paper/55 leading-[1.6]">
        <T k="ui.noPasswordToRememberNo" />
      </p>
    </section>
  );
}
