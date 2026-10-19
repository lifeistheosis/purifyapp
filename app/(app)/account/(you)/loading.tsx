import { MobileHeader } from "@/components/mobile/MobileHeader";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

/**
 * Covers the server leg of /account, which awaits the Supabase session before
 * it can render. In the native export the session resolves on the device
 * instead, and that wait is covered by YouMobile's own loading branch; this is
 * the web half of the same fix.
 *
 * In a route group of its own since 1.8, with the You page alone. It sat at
 * app/(app)/account/, and a loading screen there wraps every screen under
 * /account, the account screens' own layout and bar included. So tapping
 * Profile, Security or Notifications in Settings put the You tab's old
 * loading screen up first, a stand-in bar with a pill and a round picture
 * over a picture, a card and four tiles, before the screen that was asked
 * for: the old top bar the owner saw arrive on Profile (2026-10-17). The
 * account screens have their own, under their own bar
 * (../(signed)/loading.tsx).
 *
 * The bar is the tab's own (MobileHeader), not a drawing of one, so it does
 * not change when the screen arrives; under it, the parts of the screen in
 * their places: the picture, the streak, a list, the rows.
 */
export default function AccountLoading() {
  return (
    <div className="bg-night">
      <MobileHeader titleKey="nav.you" />
      <div className="cascade cascade-tight px-5 pt-6 pb-10 md:mx-auto md:w-full md:max-w-[760px]">
        {/* The Ladder plate. */}
        <Skeleton weight="mid" rounded="rounded-2xl" className="aspect-[16/9] w-full" />

        {/* The streak. */}
        <Skeleton weight="mid" rounded="rounded-2xl" className="mt-5 h-[168px] w-full" />

        {/* Where you left off, or what is kept: a name over a list. */}
        <div className="mt-7">
          <Skeleton weight="faint" className="h-3 w-28" />
          <Skeleton weight="faint" rounded="rounded-2xl" className="mt-2 h-[132px] w-full" />
        </div>

        {/* The reader's rows. */}
        <SkeletonList rows={3} className="mt-7" />
      </div>
    </div>
  );
}
