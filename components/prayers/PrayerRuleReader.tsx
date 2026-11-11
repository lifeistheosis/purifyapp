"use client";

// The prayer page (1.7): every rule, the Hours, the akathist and a reader's
// own rule are read here.
//
// The owner's note 16 of 2026-10-16 ("the pages under Prayers are desktop
// pages shrunk") and his word the same day on how a prayer reads: the
// prayer's icon, its name and its length at the head with one way in
// (components/prayers/service/ServiceHeader.tsx), then each prayer flowing
// down the page line by line in the reader's font, as the player's live
// lyrics do, the line being read bright and the rest a step back with the
// scroll, behind the motion switch (service/useLitLine.ts), the sign of the
// Cross drawn beside the lines it is made at (service/PrayerStep.tsx). Chant
// and, with Plus, ambience may play under it (Pray with, in the head). The
// slim bar that takes the name once it has scrolled away is the route's
// MobileTopBar.
//
// NO COUNT, NO FRACTION, NO BAR, AND NO PLACE KEPT.
// Each prayer still carries "Mark prayed", and today's set is kept on the
// device: a mark on a prayer is a place, and a place is not a score. What
// is refused is the score: a row reading "n of m prayed today" over a bar
// used to sit here, and a percentage on a prayer rule turns it into a task
// list and makes an unfinished rule look like a failed one. The owner said
// it again on 2026-10-16: no retention loops inside prayers, so no step
// path, no "continue from", no counter at the end. Begin always begins.
//
// When every prayer is marked the rule is kept for today
// (markRuleCompletedToday, which the streak reads). Reaching the end is what
// marks the last of them (build 93 note 14: no Amen button), and the end
// answers once, with the click in the phone apps (softTick) and the
// doxology settling in under the lampada's soft light
// (service/RuleEnd.tsx).
//
// Each prayer's bookmark writes a `kind: 'prayer'` row to the Saved store
// (and to the reader's account when signed in, through the bookmarks sync).
//
// While you pray (1.8): the owner's pick B, Immersive, of 2026-10-27, "the
// line being prayed lit, the rest dim, the icon's light behind, chant
// underneath" (Homebase/boards/purify-master/variants/05-praying.png). Built
// on the 1.7 page, not beside it: the same scroll lights the line, and now
// also marks the prayer it stands in (service/useLitLine.ts), so the prayers
// before and after step back further than its own unlit lines; the prayers
// stand in the middle of the page; behind them is a soft light; and once
// Pray with has scrolled away, its chant waits at the foot of the screen
// (components/player/PrayWith.tsx). Still no count and no place kept.
//
// That light was the page's own icon, drawn large, soft, dim and without its
// colour, under a faint white breath. From 1.9 (build 90 note 8, "make it
// more, like, fit the theme the user picked") it is the palette's own light,
// a soft pool or nothing, and the ground is the palette's own, whole
// (service/PrayerLight.tsx). The icon still heads the page.
//
// "Those I pray for" (1.7.1, lib/prayers/commemoration.ts): the reader's own
// diptychs, living and departed, and the names they brought from the prayer
// wall, in one step (service/CommemorationStep.tsx), in the prayers the reader
// chose for it, just before the dismissal. In their own rule it is the step
// they set there, if they set one. Its mark is kept with the day's marks and
// lets the names from the wall go; Mark all and Reset take it with the rest.
// Only in the reader's own rule is it one of the rule's prayers; anywhere else
// the rule is complete without it.

import { Fragment, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CampaignPrayerSteps } from "@/components/campaigns/CampaignPrayerSteps";
import { CommemorationStep } from "@/components/prayers/service/CommemorationStep";
import { PrayerLight } from "@/components/prayers/service/PrayerLight";
import { ServiceHeader } from "@/components/prayers/service/ServiceHeader";
import { PrayerStep } from "@/components/prayers/service/PrayerStep";
import { RuleEnd } from "@/components/prayers/service/RuleEnd";
import { useEasyScroll } from "@/components/prayers/service/useEasyScroll";
import { goToPrayer, useLitLine } from "@/components/prayers/service/useLitLine";
import { usePassedSteps } from "@/components/prayers/service/usePassedSteps";
import { isRuleBookmarked, toggleRuleBookmark } from "@/lib/prayers/bookmarks";
import { carriedFor } from "@/lib/campaigns/carried";
import { useCarried } from "@/lib/campaigns/useCarried";
import { commemorationPlacement, placeOf } from "@/lib/prayers/commemoration";
import { markRuleCompletedToday, readTodayDone, useIntentions, writeTodayDone, PRAYER_EVENT } from "@/lib/prayers/storage";
import type { Prayer, Rule } from "@/lib/prayers/types";
import { useRememberedPlaces } from "@/lib/prayers/useCommemoration";
import { updateWallNames, useWallNames } from "@/lib/prayers/useWallNames";
import { markWallPrayed, unmarkWallPrayed, wallNamesFor } from "@/lib/prayers/wallNames";

