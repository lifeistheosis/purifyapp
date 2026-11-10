// Which parts of campaigns THIS BUILD has at all, whatever the server says.
//
// A part is switched on by the server (./parts.ts), and an app has no value
// of its own for one (./useCampaignsOpen.ts). With one exception, which is
// a rule about store builds and not about readers: a store build has
// campaign pictures only when it was cut with them (./flags.ts,
// PICTURES_IN_STORE_BUILDS). Cut without, the app draws no picture and no
// picture control and asks the pictures' route for nothing, even while the
// website shows them: a campaign with pictures then looks in the app as one
// with none does, under the app's own icon of its kind, and nothing says a
// picture is missing.
//
// Asked where the server's answers come into the app: the parts it says are
// on (./useCampaignsOpen.ts), the moderators' queue, and the count on the
// moderators' button (lib/community/client.ts). Everything a screen draws
// follows from those.
//
// Whether this is a store build is asked of the running app
// (lib/platform/native.ts), since what a build was made for is not readable
// in the app's own code (lib/platform/buildTarget.ts).

import { isNativeClient } from "@/lib/platform/native";

import { picturesInStoreBuilds } from "./flags";
import type { CampaignPart, CampaignQueue } from "./model";

/** Whether this build has a part of campaigns at all. The server still has to say it is on. */
export function partInThisBuild(part: CampaignPart): boolean {
  return part !== "pictures" || picturesInStoreBuilds() || !isNativeClient();
}

/** The moderators' queue of campaigns as this build draws it: without its pictures where the build has none. */
export function queueInThisBuild(queue: CampaignQueue): CampaignQueue {
  if (!queue.pictures || partInThisBuild("pictures")) return queue;
  // Named, not spread: whatever else a later queue carries, a picture never comes through here.
  return { waiting: queue.waiting, reports: queue.reports, live: queue.live };
}
