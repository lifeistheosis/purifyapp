import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ReadingModeGallery } from "@/components/settings/ReadingModeGallery";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Reading mode",
  description: "Every palette Purify can be read in: Dark, Light and True black, the Purify Plus looks by family, and the two earned by reading.",
};

/**
 * Server shell only, like Settings itself: which palette is on is held on the
 * device, so the body is a client component (under `output: "export"` a
 * server component has no localStorage to read).
 *
 * The page Settings' Reading mode row opens (1.9): every palette, a shelf for
 * each family (components/settings/ReadingModeGallery.tsx).
 */
export default function ReadingModePage() {
  return (
    <>
      <MobileTopBar titleKey="ui.readingMode" back backFallback="/settings" />
      {/* 16px at a phone's sides, as Settings is drawn: each shelf runs to
          the screen's edges from there, and its heading sits a little inside. */}
      <section className="bg-night min-h-screen px-4 py-6 md:px-8 md:py-16">
        <article className="mx-auto w-full max-w-[720px]">
          {/* Desktop only: on a phone the bar above already says it. */}
          <header className="mb-10 hidden md:block native-md-hidden">
            <h1 className="font-display-serif text-heading text-paper leading-[1.05]">
              <T k="ui.readingMode" />
            </h1>
          </header>
          <div>
            <ReadingModeGallery />
          </div>
        </article>
      </section>
    </>
  );
}
