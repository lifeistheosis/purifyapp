"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { PlusLock, PlusMark } from "@/components/billing/PlusMark";
import { UpgradeModalProvider, useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Slider } from "@/components/ui/Slider";
import { AMBIENCE_TRACKS, getAmbienceTrack, type AmbienceId, type AmbienceTrack } from "@/lib/ambience/ambience";
import { DEFAULT_LEVEL, layerAmbience, setAmbienceBalance, setAmbienceLevel, setAmbienceVolume, useAmbience } from "@/lib/ambience/player";
import { closeAmbience, useAmbienceSheet } from "@/lib/ambience/sheet";
import { cn } from "@/lib/cn";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { isChosen, minutesLeft, setSleepTimer, useSleepTimer, type SleepChoice } from "@/lib/player/sleep";
import { getAudioSnapshot, subscribeAudio } from "@/lib/prayers/persistentAudioStore";

import { AmbiencePhoto } from "./AmbiencePhoto";

/** The sleep timer's choices here: the ambience runs for an evening, not a track. */
const SLEEPS = [15, 30, 60];

const LABEL = "font-sans text-caption font-semibold text-paper/55";

/**
 * The ambience sheet (1.7, the owner's note 25 of 2026-10-16 and his "Yeah,
 * these are good"): the sounds as large tiles (tap to play, tap the one
 * playing to stop; while none plays, the last one the reader chose is
 * marked, 1.9; from 1.9 a second tile plays beside the first, a third taking
 * the place of the one that began first, and two playing each have a volume
 * of their own), and once one plays, its volume, its
 * balance against the reading voice while one plays, and the sleep timer
 * shared with everything that plays (lib/player/sleep.ts).
 *
 * Opened from the sound button by the chapter pager, Now Playing (over it),
 * the mini player and the reader's settings, and mounted once in the root
 * frame, so it opens over Today too. Ambience is Plus: a reader without it
 * sees every sound, each with the Plus mark's padlock and the mark beside
 * the title, and a tap opens the upgrade sheet named for ambience. That
 * sheet is this one's own: the root frame stands above the providers of the
 * app's screens (AppFrame, Today).
 */
export function AmbienceSheet() {
  return (
    <UpgradeModalProvider>
      <AmbienceSheetHost />
    </UpgradeModalProvider>
  );
}

/**
 * Mounted on every screen, so it asks nothing until it opens: the reader's
 * Plus answer, the sounds and the player are read by what the open sheet
 * draws (the title's mark and the content below), not here.
 */
function AmbienceSheetHost() {
  const { t } = useTranslate();
  const { open, overPlayer } = useAmbienceSheet();

  // A link out of the sheet (the upgrade sheet's plans) leaves it behind.
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    closeAmbience();
  }, [pathname]);

  return (
    <Sheet
      open={open}
      onClose={closeAmbience}
      title={t("ambience.title")}
      desktop
      layer={overPlayer ? "over-player" : undefined}
      titleExtra={<TitleMark />}
      bodyClassName="pt-1"
    >
      <AmbienceSheetContent overPlayer={overPlayer} />
    </Sheet>
  );
}

/** The Plus mark beside the title, for a reader without Plus. */
function TitleMark() {
  return usePlusFeatures() === false ? <PlusMark /> : null;
}

/** Whether the app's player holds a track: re-renders when that changes, not with its clock. */
function useHasTrack(): boolean {
  return useSyncExternalStore(subscribeAudio, () => getAudioSnapshot().src !== null, () => false);
}

