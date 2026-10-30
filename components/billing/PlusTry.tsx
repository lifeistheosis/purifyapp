"use client";

// Purify Plus, try each feature: the owner's pick A of r3-07, "a live look"
// (locked 2026-10-30; boards/purify-master/variants/r3-07-plus-try.png, his
// notes 8 and 39 of build 80). Every row of the Plus page ends in Try it,
// and Try it turns the page into that feature's own screen for a moment: the
// real one, working (lib/premium/plusTry.ts says what each shows and why).
//
// Three pieces, for the three places the Plus page stands (the upgrade
// sheet, the apps' /pricing and the website's):
//
//   usePlusTry     which feature is being tried, Next, and the way back.
//   PlusTryHead    the arrow back to the list, the feature's name and
//                  "Preview": in the sheet it is the sheet's own title bar.
//   PlusTryPage    the feature's screen in its window, a sound's minute, and
//                  under it what stays free (or the sound and its minute)
//                  with Next: the following feature, without going back.
//
// The plans stay held at the foot the whole time: each place keeps its dock
// under the page. Each feature's screen is its own file (./plusTry), read the
// first time it is tried, so the Plus page costs nothing more until then.

import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
  type RefObject,
} from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Close } from "@/components/ui/icons/Close";
import { getAmbienceTrack } from "@/lib/ambience/ambience";
import { useAmbience } from "@/lib/ambience/player";
import { cn } from "@/lib/cn";
import { nextTryRow, trySoundOf } from "@/lib/premium/plusTry";
import { beginTry, endTrySound, useTrySound } from "@/lib/premium/plusTrySound";
import { plusRowsLedBy, type PlusRow } from "@/lib/premium/plusRows";

import { TryWindow } from "./plusTry/TryKit";

/** What every feature's screen is given: its row (its name, its words). */
export type TryProps = { row: PlusRow };

/** Each feature's screen, by its row's id: every one of the fourteen (his note 39). */
const PREVIEWS: Readonly<Record<string, LazyExoticComponent<ComponentType<TryProps>>>> = {
  "word-study": lazy(() => import("./plusTry/TryWordStudy")),
  "reading-modes": lazy(() => import("./plusTry/TryReadingModes")),
  "cross-refs": lazy(() => import("./plusTry/TryCrossRefs")),
  journal: lazy(() => import("./plusTry/TryJournal")),
  offline: lazy(() => import("./plusTry/TryOffline")),
  ambience: lazy(() => import("./plusTry/TryAmbience")),
  plans: lazy(() => import("./plusTry/TryPlans")),
  remember: lazy(() => import("./plusTry/TryRemember")),
  florilegium: lazy(() => import("./plusTry/TryFlorilegium")),
  sync: lazy(() => import("./plusTry/TrySync")),
  "immersive-history": lazy(() => import("./plusTry/TryHistory")),
  profile: lazy(() => import("./plusTry/TryProfile")),
  "supporter-mark": lazy(() => import("./plusTry/TryMark")),
  "discord-frames": lazy(() => import("./plusTry/TryDiscord")),
};

/** The rows that can be tried: for the tests, which hold it to every row of the list. */
export const TRY_PREVIEW_IDS: readonly string[] = Object.keys(PREVIEWS);

export type PlusTry = {
  /** The row being tried, or null for the list. */
  row: PlusRow | null;
  /** The row Next leads to, or null at the end of the list. */
  next: PlusRow | null;
  /** Try a row: call it from the tap itself, so a sound may start. */
  start: (id: string) => void;
  /** Back to the list, at the row that was tried. */
  back: () => void;
};

/**
 * Which feature is being tried, for a place that holds the list itself (the
 * apps' screen, the website's /pricing). The sheet holds its own in its
 * provider, so it can let go of the sound the moment it closes.
 *
 * `list` is the element the rows stand in: back puts the tried row in view.
 */
export function usePlusTry(lead: string | null | undefined, list: RefObject<HTMLElement | null>): PlusTry {
  const [id, setId] = useState<string | null>(null);
  const tried = useRef<string | null>(null);
  const start = useCallback((next: string) => {
    beginTry(next);
    tried.current = next;
    setId(next);
  }, []);
  const back = useCallback(() => {
    endTrySound();
    const was = tried.current;
    tried.current = null;
    setId(null);
    if (was) bringRowBack(list, was);
  }, [list]);
  // Leaving the screen ends the sound with it.
  useEffect(() => () => endTrySound(), []);
  return useTryRows(lead, id, start, back);
}

/** The row being tried and the one after it, in the order the list shows them. */
export function useTryRows(lead: string | null | undefined, id: string | null, start: (id: string) => void, back: () => void): PlusTry {
  const rows = useMemo(() => plusRowsLedBy(lead), [lead]);
  const row = id ? (rows.find((r) => r.id === id) ?? null) : null;
  const next = row ? nextTryRow(rows, row.id) : null;
  return { row, next, start, back };
}

