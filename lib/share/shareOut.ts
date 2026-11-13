"use client";

import { shareText } from "@/lib/share/shareImage";
import { copyText } from "@/lib/ui/copyText";

/**
 * The one way the app hands words and a link on (1.9, build 95 note 24). His
 * word, 2026-11-13 about 08:08 UTC, with the player's sheet on his Android
 * phone and the phone's own clipboard preview at its foot: "the share should
 * open the share system not just a copy link button."
 *
 * Android's web view has no Web Share, so every Share that asked for it
 * (the round Share of a saint, a chant, a council, an event, a service, a
 * campaign's page; the player's; a campaign's card; the ambassador's link)
 * copied the link there and never opened the phone's sheet. Now each comes
 * here: in the apps the Share plugin, the phone's own sheet, on Android and
 * iPhone alike; in a browser that can share, the Web Share sheet
 * (lib/share/shareImage.ts, shareText). Only where there is neither is
 * anything copied, the link unless the caller names other words, and the
 * caller says so ("copied"). A sheet closed without choosing is no failure,
 * and nothing is copied then.
 *
 * A picture or a file goes by shareImage and shareFile, which try the same
 * three ways. lib/share/__tests__/shareOut.test.ts holds every screen to
 * these and to no Web Share of its own.
 */
export type ShareOutResult = "shared" | "copied" | "dismissed" | "failed";

export async function shareOut({
  title,
  text,
  url,
  copy,
}: {
  /** The share sheet's title. */
  title: string;
  /** What the message says beside the link; the title when not given. */
  text?: string;
  /** The link, built by lib/site.ts (shareLink), never the app's own address. */
  url?: string;
  /** What is copied where there is no share sheet; the link, else the words. */
  copy?: string;
}): Promise<ShareOutResult> {
  const outcome = await shareText(title, text ?? title, url);
  if (outcome === "shared" || outcome === "dismissed") return outcome;
  return (await copyText(copy ?? url ?? text ?? title)) ? "copied" : "failed";
}