/** The day's mark for "Those I pray for" where it is no prayer of the rule. */
const COMMEMORATION_ID = "commemoration";
/**
 * How long the end's answer is held (build 93 note 14): past its last motion
 * (globals.css, "The end of a rule": the pool and the lines after it end at
 * 1400ms), then let go, so nothing can play it again. A pool shown again, by
 * a palette changed at the end, would otherwise grow in a second time.
 */
const MOMENT_MS = 1600;
import { isKept } from "@/lib/rhythm/marks";
import { clicksOn } from "@/lib/ui/clicksSetting";
import { quietMoment, softTick } from "@/lib/ui/softTick";
import { textDir } from "@/lib/i18n/textDir";

// Re-exported for back-compat: the rule pages import these as types.
export type { Prayer, PrayerVariant, Rule } from "@/lib/prayers/types";

type Snap = { done: string[]; today: string };
const SERVER_SNAP: Snap = { done: [], today: "" };
const cache = new Map<string, { raw: string | null; today: string; val: Snap }>();

function readSnap(ruleId: string): Snap {
  if (typeof window === "undefined") return SERVER_SNAP;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(`purify.prayers.${ruleId}.today.${today}`);
  } catch {
    return SERVER_SNAP;
  }
  const c = cache.get(ruleId);
  if (c && c.raw === raw && c.today === today) return c.val;
  let done: string[] = readTodayDone(ruleId);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) done = parsed.filter((x) => typeof x === "string");
    } catch {
      /* ignore */
    }
  }
  const val: Snap = { done, today };
  cache.set(ruleId, { raw, today, val });
  return val;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PRAYER_EVENT, cb);
  window.addEventListener("purify:bookmark", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PRAYER_EVENT, cb);
    window.removeEventListener("purify:bookmark", cb);
    window.removeEventListener("storage", cb);
  };
}

/** A stanza of an akathist is named by the Church's own word for it, in the reader's language. */
const STANZA = /^(kontakion|ikos)-(\d+)$/;

