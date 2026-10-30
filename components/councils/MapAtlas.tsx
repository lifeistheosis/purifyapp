"use client";

import { useEffect, useId, useLayoutEffect, useRef, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { Pause } from "@/components/ui/icons/Pause";
import { Play } from "@/components/ui/icons/Play";
import { eraNameKey, eraRuns } from "@/lib/councils/atlas";
import type { MapPlace, MapStep } from "@/lib/councils/map";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { focusablesIn, nextIndex } from "@/lib/ui/focusTrap";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";

import { AtlasEngine } from "./atlasEngine";

const DIGITS = Array.from({ length: 30 }, (_, i) => String(i % 10));

/**
 * Where it happened, as a screen of its own (1.8, the owner's pick C of
 * r3-10, "the atlas"; his note 40 of build 80: "make the slider its own
 * design, and don't just hide it in the bottom"). The whole phone: the map
 * dragged and pinched; the year large at the top with its age; at the foot a
 * wheel of the events themselves, each row its year and name, the one in the
 * band lit with its date and place, an age's name on its first row, and the
 * whole history small above it. Spin the wheel or play it; between places
 * far apart the view lifts away and comes down again.
 *
 * A layer over the tab bar, its foot at the screen's edge (.safe-pb-edge),
 * closed by its own button, Escape, or Android's back. The page under it does
 * not move (the lock is on <html>, lib/ui/overlay.ts). Its own dark on every
 * palette, as the map on the page (a dark-island). React draws it once;
 * atlasEngine.ts moves it.
 */
export function MapAtlas({
  view,
  land,
  places,
  steps,
  titleKey,
  start,
  play,
  closing,
  onClose,
  onOpenStep,
}: {
  view: [number, number];
  land: string;
  places: MapPlace[];
  steps: MapStep[];
  titleKey: string;
  start: number;
  play: boolean;
  closing: boolean;
  /** Closed, on the step it showed last. */
  onClose: (step: number) => void;
  /** A step's own page, from the band. */
  onOpenStep: (step: number) => void;
}) {
  const { t } = useTranslate();
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const year = useRef<HTMLDivElement>(null);
  const odo = useRef<HTMLSpanElement>(null);
  const era = useRef<HTMLParagraphElement>(null);
  const beyond = useRef<HTMLParagraphElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const mini = useRef<SVGSVGElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const band = useRef<HTMLAnchorElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const engine = useRef<AtlasEngine | null>(null);

  // The latest callbacks, so the engine, made once, always calls the current ones.
  const calls = useRef({ onClose, onOpenStep });
  useEffect(() => {
    calls.current = { onClose, onOpenStep };
  }, [onClose, onOpenStep]);

  const close = () => calls.current.onClose(engine.current?.current() ?? start);

  // Made before the first paint, so the screen never shows a frame unset.
  useLayoutEffect(() => {
    const rows = Array.from(wheel.current!.querySelectorAll<HTMLElement>("[data-row]"));
    const made = new AtlasEngine(
      {
        root: root.current!,
        canvas: canvas.current!,
        top: top.current!,
        year: year.current!,
        odo: odo.current!,
        era: era.current!,
        beyond: beyond.current!,
        panel: panel.current!,
        mini: mini.current!,
        play: playButton.current!,
        wheel: wheel.current!,
        rows,
        band: band.current!,
      },
      {
        view,
        land,
        places,
        steps,
        start,
        play,
        words: { era: (e) => t(eraNameKey(e, "label")), play: t("prayers.play"), pause: t("prayers.pause") },
        open: (i) => calls.current.onOpenStep(i),
      },
    );
    engine.current = made;
    return () => {
      made.destroy();
      engine.current = null;
    };
    // Made once for each opening: the data does not change while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The page behind holds still, and the tab bar steps aside.
  useEffect(() => {
    lockBodyScroll();
    setOverlayOpen(true);
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      unlockBodyScroll();
      setOverlayOpen(false);
    };
  }, []);

  // Escape closes; Tab goes round the atlas and never out to the page behind it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        calls.current.onClose(engine.current?.current() ?? start);
        return;
      }
      if (e.key !== "Tab" || !root.current) return;
      const stops = focusablesIn(root.current);
      if (!stops.length) return;
      e.preventDefault();
      stops[nextIndex(stops.length, stops.indexOf(document.activeElement as HTMLElement), e.shiftKey)]?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [start]);

  useAndroidBack(!closing, close);

  function onBand(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    calls.current.onOpenStep(engine.current?.current() ?? start);
  }

  const runs = eraRuns(steps.map((s) => s.era));
  const firstOfRun = new Set(runs.map((r) => r.a).filter((a) => a > 0));
  const at = steps[start];

  return createPortal(
    <div
      ref={root}
      className="atlas dark-island fixed inset-0 z-[60] font-sans text-paper"
      data-closing={closing ? "" : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <canvas ref={canvas} className="atlas-map" aria-hidden="true" />
      <div className="atlas-vignette" aria-hidden="true" />
      <div className="atlas-topfade" aria-hidden="true" />

      <div ref={top} className="atlas-top">
        <button ref={closeButton} type="button" onClick={close} aria-label={t("common.close")} className="atlas-close tap-press">
          <span className="atlas-plate">
            <ChevronDown size={20} strokeWidth={2} />
          </span>
        </button>
        <h2 id={titleId} className="atlas-title">
          {t(titleKey)}
        </h2>
      </div>

      <div ref={year} className="atlas-year" aria-hidden="true">
        <span ref={odo} className="atlas-odo">
          {[3, 2, 1, 0].map((k) => (
            <span key={k} className="atlas-odo-col">
              <span className="atlas-odo-strip">
                {DIGITS.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </span>
            </span>
          ))}
        </span>
        <p ref={era} className="atlas-era" />
      </div>

      <p ref={beyond} className="atlas-beyond" aria-hidden="true">
        {t("history.map.beyond")}
      </p>

      <div ref={panel} className="atlas-panel safe-pb-edge">
        <div className="atlas-grab" aria-hidden="true" />
        <div className="atlas-head">
          <svg ref={mini} className="atlas-mini" aria-hidden="true" />
          <button ref={playButton} type="button" className="atlas-play tap-press" aria-label={t("prayers.play")}>
            <Play size={18} data-icon="play" />
            <Pause size={18} data-icon="pause" />
          </button>
        </div>
        <div
          ref={wheel}
          className="atlas-wheel"
          role="slider"
          tabIndex={0}
          aria-label={t(titleKey)}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={steps.length - 1}
          aria-valuenow={start}
          aria-valuetext={`${at.year}, ${at.name}`}
        >
          {steps.map((s, i) => (
            <div key={s.href} data-row="" className="atlas-row" aria-hidden="true">
              <span data-row-year="" className="atlas-row-year">
                {s.year}
              </span>
              <span className="atlas-row-text">
                <span data-row-name="" className="atlas-row-name">
                  {s.name}
                </span>
                <span data-row-line="" className="atlas-row-line">
                  {s.date ? (
                    <>
                      {s.date}
                      <i>·</i>
                    </>
                  ) : null}
                  {s.where}
                </span>
              </span>
              {firstOfRun.has(i) ? (
                <span data-row-era="" className="atlas-row-era">
                  {t(eraNameKey(s.era, "short"))}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="atlas-band" aria-hidden="true" />
        <a ref={band} href={at.href} onClick={onBand} className="atlas-band-link">
          {`${at.year}, ${at.name}`}
        </a>
      </div>
    </div>,
    document.body,
  );
}
