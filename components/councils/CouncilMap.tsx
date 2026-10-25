"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { MapPlace } from "@/lib/councils/map";

/**
 * Where the councils met (1.8): the Mediterranean's coastline, a mark for
 * each city, and under it the cities with their councils, each opening its
 * page. A slider walks the years from the first council to the last; a
 * city lights up when its first council has met, and the councils still to
 * come are quiet in the list. Purify's own dark, the marks softly lit (the
 * owner's pick of 2026-10-24 over an old-map look). No tiles, no map service.
 */
export function CouncilMap({ view, land, places }: { view: [number, number]; land: string; places: MapPlace[] }) {
  const { t } = useTranslate();
  const id = useId().replace(/:/g, "");
  const years = useMemo(() => [...new Set(places.flatMap((p) => p.councils.map((c) => c.year)))].sort((a, b) => a - b), [places]);
  const [step, setStep] = useState(years.length - 1);
  const year = years[step];
  const latest = places.flatMap((p) => p.councils).find((c) => c.year === year);
  const [w, h] = view;

  return (
    <section aria-labelledby={`${id}-title`} className="mt-14">
      <h2 id={`${id}-title`} className="font-serif text-title-sm text-paper">
        {t("councils.map.title")}
      </h2>
      <p className="mt-2 max-w-[720px] font-sans text-detail leading-[1.6] text-paper/55">{t("councils.map.intro")}</p>

      <div className="mt-5 overflow-hidden rounded-md border border-paper/12 bg-[#0d0d0e]">
        <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby={`${id}-title`} className="block h-auto w-full">
          <defs>
            <filter id={`${id}-glow`} x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <path d={land} fill="#1d1d1f" stroke="#3d3d40" strokeWidth={0.6} />
          {places.map((p) => {
            const met = p.councils[0].year <= year;
            const lx = p.side === "left" ? p.x - 11 : p.side === "right" ? p.x + 11 : p.x;
            const ly = p.side === "up" ? p.y - 13 : p.side === "down" ? p.y + 25 : p.y + 5;
            const anchor = p.side === "left" ? "end" : p.side === "right" ? "start" : "middle";
            const href = p.councils.length === 1 ? `/councils/${p.councils[0].slug}` : `#place-${p.id}`;
            return (
              <a
                key={p.id}
                href={href}
                aria-label={p.councils.length === 1 ? `${p.councils[0].byname}, ${p.councils[0].year}` : p.place}
              >
                <g opacity={met ? 1 : 0.18}>
                <circle cx={p.x} cy={p.y} r={p.councils.length > 1 ? 11 : 9} fill="#f3f0ea" opacity={0.35} filter={`url(#${id}-glow)`} />
                <circle cx={p.x} cy={p.y} r={p.councils.length > 1 ? 5.5 : 4.5} fill="#f3f0ea" />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={anchor}
                  fontSize={15}
                  fill="#d9d5cd"
                  className="font-sans"
                >
                  {p.place}
                </text>
                </g>
              </a>
            );
          })}
        </svg>
      </div>

      <div className="mt-4">
        <label htmlFor={`${id}-years`} className="flex items-baseline justify-between gap-3 font-sans text-caption text-paper/60">
          <span>{t("councils.map.slider")}</span>
          <span className="tabular-nums text-paper/80">
            {t("councils.map.until", { year })}
            {latest ? ` · ${latest.byname}` : ""}
          </span>
        </label>
        <input
          id={`${id}-years`}
          type="range"
          min={0}
          max={years.length - 1}
          step={1}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
          aria-valuetext={t("councils.map.until", { year })}
          className="mt-2 w-full accent-paper"
        />
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
        {places.map((p) => (
          <li key={p.id} id={`place-${p.id}`} className="scroll-mt-24">
            <p className="font-sans text-caption font-semibold text-paper/70">{p.place}</p>
            <ul className="mt-1 space-y-0.5">
              {p.councils.map((c) => (
                <li key={c.slug} className={c.year <= year ? "" : "opacity-40"}>
                  <Link href={`/councils/${c.slug}`} className="font-serif text-ui text-paper/85 underline-offset-4 hover:underline">
                    {c.byname}
                  </Link>{" "}
                  <span className="font-sans text-caption text-paper/50">{c.year}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