export function PrayerRuleReader({
  rule,
  ruleHref,
  titleKey,
  artId,
  contentLocale = "en",
  afterHead,
}: {
  rule: Rule;
  /** When set, the head offers a bookmark that keeps the whole rule in Saved. */
  ruleHref?: string;
  /** The app's own name for this prayer, in the reader's language; the file's title otherwise. */
  titleKey?: string;
  /** Whose icon heads the page (lib/prayers/serviceArt.ts); the rule's own by default. */
  artId?: string;
  /** The language the prayers' words were drawn in: English unless the page found a wording in the reader's. */
  contentLocale?: string;
  /** Stands under the head, before the first prayer (the Hours' line on bowing, MetanyLine.tsx). */
  afterHead?: ReactNode;
}) {
  const { t, locale } = useTranslate();
  const article = useRef<HTMLElement>(null);
  useLitLine(article);
  // The phone's own scroll, with a click as each new prayer arrives at the
  // reading place (build 89 note 7's Easy Scroll; its snapping went at build
  // 93 note 2, service/useEasyScroll.ts).
  useEasyScroll(article);

  const snap = useSyncExternalStore(subscribe, () => readSnap(rule.id), () => SERVER_SNAP);
  const done = useMemo(() => new Set(snap.done), [snap.done]);
  const hydrated = snap.today !== "";
  const kept = useSyncExternalStore(subscribe, () => isKept(rule.id), () => false);
  const ruleBookmarked = useSyncExternalStore(
    subscribe,
    () => (ruleHref ? isRuleBookmarked(rule.id) : false),
    () => false,
  );

  const named = titleKey ? t(titleKey) : "";
  const title = named && named !== titleKey ? named : rule.title;
  const titleId = "prayer-title";

  const total = rule.prayers.length;
  // Never rendered as a figure: `allDone` decides whether the doxology shows
  // and whether this tap finishes the rule; the size of `done` decides
  // whether Reset has anything to clear.
  const allDone = total > 0 && rule.prayers.every((p) => done.has(p.id));

  // "Those I pray for": the reader's diptychs where they chose this prayer for
  // them (or always, at the step they set in their own rule), and the names
  // from the prayer wall that wait in it, with those marked prayed since the
  // page opened, which stay until it is left.
  const place = placeOf(rule.id);
  const remembered = useRememberedPlaces();
  const living = useIntentions("living");
  const departed = useIntentions("departed");
  const wallList = useWallNames();
  const [openedAt] = useState(() => Date.now());
  const wall = useMemo(() => wallNamesFor(wallList, rule.id, openedAt), [wallList, rule.id, openedAt]);
  // The prayer campaigns the reader carries in this prayer today (1.9):
  // read from this device and nowhere else, so a campaign is prayed with no
  // signal, and nothing is sent when it is. None in a build where campaigns
  // are closed (lib/campaigns/useCarried.ts), so the page then stands as it
  // did before they were built.
  const carriedList = useCarried();
  const campaigns = useMemo(() => (snap.today ? carriedFor(carriedList, rule.id, snap.today) : []), [carriedList, rule.id, snap.today]);
  const placement = commemorationPlacement(rule.prayers);
  // The reader's own step in their own rule: one of the rule's prayers.
  const ownStep = rule.kind === "custom" && placement.replaces;
  const carriesList = ownStep || (place !== null && remembered.includes(place));
  const livingHere = carriesList ? living : [];
  const departedHere = carriesList ? departed : [];
  const commemorated = ownStep || livingHere.length + departedHere.length + wall.length + campaigns.length > 0;
  const commemorationId = ownStep ? "names" : COMMEMORATION_ID;
  const wallIds = wall.map((n) => n.id);
  // Marked for today, with every name from the wall here marked too: a name
  // added since the mark waits to be prayed for.
  const commemorationDone = done.has(commemorationId) && wall.every((n) => n.doneAt);
  const commemorationAt = commemorated ? placement.index : -1;

  // The rule became complete during this visit: its end answers once (build
  // 93 note 14). Set where the completion happens, never on opening a rule
  // already complete today, which shows its end at rest.
  const [moment, setMoment] = useState(false);
  const letGo = useRef(0);

  function persist(next: Set<string>) {
    if (typeof window === "undefined") return;
    writeTodayDone(rule.id, [...next]);
    cache.delete(rule.id);
    if (total > 0 && rule.prayers.every((p) => next.has(p.id))) {
      // Completing the rule is felt in the phone apps, as the end answers.
      // `allDone` is how the rule stood before this, so a rule that was
      // finished already neither clicks nor answers again. With Clicks as
      // you scroll off (lib/ui/clicksSetting.ts) the moment is still, and so
      // is the day it keeps: that tick comes from inside the mark
      // (lib/streak/useStreak.ts), so the moment is quieted before it.
      const completes = !allDone;
      const felt = completes && clicksOn();
      if (completes && !felt) quietMoment();
      markRuleCompletedToday(rule.id);
      if (completes) {
        if (felt) softTick();
        setMoment(true);
        window.clearTimeout(letGo.current);
        letGo.current = window.setTimeout(() => setMoment(false), MOMENT_MS);
      }
    }
  }

  // A prayer the reader has moved down through counts as prayed (build 89
  // note 7): nothing is ticked under it now. The names step too, and with it
  // the names from the prayer wall, as the Amen would. Read from the store at
  // the moment, so two prayers passed in one fling are both kept.
  function passed(id: string) {
    const now = new Set(readSnap(rule.id).done);
    if (id === commemorationId) {
      if (now.has(commemorationId)) return;
      now.add(commemorationId);
      persist(now);
      if (wallIds.length > 0) updateWallNames((list) => markWallPrayed(list, wallIds));
      return;
    }
    if (now.has(id) || !rule.prayers.some((p) => p.id === id)) return;
    now.add(id);
    persist(now);
  }
  usePassedSteps(article, passed, { ready: hydrated });

  const commemorationStep = commemorated ? (
    <>
      <CommemorationStep
        stepId={commemorationId}
        living={livingHere}
        wall={wall}
        departed={departedHere}
        campaigns={campaigns}
      />
      {/* A campaign's psalm follows the names, as a step of its own. */}
      {campaigns.length > 0 ? (
        <CampaignPrayerSteps campaigns={campaigns} ruleHas={(id) => rule.prayers.some((p) => p.id === id)} contentLang={contentLocale ?? "en"} />
      ) : null}
    </>
  ) : null;

  function begin() {
    const first = rule.prayers[0];
    if (!first) return;
    // Its first line at the reading place, lit there, and the reader's focus
    // on its name: the way in is also where the focus goes.
    goToPrayer(first.id);
  }

  const stepTitle = (p: Prayer): string => {
    const m = rule.kind === "akathist" ? STANZA.exec(p.id) : null;
    return m ? t(`prayers.akathist.${m[1]}`, { n: Number(m[2]) }) : p.title;
  };
  const fromTitle = (p: Prayer): string | undefined => {
    if (!p.origin) return undefined;
    const key = `prayers.rule.${p.origin.ruleId}.title`;
    const v = t(key);
    return v === key ? undefined : v;
  };

  return (
    <>
      {/* The light behind the prayer: the palette's own soft pool, or nothing
          (service/PrayerLight.tsx; globals.css, .prayer-light). The icon
          itself heads the page. */}
      <PrayerLight />
      <article ref={article} data-prayer-reader className="relative mx-auto w-full max-w-[640px]">
        <ServiceHeader
          rule={rule}
          title={title}
          titleId={titleId}
          artId={artId ?? rule.id}
          kept={kept}
          bookmarked={ruleBookmarked}
          onBookmark={ruleHref ? () => toggleRuleBookmark(rule.id, title, ruleHref) : undefined}
          onBegin={begin}
          contentLang={contentLocale}
          notInYourLanguage={locale !== "en" && locale !== contentLocale}
        />
        {afterHead}

        <div className="mt-1">
          {rule.prayers.map((p, i) => (
            <Fragment key={p.id}>
              {i === commemorationAt ? commemorationStep : null}
              {/* The reader's own "Those I pray for" is drawn as the step above. */}
              {ownStep && i === placement.index ? null : (
                <PrayerStep
                  ruleId={rule.id}
                  prayer={p}
                  title={stepTitle(p)}
                  from={fromTitle(p)}
                  contentLang={contentLocale}
                  bookmarkable={rule.kind !== "custom" || Boolean(p.origin)}
                />
              )}
            </Fragment>
          ))}
          {commemorationAt === rule.prayers.length ? commemorationStep : null}
        </div>

        {/* The end of the rule (build 93 note 14): reaching it completes the
            rule, and it answers once (service/RuleEnd.tsx). No Amen button:
            the last prayer is counted as every one before it, carried past
            the reading place. So that a hand can carry it there, the end and
            the source stand in room enough (62svh), on every rule however
            short; a page whose last prayer could not pass the reading place
            could never be completed. */}
        <div data-rule-room="" className="min-h-[62svh]">
          <RuleEnd
            complete={allDone}
            moment={moment}
            wallLeft={commemorationDone && wall.length > 0 ? t("prayers.wall.left") : null}
            onReset={() => {
              window.clearTimeout(letGo.current);
              setMoment(false);
              persist(new Set());
              if (wallIds.length > 0) updateWallNames((list) => unmarkWallPrayed(list, wallIds));
            }}
            resetDisabled={!hydrated}
          />

          {/* A reader's own rule has no one source: each of its prayers names its own. */}
          {rule.source ? (
            <footer className="mt-12 border-t border-paper/10 pt-6 text-center">
              {/* "Source:" is the reader's word; the source itself is the rule's own language (build 90 note 4). */}
              <p className="font-sans text-caption leading-[1.6] text-paper/50">
                {t("prayers.reader.sourceLabel")}{" "}
                <span lang={contentLocale} dir={textDir(contentLocale)}>
                  {rule.source}
                </span>
              </p>
            </footer>
          ) : null}
        </div>
      </article>
    </>
  );
}