function AmbienceSheetContent({ overPlayer }: { overPlayer: boolean }) {
  const { t, locale } = useTranslate();
  const ambience = useAmbience();
  const plus = usePlusFeatures();
  const upgrade = useUpgradeModal();
  const hasTrack = useHasTrack();

  const locked = plus === false;
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

  const choose = (track: AmbienceTrack) => {
    if (locked) {
      upgrade.open("ambience", { overPlayer });
      return;
    }
    // A sound playing, or still loading, stops; any other joins it (1.9), and
    // is the one offered next time.
    void layerAmbience(track.id, { remember: true });
  };
  // While nothing plays, the reader's last sound is marked, to find it again.
  const quiet = ambience.layers.length === 0 && !ambience.loading;

  // What a playing sound adds: the volume, while two play each one's own, the
  // balance against a voice, and the sleep timer. Not for a reader without
  // Plus, whose sounds are a preview's (its own sheet has its own).
  const playing = ambience.layers.length > 0 && !locked;
  const pair = playing && ambience.layers.length > 1 ? ambience.layers : null;
  // The two kept while their own volumes glide away, so they leave as they came.
  const [kept, setKept] = useState<readonly AmbienceId[]>([]);
  if (pair && (pair[0] !== kept[0] || pair[1] !== kept[1])) setKept(pair);
  const tilesRef = useHoldStill<HTMLDivElement>();

  // The sounds stand at the sheet's foot, where the thumb is, and what a
  // playing sound adds opens above them on the house glide: the sheet grows
  // from its top, so a tile never moves under the finger (build 95, note 11's
  // walk: they rose 213 to 240px as a sound began, folded into note 22).
  return (
    <>
      <Glide open={playing}>
        <div className="mb-4 space-y-4 border-b border-paper/10 pb-4">
          <div>
            <p className={LABEL}>{t("ambience.volume")}</p>
            <Slider
              value={ambience.volume}
              max={1}
              step={0.05}
              onChange={setAmbienceVolume}
              label={t("ambience.volume")}
              valueText={pct.format(ambience.volume)}
            />
          </div>

          {/* Two playing (1.9): each its own volume, under the one for both. */}
          <Glide open={Boolean(pair)}>
            <div className="space-y-4">
              {kept.map((id) => {
                const track = getAmbienceTrack(id);
                if (!track) return null;
                const level = ambience.levels[id] ?? DEFAULT_LEVEL;
                return (
                  <div key={id}>
                    <p className={LABEL}>{t(track.labelKey)}</p>
                    <Slider
                      value={level}
                      max={1}
                      step={0.05}
                      onChange={(v) => setAmbienceLevel(id, v)}
                      label={t(track.labelKey)}
                      valueText={pct.format(level)}
                    />
                  </div>
                );
              })}
            </div>
          </Glide>

          {/* The balance, while the app's player holds a reading or a chant:
              how far the sound steps back while the voice speaks. */}
          {hasTrack ? (
            <div>
              <p className={LABEL}>{t("ambience.balance")}</p>
              <div className="flex items-center gap-3">
                <span className="shrink-0 font-sans text-caption text-paper/70">{t("ambience.balanceVoice")}</span>
                <Slider
                  value={ambience.balance}
                  max={1}
                  step={0.05}
                  onChange={setAmbienceBalance}
                  label={t("ambience.balance")}
                  valueText={`${t("ambience.balanceSound")} ${pct.format(ambience.balance)}`}
                  className="min-w-0 flex-1"
                />
                <span className="shrink-0 font-sans text-caption text-paper/70">{t("ambience.balanceSound")}</span>
              </div>
            </div>
          ) : null}

          <SleepChoices />
        </div>
      </Glide>

      {/* One playing: a second tile plays beside it (1.9). */}
      <Glide open={playing && ambience.layers.length === 1}>
        <p className="pb-3 font-sans text-caption text-paper/50">{t("ambience.layerHint")}</p>
      </Glide>

      <div ref={tilesRef} className="grid grid-cols-3 gap-2.5">
        {AMBIENCE_TRACKS.map((track) => {
          const lit = ambience.layers.includes(track.id);
          const loading = ambience.loading === track.id;
          // A reader without Plus meets the lock, never a failure line in its
          // place: a preview's sound that failed is not theirs to retry here
          // (build 95, note 11).
          const failed = !locked && ambience.failed === track.id;
          const last = quiet && !locked && !failed && ambience.last === track.id;
          const state = lit
            ? t("ambience.playing")
            : loading
              ? t("ambience.loading")
              : failed
                ? t(ambience.failedFor === "connection" ? "ambience.needsConnection" : "ambience.failed")
                : last
                  ? t("ambience.last")
                  : null;
          return (
            <SoundTile
              key={track.id}
              track={track}
              name={t(track.labelKey)}
              lit={lit || loading}
              loading={loading}
              last={last}
              locked={locked}
              state={state}
              onTap={() => choose(track)}
            />
          );
        })}
      </div>
    </>
  );
}

/**
 * A part that opens and closes on the house glide (the grid's rows from none
 * to its own height, components/saints/MobileWorkPill.tsx's way); with the
 * app's motion off it is simply there. Closed, it is out of reach: inert and
 * hidden from a screen reader.
 */
