import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { DayTimeline } from "@/components/prayers/DayTimeline";

export const metadata = {
  title: "The Hours",
  description:
    "The Liturgical Hours, short prayers that sanctify the day. First, Third, Sixth, Ninth, and Compline.",
};

// The Hours as the day (1.7, the owner's note 16): the five down one line,
// the one the clock is in lit, each with its icon, the hour it is read at and
// how long it is. The timeline is a client child on purpose: it reads the
// clock after mount, and this page ships into the static export, where a
// server-rendered "now" would bake the build hour into the APK.
export default function HoursPage() {
  return (
    <>
      <MobileTopBar titleKey="ui.theHours" back backFallback="/prayers" revealTitleOn="hours-title" />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14" aria-labelledby="hours-title">
        <div className="mx-auto w-full max-w-[640px]">
          <header>
            <h1 id="hours-title" className="text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading">
              <T k="ui.theHours" />
            </h1>
            <p className="mt-2 font-sans text-detail text-paper/55">
              <T k="prayers.hours.meta" />
            </p>
            <p className="mt-5 max-w-[60ch] font-sans text-ui leading-[1.65] text-paper/70">
              <T k="prayers.hoursIndex.intro" />
            </p>
          </header>

          <DayTimeline variant="hours" className="mt-8" />

          <p className="mt-12 border-t border-paper/10 pt-6 font-sans text-caption leading-[1.7] text-paper/50">
            <T k="prayers.hoursIndex.note" />
          </p>
        </div>
      </section>
    </>
  );
}
