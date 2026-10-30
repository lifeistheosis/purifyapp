"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Play } from "@/components/ui/icons/Play";
import { DOOR_ASPECT, stillView } from "@/lib/councils/atlas";
import type { MapItem, MapPlace, MapStep } from "@/lib/councils/map";
import { prefersReducedMotion } from "@/lib/ui/motion";

/** The atlas's script comes when it is first wanted, not with the page. */
const loadAtlas = () => import("./MapAtlas");
const MapAtlas = dynamic(() => loadAtlas().then((m) => m.MapAtlas), { ssr: false });

/**
 * A step's page opened from the atlas, so that coming back to this page
 * (Back) opens the atlas again where the reader was. In memory only: a
 * reload starts afresh.
 */
let away: { path: string; step: number; back: boolean } | null = null;

/**
 * Where it happened (1.8): the map of History's events and the councils
 * (lib/history/map.ts), and on Councils of the councils alone
 * (lib/councils/map.ts). Purify's own dark, the marks softly lit (the
 * owner's pick of 2026-10-24 over an old-map look). No tiles, no map service.
 *
 * Round 3 (the owner's pick C of r3-10, "the atlas", 2026-10-30): on the page
 * the map is a door, its still with every place and Move through the years.
 * It opens the atlas (MapAtlas.tsx), the map as a screen of its own: until
 * then it was drawn 780 px wide in a box that scrolled sideways, its names
 * cut at both edges, with the browser's own range input under it (his note
 * 40 of build 80). It opens at the first event and plays, as the door's own
 * play mark says; with Purify's motion off it opens ready to play. Closed and
 * opened again it carries on from where the reader left it. Under the door
 * the places are listed with their councils and events, each opening its
 * page, as before.
 */
