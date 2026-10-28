"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import {
  CENTER_SIZE,
  NODE_SIZE,
  WEB_WIDTH,
  across,
  filtersOf,
  lineStyle,
  primaryTie,
  webFilters,
  webLayout,
  type SaintWebData,
  type WebFilter,
  type WebNode,
} from "@/lib/saints/webLayout";

import { WebAvatar } from "./WebAvatar";
import { FILTER_LABEL, tagOf, tieHeading, tieHref } from "./webWords";

/** Legible over the lines and the icon's light, in the page's own ground. */
const LABEL_SHADOW = "[text-shadow:0_1px_6px_var(--color-night),0_0_2px_var(--color-night)]";

/**
 * The saint web's first view (1.8, round 1 A, "Constellation", the owner's
 * pick with B and a switch): the saint in the middle and everyone the app's
 * data joins him to around him (lib/saints/web.ts). The line's style says how
 * they are joined: solid for disciples and councils, dashed for a moment of
 * the Church's history, dotted for a Life that names them. A father joined
 * only through a council hangs from that council. Chips pick out one kind,
 * and only the kinds this web has are offered.
 *
 * Tapping a saint opens the sheet at the foot of the screen: who he is, how
 * he is joined, each in the data's own words, and two ways on, to his page or
 * to his own web. The strongest tie is open when the screen arrives, as the
 * design shows it. The sheet stays at the foot while the web scrolls past it;
 * it is solid, with no blur, because a blurred layer over a moving page is
 * repainted on every frame on Android.
 *
 * Places come from lib/saints/webLayout.ts, held there by a test so no two
 * saints' names touch: a share of the width across, pixels down.
 */
