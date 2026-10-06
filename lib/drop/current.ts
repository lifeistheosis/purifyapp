/**
 * The drops the app itself can show: the admin panel's Drop tab reads the
 * release's drop from here, where the bundler can see it.
 *
 * lib/drop/files.ts reads a drop off the disk, which a test and a script can
 * do and a page in a browser cannot. So each release that has a drop.json is
 * named once here. lib/drop/__tests__/current.test.ts fails when a release
 * has a drop on disk and this file does not carry it, or carries a stale
 * copy, so a new release cannot forget the line.
 *
 * No `server-only` and no node imports: the tab is a client component.
 */

import drop15 from "@/docs/plans/v1.5/drop.json";
import { CURRENT_VERSION, featureRelease } from "@/lib/whatsNew/version";

import type { Drop } from "./kit";

export const DROPS: Readonly<Record<string, Drop>> = {
  "1.5": drop15 as unknown as Drop,
};

/** The release this build is: a patch belongs to its release, and so does its drop. */
export const DROP_RELEASE = featureRelease(CURRENT_VERSION);

/** The drop of the release this build is, or null when it has none yet. */
export const CURRENT_DROP: Drop | null = DROPS[DROP_RELEASE] ?? null;
