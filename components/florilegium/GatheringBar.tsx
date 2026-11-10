"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { useGatheringNow } from "@/lib/florilegium/gatheringNow";

import { FLOR_TITLE } from "./florStyle";

/**
 * The bar over a gathering (1.9): it takes the gathering's own name once the
 * name has gone up under it, as every page's bar in the house does
 * (components/nav/MobileTopBar.tsx, `revealTitleOn`). Until 1.9 it said
 * "Florilegium" from first to last, over every gathering alike, so a reader
 * well down a long one had nothing on the screen that said which it was.
 *
 * A gathering is the device's own, so no server and no first draw knows its
 * name. The gathering says it as it is drawn (lib/florilegium/
 * gatheringNow.ts, written by FlorilegiumDetail.tsx); with none on the
 * screen (the device not read yet, a gathering this device does not keep)
 * the bar is the Florilegium's, as it always was.
 *
 * It reads no address and no query, so it stands in no Suspense boundary,
 * and that is the point: a bar in a boundary of its own was drawn a beat
 * after its page when the page's script was still arriving, and the page
 * switch was pictured twice (gatheringNow.ts has the story).
 *
 * So the name reaches the bar a moment after the page: when a page arrives
 * in a transition, React keeps what its effects ask for until the
 * transition is over, about a third of a second. Nothing is seen of that,
 * because the two bars are the same to the eye at the top of a page: each
 * holds its name back until the gathering's heading has gone up under it
 * (`revealTitleOn`), and the name is all that differs. Where no gathering's
 * heading ever comes (one this device does not keep), the Florilegium's
 * name is shown, as the bar does with nothing to wait for. The bar that
 * knows its gathering is a new bar (`key`), so it looks for the heading
 * afresh: the first may have looked before the heading was drawn.
 *
 * The name is the reader's own words, in whatever language they wrote them.
 * It is handed to the bar as the reader's own (`titles`, under the reader's
 * language), so the bar says no language over it: a title handed in bare is
 * taken for an English name and marked so (build 90 note 4).
 *
 * It stands for the page's bar, which a page cannot draw with a name only
 * the device knows, as the account's does (components/account/
 * AccountTopBar.tsx). So it is held to the same: it draws a MobileTopBar on
 * every path, never nothing, or the page would have no bar and no way back
 * (lib/nav/__tests__/backBar.test.ts).
 */
export function GatheringBar() {
  const { locale } = useTranslate();
  const open = useGatheringNow();
  if (!open) return <MobileTopBar key="florilegium" titleKey="study.florilegium.title" back backFallback="/florilegium" revealTitleOn={FLOR_TITLE} />;
  return <MobileTopBar key={`gathering:${open.id}`} title={open.title} titles={{ [locale]: open.title }} back backFallback="/florilegium" revealTitleOn={FLOR_TITLE} />;
}
