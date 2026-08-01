import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

/**
 * Covers the server leg of /prayers. Inside the native export most of the
 * wait is on the device instead (PrayersMobile resolves the day client-side),
 * so this is the web half of the fix; the eyebrow placeholder below is the
 * part that matters on both, because the real eyebrow renders a single space
 * until the date resolves.
 */
export default function PrayersLoading() {
  return (
    <div className="bg-night">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <Skeleton weight="strong" className="h-6 w-28" />
        <div className="flex shrink-0 items-center gap-3">
          <Skeleton weight="mid" rounded="rounded-pill" className="h-7 w-20" />
          <Skeleton weight="strong" rounded="rounded-full" className="h-8 w-8" />
        </div>
      </div>

      <div className="cascade cascade-tight px-5 pt-6 pb-10">
        {/* The long date eyebrow. */}
        <Skeleton weight="faint" className="h-3 w-40" />

        {/* The Deesis plate. */}
        <Skeleton weight="mid" rounded="rounded-2xl" className="mt-4 aspect-[16/9] w-full" />

        {/* The quiet masthead: eyebrow, heading, attribution, rule, the line
            for the hour. */}
        <div className="mt-7 flex flex-col items-center gap-3">
          <Skeleton weight="faint" className="h-3 w-24" />
          <Skeleton weight="strong" className="h-7 w-[70%] max-w-[320px]" />
          <Skeleton weight="faint" className="h-3 w-32" />
          <Skeleton weight="faint" className="mt-3 h-4 w-[85%] max-w-[420px]" />
        </div>

        {/* The prayer of the heart, three centred lines. */}
        <div className="mt-10 flex flex-col items-center gap-2">
          <Skeleton weight="mid" className="h-5 w-[80%] max-w-[380px]" />
          <Skeleton weight="mid" className="h-5 w-[70%] max-w-[340px]" />
          <Skeleton weight="mid" className="h-5 w-[55%] max-w-[280px]" />
        </div>

        {/* The rules index. */}
        <SkeletonList rows={5} className="mt-10" />
      </div>
    </div>
  );
}