function Glide({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={open ? undefined : true}
      inert={!open}
      className={cn(
        "grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-300 motion-safe:ease-house",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/**
 * Hold a part still on the screen while what stands above it in the sheet
 * grows or shrinks. A sheet stands on the screen's foot, so it grows upward
 * and the part, last in it, stays where it was; once the sheet is at its full
 * height and scrolls, what is added above would push the part down, so the
 * scroll takes it up, frame by frame through a glide.
 */
function useHoldStill<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    let scroller = el?.parentElement ?? null;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    if (!el || !scroller) return;
    const box = scroller;
    const offset = () => el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    let at = offset();
    const watch = new ResizeObserver(() => {
      const now = offset();
      if (Math.abs(now - at) >= 1) box.scrollTop += now - at;
      at = offset();
    });
    for (const part of box.children) if (part !== el && !part.contains(el)) watch.observe(part);
    return () => watch.disconnect();
  }, []);
  return ref;
}

/**
 * A sound's tile (build 95, note 22, his "I want each button to have a photo
 * of the corresponding aesthetic of the sound"): its photograph at the top,
 * melting into the tile's own ground by a mask (the plans' tiles, app/globals.css
 * .ambience-tile-picture), and its name and state on that ground below, so
 * the words read on every palette and no bright line shows at the round
 * corners (lib/ui/__tests__/pictureCorners.test.ts). The photograph is the
 * sound's own, bundled beside it (lib/ambience/ambience.ts, `photo`), and
 * arrives whole over its own colour (./AmbiencePhoto.tsx, which the Plus
 * preview's strip draws too); the tile's size never changes, so nothing moves
 * when it paints. Playing, the tile turns to the paper as before; the last
 * sound keeps its ring.
 */
function SoundTile({
  track,
  name,
  lit,
  loading,
  last,
  locked,
  state,
  onTap,
}: {
  track: AmbienceTrack;
  name: string;
  lit: boolean;
  loading: boolean;
  last: boolean;
  locked: boolean;
  state: string | null;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={lit}
      data-ambience-tile={track.id}
      className={cn(
        "tap-press relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[12px] p-3 text-start",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
        "motion-safe:transition-colors motion-safe:duration-200",
        lit
          ? "bg-paper text-night"
          : cn("bg-paper/[0.04] text-paper ring-1 ring-inset hover:bg-paper/[0.08]", last ? "ring-paper/35" : "ring-paper/10"),
      )}
    >
      <AmbiencePhoto track={track} className="-mx-3 -mt-3 mb-2" />
      <span className="relative flex items-start justify-between gap-1.5">
        <span className="block font-sans text-detail font-semibold leading-tight">{name}</span>
        {locked ? <PlusLock size={13} className="mt-0.5 shrink-0 opacity-60" /> : null}
      </span>
      {/* The state's line is always there, so the name never moves when a state comes or goes. */}
      <span className={cn("relative mt-1 block font-sans text-caption leading-tight opacity-70", loading && "motion-safe:animate-pulse")}>
        {state ?? " "}
      </span>
    </button>
  );
}

/** Off, 15, 30 or 60 minutes: the one sleep timer, and how long it has left. */
function SleepChoices() {
  const { t } = useTranslate();
  const sleep = useSleepTimer();
  const [now, setNow] = useState(() => Date.now());

  // The minutes left, kept current while the sheet is open.
  useEffect(() => {
    if (sleep.kind !== "minutes") return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [sleep.kind]);

  const choices: { key: string; label: string; choice: SleepChoice }[] = [
    { key: "off", label: t("common.off"), choice: { kind: "off" } },
    ...SLEEPS.map((m) => ({ key: String(m), label: t("today.minRead", { count: m }), choice: { kind: "minutes", minutes: m } as SleepChoice })),
  ];

  return (
    <div>
      <p className={LABEL}>{t("player.sleep")}</p>
      <div role="group" aria-label={t("player.sleep")} className="mt-2 grid grid-cols-4 gap-2">
        {choices.map((c) => {
          const on = isChosen(sleep, c.choice);
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setSleepTimer(c.choice);
                setNow(Date.now());
              }}
              className={cn(
                "tap-press inline-flex min-h-11 items-center justify-center rounded-pill px-2 font-sans text-detail font-semibold tabular-nums",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
                on ? "bg-paper text-night" : "text-paper/75 ring-1 ring-inset ring-paper/15 hover:bg-paper/[0.06] hover:text-paper",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {/* Its line keeps its place while the timer is off, so choosing a time moves nothing (build 95, note 22). */}
      <p role="status" className={cn("mt-2 font-sans text-caption text-paper/60", sleep.kind !== "minutes" && sleep.kind !== "end" && "invisible")}>
        {sleep.kind === "minutes" ? t("player.sleepIn", { count: minutesLeft(sleep, now) }) : sleep.kind === "end" ? t("player.sleepEnd") : "\u00a0"}
      </p>
    </div>
  );
}
