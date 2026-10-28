import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Discover is an `async` server component: it awaits the locale and the full
 * topic registry before it can render anything, and until now that wait was a
 * blank night surface. This mirrors the real shape of the screen, so the swap
 * to content is a change of contents rather than a change of layout.
 *
 * The shape is the gallery of 1.8 (the owner's pick of 2026-10-27, round 7b,
 * D): the search field, then the library as wide bands, one under another
 * (components/mobile/DiscoverMobile.tsx, components/ui/GalleryBand.tsx). It
 * drew the Menologion plate and a grid of tiles until then, which the screen
 * had not shown since 1.7.
 *
 * `cascade cascade-tight` for the same reason: the placeholders arrive in the
 * same order and at the same pace the real rows will.
 */
export default function DiscoverLoading() {
  return (
    <div className="bg-night">
      {/* Header strip: the title, the Premium pill, search and the bell. */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <Skeleton weight="strong" className="h-6 w-32" />
        <div className="flex shrink-0 items-center gap-3">
          <Skeleton weight="mid" rounded="rounded-pill" className="h-9 w-24" />
          <Skeleton weight="strong" rounded="rounded-full" className="h-8 w-8" />
          <Skeleton weight="strong" rounded="rounded-full" className="h-8 w-8" />
        </div>
      </div>

      <div className="cascade cascade-tight px-5 pt-6 pb-10">
        {/* The search field. */}
        <Skeleton weight="mid" rounded="rounded-[14px]" className="mb-4 h-12 w-full" />

        {/* The bands: a phone's first screen holds about six. */}
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} weight="faint" rounded="rounded-[18px]" className="mb-2.5 h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
