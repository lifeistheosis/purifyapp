import { AfterAMoment } from "@/components/ui/AfterAMoment";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * While an account screen (Profile, Security, Notifications, Data, Sessions)
 * is on its way. Inside this group's layout, so the screen's own bar, its
 * name and its way back are up from the first frame and only the body waits.
 *
 * Until 1.8 the You tab's loading screen stood here instead, from
 * app/(app)/account/, with a bar of its own drawn in grey (a title, a pill
 * and a round picture): the old top bar that came in over Profile when it
 * was opened from Settings. That screen is the You page's alone now
 * (../(you)/loading.tsx).
 */
function AccountScreenOutline() {
  return (
    <div aria-hidden className="cascade cascade-tight pt-2">
      <Skeleton weight="faint" rounded="rounded-2xl" className="h-[148px] w-full" />
      <Skeleton weight="faint" rounded="rounded-2xl" className="mt-5 h-[96px] w-full" />
    </div>
  );
}

// The outline waits a moment before it shows, so a page that is ready at
// once arrives as itself (lib/ui/loadingGrace.ts, 1.9).
export default function AccountScreenLoading() {
  return (
    <AfterAMoment>
      <AccountScreenOutline />
    </AfterAMoment>
  );
}
