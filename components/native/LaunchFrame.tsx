import { LIFT_AT_FIRST_PAINT } from "@/lib/platform/launchFrame";

/**
 * The outline the apps draw before any of their code has run, and the few
 * lines of script that lift the phone's logo screen once it is painted.
 * lib/platform/launchFrame.ts says why, what it costs, and how to take it out.
 *
 * A server component with nothing in it but boxes: it is written into the
 * apps' one document as plain markup, so the browser can paint it from the
 * document and the stylesheet alone.
 *
 * NO WORDS, and nothing that could be read as one. The apps are built in
 * English; a word here would be English on every phone until the app comes
 * up. The test and the walk both hold this.
 *
 * It covers the page, over everything, as the logo screen did, until <html>
 * carries data-launch="ready", which the app sets when its first screen is
 * drawn in the reader's language (NativeBridge). Then app/globals.css fades
 * it over the screen that has arrived under it. So that screen can come in
 * pieces unseen, as it did under the logo.
 *
 * The shapes follow Today, which is where the apps open: its top bar (the
 * one every tab wears since 1.7), the date and the greeting, the streak row,
 * the day's verse, the Pray row, and the tab bar (the 1.7 Today, the owner's
 * pick of 2026-10-15). They are
 * an outline, not a copy, and the surfaces are the page's own (night,
 * night-soft, paper), so each palette draws it in its own colours. The insets
 * are written out with env() because the classes that carry them (safe-pt,
 * safe-pb) only work once the app has marked the page as an app, and at first
 * paint it has not.
 */
export function LaunchFrame() {
  return (
    <>
      <div
        data-launch-frame=""
        aria-hidden="true"
        className="fixed inset-0 z-[200] overflow-hidden bg-night"
      >
        {/* Every size below is in rem, as Today's own are, and was set by
            measuring Today: the bar, the first card's top and the tab bar
            land within a few pixels of the real ones, and section 24 of
            scripts/export-walk.mjs holds them there, so the screen does not
            jump when Today takes over. The two cards are as tall as an
            ordinary day's. The verse card grows with a long verse and the
            outline does not know it. */}
        {/* The tab bar every tab wears (MobileHeader, 1.7): the title on
            the left; the Premium pill, the streak's flame and count (1.7.1),
            then the search and the bell, each a 22px mark in a 44px box, on
            the right. Its rows and paddings are the bar's own, so it ends on
            the bar's hairline. */}
        <div className="border-b border-paper/8 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]">
          <div className="flex h-11 items-center justify-between gap-2 ps-5 pe-[9px] md:mx-auto md:w-full md:max-w-[760px] lg:max-w-[880px]">
            <div className="h-4 w-12 rounded bg-paper/10" />
            <div className="flex items-center">
              <div className="me-0.5 h-8 w-[4.625rem] rounded-full bg-paper/8" />
              <div className="grid h-11 w-10 place-items-center">
                <div className="h-[17px] w-6 rounded-full bg-paper/6" />
              </div>
              <div className="grid h-11 w-11 place-items-center">
                <div className="size-[22px] rounded-full bg-paper/6" />
              </div>
              <div className="grid h-11 w-11 place-items-center">
                <div className="size-[22px] rounded-full bg-paper/6" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 pt-3.5 md:mx-auto md:w-full md:max-w-[760px] lg:max-w-[880px]">
          <div className="h-3 w-36 rounded bg-paper/6" />
          <div className="mt-2.5 h-7 w-56 rounded bg-paper/10" />
          <div className="mt-2.5 h-3 w-44 rounded bg-paper/6" />
          <div className="mt-6 h-[3.625rem] rounded-[17px] border border-paper/8 bg-night-soft" />
          <div className="mt-4 h-[19.5rem] rounded-[28px] border border-paper/8 bg-night-soft" />
          <div className="mt-8 h-3 w-12 rounded bg-paper/6" />
          <div className="mt-3 h-[11.8rem] w-[18.25rem] rounded-[28px] border border-paper/8 bg-night-soft" />
        </div>
        <div className="absolute inset-x-0 bottom-0 px-3 pb-[env(safe-area-inset-bottom,0px)]">
          <div className="mx-auto mb-1.5 h-[4.5rem] max-w-md rounded-3xl border border-paper/10 bg-night-soft" />
        </div>
      </div>
      {/* After the outline, so it is in the document before this runs. No
          nonce: the apps' export has none and needs none (app/layout.tsx). */}
      <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: LIFT_AT_FIRST_PAINT }} />
    </>
  );
}