/** After going back, the row that was tried stands in the middle of the view. */
export function bringRowBack(list: RefObject<HTMLElement | null>, id: string): void {
  if (typeof window === "undefined") return;
  // Two frames: the list is drawn again in the first.
  window.requestAnimationFrame(() =>
    window.requestAnimationFrame(() => {
      const row = list.current?.querySelector<HTMLElement>(`[data-plus-feature="${CSS.escape(id)}"]`);
      row?.scrollIntoView({ block: "center" });
    }),
  );
}

/**
 * The preview's title bar: the arrow back to the list, the feature's name,
 * "Preview", and in the sheet its close. In the sheet it stands in the
 * sheet's own title bar, under the handle that still drags it.
 */
export function PlusTryHead({ name, onBack, onClose }: { name: string; onBack: () => void; onClose?: () => void }) {
  const { t } = useTranslate();
  return (
    <div className="flex items-center gap-1.5 pb-2 pe-2 ps-1.5" data-plus-try-head="">
      <button type="button" onClick={onBack} aria-label={t("common.back")} className="tap-press grid h-11 w-11 shrink-0 place-items-center rounded-full">
        <span className="grid size-9 place-items-center rounded-full bg-paper/[0.06] text-paper ring-1 ring-inset ring-paper/[0.12]">
          <ChevronLeft size={18} className="rtl:-scale-x-100" />
        </span>
      </button>
      <p className="min-w-0 truncate font-sans text-ui font-semibold text-paper">{name}</p>
      <span className="shrink-0 font-sans text-[12.5px] font-medium text-paper/50">{t("profile.previewing")}</span>
      <span className="min-w-0 flex-1" />
      {onClose ? (
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={onClose}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-paper/65 hover:text-paper"
        >
          <Close size={16} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * The feature's own screen, then (for a sound) its minute passing, then one
 * line: what stays free, or the sound and its minute, and Next. `head` stands
 * above it where the place has no title bar of its own (the apps' screen).
 */
export function PlusTryPage({
  row,
  next,
  onNext,
  head,
}: {
  row: PlusRow;
  next: PlusRow | null;
  onNext: (id: string) => void;
  head?: ReactNode;
}) {
  const { t } = useTranslate();
  const Preview = PREVIEWS[row.id];
  const top = useRef<HTMLDivElement>(null);
  const sound = trySoundOf(row.id);

  // Each feature opens at its top, and so does the page around it.
  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [row.id]);

  return (
    <div ref={top} data-plus-try={row.id} className="scroll-mt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-1">
      {head}
      {Preview ? (
        <Suspense fallback={<TryWindow loading />}>
          <Preview key={row.id} row={row} />
        </Suspense>
      ) : null}
      {sound ? <TryMinute /> : null}
      <div className="mt-2.5 flex items-start justify-between gap-3">
        <p className="min-w-0 font-sans text-[12.5px] leading-[1.4] text-paper/60">
          {sound ? <SoundLine fallback={sound} /> : row.keep ? t(row.keep) : null}
        </p>
        {next ? (
          <button
            type="button"
            onClick={() => onNext(next.id)}
            data-plus-try-next={next.id}
            className="tap-press -my-3 inline-flex min-h-11 shrink-0 items-center gap-0.5 font-sans text-[12.5px] font-semibold text-paper"
          >
            {t("plus.try.next", { feature: t(next.name) })}
            <ChevronRight size={13} className="rtl:-scale-x-100" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** "Rain plays for a minute, then stops.", for the sound playing now; nothing once the minute is up. */
function SoundLine({ fallback }: { fallback: string }) {
  const { t } = useTranslate();
  const minute = useTrySound();
  const { playing } = useAmbience();
  if (minute.ended) return null;
  const track = getAmbienceTrack(playing ?? fallback);
  return track ? <>{t("plus.try.minute", { sound: t(track.labelKey) })}</> : null;
}

/**
 * The minute, passing: a thin line that fills white from the moment the
 * sound began, and stays full once it has stopped. With motion turned down
 * it stands still (globals.css, .plus-try-minute).
 */
function TryMinute() {
  const minute = useTrySound();
  const [now] = useState(() => Date.now());
  // Already some way in when drawn (a switch of sound, a page drawn again):
  // the line starts where the minute is, not at its beginning.
  const behind = minute.startedAt ? Math.max(0, now - minute.startedAt) : 0;
  return (
    <div aria-hidden className="plus-try-minute relative mt-3.5 h-0.5 overflow-hidden rounded-full bg-paper/15">
      <span
        key={minute.startedAt}
        className={cn("plus-try-minute-fill absolute inset-0 origin-left rounded-full bg-paper rtl:origin-right", minute.ended && "is-ended")}
        style={{ animationDelay: `-${behind}ms` }}
      />
    </div>
  );
}