export function CouncilMap({
  view,
  land,
  places,
  beyond,
  steps,
  titleKey = "councils.map.title",
  introKey = "councils.map.intro",
}: {
  view: [number, number];
  land: string;
  places: MapPlace[];
  beyond?: MapItem[];
  steps: MapStep[];
  titleKey?: string;
  introKey?: string;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  const id = useId().replace(/:/g, "");
  const door = useRef<HTMLButtonElement>(null);
  const left = useRef<number | null>(null);
  const [atlas, setAtlas] = useState<{ start: number; play: boolean } | null>(null);
  const [closing, setClosing] = useState(false);
  const still = useMemo(() => stillView(places, view, DOOR_ASPECT), [places, view]);
  const n = steps.length;

  // Back from a step's page opened in the atlas: the atlas again, at that step.
  useEffect(() => {
    const was = away;
    if (!was || !was.back || was.path !== window.location.pathname) return;
    away = null;
    if (was.step < 0 || was.step >= n) return;
    left.current = was.step;
    // Once, on arriving: what the reader left open is only known on the device.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAtlas({ start: was.step, play: false });
  }, [n]);

  /** The atlas fading out, so that opening it again in that moment keeps it open. */
  const leaving = useRef(0);

  const open = useCallback(() => {
    const at = left.current;
    window.clearTimeout(leaving.current);
    setClosing(false);
    setAtlas({ start: at === null || at >= n - 1 ? 0 : at, play: !prefersReducedMotion() });
  }, [n]);

  const close = useCallback((step: number) => {
    left.current = step;
    const done = () => {
      setAtlas(null);
      setClosing(false);
      door.current?.focus({ preventScroll: true });
    };
    window.clearTimeout(leaving.current);
    if (prefersReducedMotion()) return done();
    setClosing(true);
    leaving.current = window.setTimeout(done, 200);
  }, []);

  useEffect(() => {
    const timer = leaving;
    return () => window.clearTimeout(timer.current);
  }, []);

  const openStep = useCallback(
    (step: number) => {
      const href = steps[step]?.href;
      if (!href) return;
      const mark = { path: window.location.pathname, step, back: false };
      away = mark;
      // Coming back is a Back: the atlas opens again only then.
      window.addEventListener("popstate", () => (mark.back = true), { once: true });
      router.push(href);
    },
    [router, steps],
  );

  const first = steps[0]?.year;
  const last = steps[n - 1]?.year;
  const warm = () => void loadAtlas();

  return (
    <section aria-labelledby={`${id}-title`} className="mt-14">
      <h2 id={`${id}-title`} className="font-serif text-title-sm text-paper">
        {t(titleKey)}
      </h2>
      <p className="mt-2 max-w-[720px] font-sans text-detail leading-[1.6] text-paper/55">{t(introKey)}</p>

      {n > 0 ? (
        // dark-island: the map is dark by design (his pick), on Light too.
        <button
          ref={door}
          type="button"
          onClick={open}
          onPointerEnter={warm}
          onPointerDown={warm}
          onFocus={warm}
          aria-haspopup="dialog"
          className="atlas-door dark-island press-card mt-5"
        >
          <svg viewBox={still.join(" ")} preserveAspectRatio="xMidYMid slice" className="atlas-door-still" aria-hidden="true">
            <defs>
              <radialGradient id={`${id}-glow`}>
                <stop offset="0" stopColor="#fff" stopOpacity={0.42} />
                <stop offset="1" stopColor="#fff" stopOpacity={0} />
              </radialGradient>
              <radialGradient id={`${id}-vig`} r="75%">
                <stop offset="0.55" stopColor="#000" stopOpacity={0} />
                <stop offset="1" stopColor="#000" stopOpacity={0.6} />
              </radialGradient>
            </defs>
            <rect x={still[0]} y={still[1]} width={still[2]} height={still[3]} fill="#0d0d0e" />
            <path d={land} fill="#1d1d1f" stroke="#3d3d40" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
            {places.map((p) => (
              <g key={p.id}>
                <circle cx={p.x} cy={p.y} r={15} fill={`url(#${id}-glow)`} />
                <circle cx={p.x} cy={p.y} r={5.5} fill="#fff" opacity={0.92} />
              </g>
            ))}
            <rect x={still[0]} y={still[1]} width={still[2]} height={still[3]} fill={`url(#${id}-vig)`} />
          </svg>
          <span className="atlas-door-foot">
            <span className="atlas-door-years">
              {first}
              <span>–</span>
              {last}
            </span>
            <span className="atlas-door-go">
              <Play size={14} />
              <span>{t("councils.map.slider")}</span>
            </span>
          </span>
        </button>
      ) : null}

      <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {places.map((p) => (
          <li key={p.id} id={`place-${p.id}`} className="scroll-mt-24">
            <p className="font-sans text-caption font-semibold text-paper/70">{p.place}</p>
            <PlaceItems items={p.items} />
          </li>
        ))}
        {beyond?.length ? (
          <li id={`place-${id}-beyond`} className="scroll-mt-24">
            <p className="font-sans text-caption font-semibold text-paper/70">{t("history.map.beyond")}</p>
            <PlaceItems items={beyond} />
          </li>
        ) : null}
      </ul>

      {atlas ? (
        <MapAtlas
          view={view}
          land={land}
          places={places}
          steps={steps}
          titleKey={titleKey}
          start={atlas.start}
          play={atlas.play}
          closing={closing}
          onClose={close}
          onOpenStep={openStep}
        />
      ) : null}
    </section>
  );
}

function PlaceItems({ items }: { items: MapItem[] }) {
  return (
    <ul className="mt-1 space-y-0.5">
      {items.map((c) => (
        <li key={c.href}>
          <Link href={c.href} className="font-serif text-ui text-paper/85 underline-offset-4 hover:underline">
            {c.name}
          </Link>{" "}
          <span className="font-sans text-caption text-paper/50">{c.year}</span>
        </li>
      ))}
    </ul>
  );
}
