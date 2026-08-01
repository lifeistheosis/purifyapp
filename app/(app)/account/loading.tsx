import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

/**
 * Covers the server leg of /account, which awaits the Supabase session before
 * it can render. In the native export the session resolves on the device
 * instead, and that wait is covered by YouMobile's own loading branch; this is
 * the web half of the same fix.
 */
export default function AccountLoading() {
  return (
    <div className="bg-night">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <Skeleton weight="strong" className="h-6 w-20" />
        <div className="flex shrink-0 items-center gap-3">
          <Skeleton weight="mid" rounded="rounded-pill" className="h-7 w-20" />
          <Skeleton weight="strong" rounded="rounded-full" className="h-8 w-8" />
        </div>
      </div>

      <div className="cascade cascade-tight px-5 pt-6 pb-10">
        {/* The email eyebrow. */}
        <Skeleton weight="faint" className="h-3 w-48" />

        {/* The Ladder plate. */}
        <Skeleton weight="mid" rounded="rounded-2xl" className="mt-4 aspect-[16/9] w-full" />

        {/* Hero card: name, member since, a line of copy, the avatar. */}
        <Skeleton weight="mid" rounded="rounded-2xl" className="mt-6 h-[164px] w-full" />

        {/* "Your reading": four counters. */}
        <div className="mt-7">
          <Skeleton weight="strong" className="h-3 w-28" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} weight="faint" rounded="rounded-2xl" className="h-[76px]" />
            ))}
          </div>
        </div>

        {/* The settings rows. */}
        <SkeletonList rows={4} className="mt-7" />
      </div>
    </div>
  );
}