export function WebConstellation({ data }: { data: SaintWebData }) {
  const { t } = useTranslate();
  const { center, nodes } = data;
  const layout = useMemo(() => webLayout(nodes.length), [nodes.length]);
  const filters = useMemo(() => webFilters(nodes), [nodes]);
  const [filter, setFilter] = useState<WebFilter | "all">("all");
  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? "");
  const placeOf = new Map(nodes.map((n, i) => [n.id, layout.places[i]]));
  const lit = (node: WebNode) => filter === "all" || filtersOf(node).has(filter);
  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0];

  function pick(next: WebFilter | "all") {
    setFilter(next);
    const current = nodes.find((n) => n.id === selectedId);
    if (next !== "all" && current && !filtersOf(current).has(next)) {
      const first = nodes.find((n) => filtersOf(n).has(next));
      if (first) setSelectedId(first.id);
    }
  }

  return (
    <div>
      {filters.length ? (
        <div className="no-scrollbar -mx-5 flex gap-[7px] overflow-x-auto px-5 pb-1 pt-1 md:mx-0 md:px-0">
          {(["all", ...filters] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => pick(f)}
              className={cn(
                "tap-press hit-44 inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-pill border px-3 font-sans text-detail motion-safe:transition-colors",
                filter === f
                  ? "border-paper bg-paper font-semibold text-night"
                  : "border-paper/10 bg-paper/[0.06] font-medium text-paper/80 hover:text-paper",
              )}
            >
              {t(FILTER_LABEL[f])}
            </button>
          ))}
        </div>
      ) : null}

      {/* The light reaches past the screen's sides and is cut there, never the page made wider. */}
      <div className="-mx-5 overflow-x-clip px-5 md:mx-0 md:px-0">
        <div data-saint-web-canvas className="relative mx-auto mt-2 w-full max-w-[560px]" style={{ height: layout.height }}>
          {/* The icon's own light behind him: the one warmth the design allows. */}
          {center.icon ? (
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-cover bg-center opacity-30 blur-[52px]"
              style={{ top: layout.center.y - 230, backgroundImage: `url(${center.icon})` }}
            />
          ) : null}

          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${WEB_WIDTH} ${layout.height}`}
            preserveAspectRatio="none"
          >
            {nodes.map((node) => {
              const from = placeOf.get(node.id)!;
              const tie = primaryTie(node);
              const to = (tie.via && placeOf.get(tie.via)) || layout.center;
              const style = lineStyle(tie.kind);
              const on = node.id === selected?.id;
              return (
                <line
                  key={node.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={on ? 1.8 : style === "dot" ? 2 : 1.2}
                  strokeLinecap={style === "dot" ? "round" : undefined}
                  strokeDasharray={style === "dash" ? "5 5" : style === "dot" ? "0.1 5" : undefined}
                  className={cn(
                    "motion-safe:transition-opacity",
                    on ? "stroke-paper/80" : "stroke-paper/25",
                    lit(node) ? "opacity-100" : "opacity-20",
                  )}
                />
              );
            })}
          </svg>

          {/* The saint in the middle. */}
          <div
            className="absolute flex w-[180px] -translate-x-1/2 flex-col items-center"
            style={{ left: "50%", top: layout.center.y - CENTER_SIZE / 2 }}
          >
            <span className="rounded-full shadow-[0_0_0_4px_var(--color-night),0_0_0_5.5px_color-mix(in_srgb,var(--color-paper)_55%,transparent),0_14px_40px_rgb(0_0_0/0.55)]">
              <WebAvatar node={{ kind: "saint", id: "center", person: center, ties: [] }} size={CENTER_SIZE} />
            </span>
            <span className={cn("mt-2.5 line-clamp-2 text-center font-serif text-[16px] font-bold leading-[1.2] text-paper", LABEL_SHADOW)}>
              {center.short}
            </span>
          </div>

          {nodes.map((node) => {
            const p = placeOf.get(node.id)!;
            const on = node.id === selected?.id;
            const name = node.kind === "saint" ? node.person.short : node.name;
            const tag = tagOf(node, t);
            return (
              <button
                key={node.id}
                type="button"
                aria-pressed={on}
                aria-label={tag ? `${name}, ${tag}` : name}
                onClick={() => setSelectedId(node.id)}
                className={cn(
                  "tap-press absolute flex w-[25.6%] -translate-x-1/2 flex-col items-center rounded-[14px] text-center motion-safe:transition-opacity",
                  lit(node) ? "opacity-100" : "opacity-25",
                )}
                style={{ left: across(p.x), top: p.y - NODE_SIZE / 2 }}
              >
                <span
                  className={cn(
                    "rounded-full",
                    node.kind === "council" && "rounded-[13px]",
                    on && "shadow-[0_0_0_3px_var(--color-night),0_0_0_4.5px_var(--color-paper)]",
                  )}
                >
                  <WebAvatar node={node} size={NODE_SIZE} />
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 line-clamp-2 font-sans text-[11.5px] font-semibold leading-[1.22]",
                    node.kind === "saint" && !node.person.icon ? "text-paper/75" : "text-paper/95",
                    LABEL_SHADOW,
                  )}
                >
                  {name}
                </span>
                {tag ? (
                  <span aria-hidden className={cn("mt-0.5 max-w-full truncate font-sans text-[10.5px] text-paper/50", LABEL_SHADOW)}>
                    {tag}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {selected ? <WebSheet node={selected} /> : null}
    </div>
  );
}

/** How the chosen saint is joined to the one in the middle, and the ways on. */
function WebSheet({ node }: { node: WebNode }) {
  const { t } = useTranslate();
  const name = node.kind === "saint" ? node.person.name : node.name;
  const tag = tagOf(node, t);
  const sub = node.kind === "saint" ? [tag, node.person.years].filter(Boolean).join(" · ") : tag;
  const ties = node.ties.slice(0, 3);
  return (
    <section
      aria-live="polite"
      className="saint-web-sheet sticky z-10 -mx-5 mt-3 rounded-t-[26px] border-t border-paper/10 bg-night-soft px-5 pb-5 pt-4 md:mx-auto md:mb-10 md:max-w-[560px] md:rounded-[26px] md:border"
    >
      <div className="flex items-center gap-3">
        <WebAvatar node={node} size={46} />
        <div className="min-w-0">
          <h2 className="truncate text-[18px] leading-tight text-paper">{name}</h2>
          {sub ? <p className="mt-0.5 truncate font-sans text-detail text-paper/55">{sub}</p> : null}
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {ties.map((tie, i) => {
          const heading = tieHeading(tie, t);
          const href = tieHref(tie);
          return (
            <div key={i}>
              {heading ? (
                href ? (
                  <Link href={href} prefetch={false} className="font-sans text-caption font-semibold text-paper/55 underline-offset-4 hover:text-paper hover:underline">
                    {heading}
                  </Link>
                ) : (
                  <p className="font-sans text-caption font-semibold text-paper/55">{heading}</p>
                )
              ) : null}
              <p
                className={cn(
                  "mt-1 leading-[1.45] text-paper/85",
                  tie.kind === "life" ? "font-serif text-[15px] italic" : "font-sans text-[14.5px]",
                )}
              >
                {tie.text}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2.5">
        {node.kind === "saint" ? (
          <>
            <Link
              href={`/saints/${node.person.slug}`}
              className="tap-press grid min-h-11 flex-1 place-items-center rounded-pill bg-paper px-3 text-center font-sans text-ui font-semibold text-night"
            >
              {t(node.person.pronoun === "her" ? "saints.web.openHerPage" : "saints.web.openHisPage")}
            </Link>
            <Link
              href={`/saints/${node.person.slug}/web`}
              className="tap-press grid min-h-11 flex-1 place-items-center rounded-pill border border-paper/25 px-3 text-center font-sans text-ui font-semibold text-paper"
            >
              {t("saints.web.center")}
            </Link>
          </>
        ) : (
          <Link
            href={`/councils/${node.slug}`}
            className="tap-press grid min-h-11 flex-1 place-items-center rounded-pill bg-paper px-3 text-center font-sans text-ui font-semibold text-night"
          >
            {t("saints.web.openCouncil")}
          </Link>
        )}
      </div>
    </section>
  );
}
