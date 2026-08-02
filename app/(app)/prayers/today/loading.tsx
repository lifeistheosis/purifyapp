import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

/**
 * Covers the server leg of /prayers/today.
 *
 * Without this file the route falls back to app/(app)/prayers/loading.tsx,
 * which is shaped for the mobile /prayers index: a centred plate at
 * `aspect-[16/9] w-full`, which on a 1440px desktop is a 1383x778 pulsing
 * grey rectangle, followed by three centred bars and a five-row list. It
 * looked nothing like the page that replaced it.
 *
 * The container and grid class strings here are copied from
 * PrayersTodayClient on purpose, so the placeholder occupies the same
 * columns the real page will.
 */
export default function TodayLoading() {
  return (
    <div className="bg-night">
      <div className="mx-auto w-full max-w-[680px] px-5 py-10 md:px-8 md:py-12 lg:max-w-[1240px] lg:pb-24">
        {/* Masthead: eyebrow, two heading lines, the tone hairline. */}
        <div className="mb-9 lg:mb-11">
          <Skeleton weight="faint" className="h-3 w-16" />
          <Skeleton
            weight="strong"
            className="mt-2.5 h-[42px] w-[280px] max-w-full"
          />
          <Skeleton
            weight="mid"
            className="mt-1 h-[42px] w-[380px] max-w-full"
          />
          <div aria-hidden className="mt-6 h-px w-full bg-paper/12" />
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-x-10">
          <div className="min-w-0">
            {/* The act band. */}
            <Skeleton
              weight="faint"
              rounded="rounded-lg"
              className="h-[186px] w-full"
            />
            {/* The day's word. */}
            <Skeleton
              weight="mid"
              rounded="rounded-[28px]"
              className="mt-10 h-[300px] w-full"
            />
            {/* The prayer index. */}
            <SkeletonList rows={4} className="mt-12" />
          </div>

          {/* The Church today: four rail cards. */}
          <div className="mt-14 min-w-0 space-y-3.5 lg:mt-0">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                weight="faint"
                rounded="rounded-2xl"
                className="h-[104px] w-full"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
