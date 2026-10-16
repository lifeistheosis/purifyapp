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
// (markRuleCompletedToday, which the streak reads), the tap that finishes it
// is felt in the phone apps (softTick), and the doxology says so, once and
// quietly.
//
// Each prayer's bookmark writes a `kind: 'prayer'` row to the Saved store
// (and to the reader's account when signed in, through the bookmarks sync).

import { useMemo, useRef, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ServiceHeader } from "@/components/prayers/service/ServiceHeader";
import { PrayerStep } from "@/components/prayers/service/PrayerStep";
import { useLitLine } from "@/components/prayers/service/useLitLine";
import { isRuleBookmarked, toggleRuleBookmark } from "@/lib/prayers/bookmarks";
import { markRuleCompletedToday, readTodayDone, writeTodayDone, PRAYER_EVENT } from "@/lib/prayers/storage";
import type { Prayer, Rule } from "@/lib/prayers/types";
import { isKept } from "@/lib/rhythm/marks";
import { scrollBehavior } from "@/lib/ui/motion";
import { softTick } from "@/lib/ui/softTick";

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
}) {
  const { t, locale } = useTranslate();
  const article = useRef<HTMLElement>(null);
  useLitLine(article);

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

  function persist(next: Set<string>) {
    if (typeof window === "undefined") return;
    writeTodayDone(rule.id, [...next]);
    cache.delete(rule.id);
    if (total > 0 && rule.prayers.every((p) => next.has(p.id))) {
      markRuleCompletedToday(rule.id);
      // The tap that finishes the rule is felt in the phone apps, as the
      // closing line appears. `allDone` is how the rule stood before this
      // tap, so a rule that was finished already does not tick again.
      if (!allDone) softTick();
    }
  }

  function toggle(id: string) {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persist(next);
  }

  function begin() {
    const first = rule.prayers[0];
    if (!first) return;
    document.getElementById(first.id)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    // The way in is also where the reader's focus goes.
    document.getElementById(`${first.id}-title`)?.focus({ preventScroll: true });
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
    <article ref={article} data-prayer-reader className="mx-auto w-full max-w-[640px]">
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

      {/* Mark all and Reset, as before: they mark prayers, they count nothing. */}
      <div className="mt-10 flex items-center justify-end gap-1 font-sans text-caption">
        <button
          type="button"
          onClick={() => persist(new Set(rule.prayers.map((p) => p.id)))}
          disabled={!hydrated || allDone}
          className="tap-press inline-flex min-h-11 items-center px-2 text-paper/55 hover:text-paper disabled:opacity-35 disabled:hover:text-paper/55"
        >
          {t("prayers.reader.markAll")}
        </button>
        <span aria-hidden className="text-paper/25">
          {"·"}
        </span>
        <button
          type="button"
          onClick={() => persist(new Set())}
          disabled={!hydrated || done.size === 0}
          className="tap-press inline-flex min-h-11 items-center px-2 text-paper/55 hover:text-paper disabled:opacity-35 disabled:hover:text-paper/55"
        >
          {t("prayers.rope.reset")}
        </button>
      </div>

      <div className="mt-1">
        {rule.prayers.map((p) => (
          <PrayerStep
            key={p.id}
            ruleId={rule.id}
            prayer={p}
            title={stepTitle(p)}
            from={fromTitle(p)}
            contentLang={contentLocale}
            isDone={done.has(p.id)}
            hydrated={hydrated}
            onToggle={() => toggle(p.id)}
            bookmarkable={rule.kind !== "custom" || Boolean(p.origin)}
          />
        ))}
      </div>

      {/* The doxology stays. It is not a score: it says the rule is finished,
          which is what the end of a rule is, and it says it once and quietly.
          Nothing counts up to it and nothing is lost by not reaching it. */}
      {allDone ? (
        <p role="status" className="mt-4 border-t border-paper/10 pt-8 text-center font-serif text-body italic leading-[1.6] text-paper/80">
          {t("prayers.reader.complete")}
        </p>
      ) : null}

      {/* A reader's own rule has no one source: each of its prayers names its own. */}
      {rule.source ? (
        <footer className="mt-12 border-t border-paper/10 pt-6">
          <p lang={contentLocale} className="font-sans text-caption leading-[1.6] text-paper/50">
            {t("prayers.reader.sourceLabel")} {rule.source}
          </p>
        </footer>
      ) : null}
    </article>
  );
}
