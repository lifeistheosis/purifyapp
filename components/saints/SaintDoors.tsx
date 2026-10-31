"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { ClosedBook } from "@/components/ui/icons/ClosedBook";
import { Graph } from "@/components/ui/icons/Graph";
import { Note } from "@/components/ui/icons/Note";
import { cn } from "@/lib/cn";
import type { SaintDoor, SaintTab } from "@/lib/saints/page";
import { hashFor, tabFromHash } from "@/lib/ui/sectionTabs";

// On the server there is no layout to read (components/nav/ScrollResetBridge.tsx).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * The four doors of a saint's page (1.8, round 3b D, "Fade and doors", the
 * owner's pick of 2026-10-27): under the icon, his name and the row, four
 * square doors, Life, Writings, Web and Hymns, that switch what is shown
 * below them. The design's own drawing: 74px tall, rounded, the open one
 * filled. Only the doors a saint has are drawn (lib/saints/page.ts,
 * saintDoors), so most saints have two or three; a saint with his Life alone
 * has no doors, only his Life.
 *
 * Life, Writings and Hymns are parts of the page, every one of them in it and
 * the others `hidden`, so a search engine still reads them all; the open one
 * is kept in the address (#writings) with replaceState, read in the first
 * render on the device, as the 1.7 switch did (lib/ui/sectionTabs.ts), so a
 * reader back from a work finds Writings open. The Web door is a link: it
 * opens the saint web on his name (app/(app)/saints/[slug]/web).
 *
 * The doors are toggle buttons and a link, in the design's order. A tablist
 * cannot hold a link, and moving the Web door to the end to make room for one
 * would change the order the owner chose.
 *
 * Once the doors have gone up under the bar, the 1.7 switch comes back pinned
 * under it, the doors in one slim row, so a reader deep in a Life can still
 * reach the Writings. It is a copy for the eye and the finger (`aria-hidden`,
 * out of the tab order): the doors above stay the ones a keyboard and a
 * screen reader use. Fixed, not sticky, so its arrival moves nothing; solid,
 * with no blur, for the reason the 1.7 switch gave.
 */

export type SaintDoorPanels = Partial<Record<SaintTab, ReactNode>>;

const LABEL: Record<SaintDoor, string> = {
  life: "saints.tab.life",
  writings: "saints.writings",
  web: "saints.door.web",
  hymns: "saints.door.hymns",
};

function DoorIcon({ door, size }: { door: SaintDoor; size: number }) {
  if (door === "life") return <ClosedBook size={size} />;
  if (door === "writings") return <Book size={size} />;
  if (door === "web") return <Graph size={size} />;
  return <Note size={size} />;
}

const COLS: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

const DOOR =
  "tap-press flex h-[74px] min-w-0 flex-col items-center justify-center gap-[7px] rounded-[16px] border px-1 font-sans text-detail font-semibold leading-none motion-safe:transition-colors";
const DOOR_OFF = "border-paper/[0.09] bg-paper/[0.06] text-paper hover:bg-paper/[0.1]";
const DOOR_ON = "border-paper bg-paper text-night";

const SLIM =
  "flex min-h-11 min-w-0 items-center justify-center gap-1.5 truncate rounded-pill px-2 font-sans text-detail font-semibold";

const DOOR_EVENT = "purify:saint-door";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(DOOR_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(DOOR_EVENT, onChange);
  };
}

export function SaintDoors({
  doors,
  panels,
  webHref,
  saintName,
}: {
  /** The saint's doors, in order (lib/saints/page.ts, saintDoors). */
  doors: readonly SaintDoor[];
  panels: SaintDoorPanels;
  /** Where the Web door goes. */
  webHref?: string;
  saintName: string;
}) {
  const { t } = useTranslate();
  const shown = doors.filter((d) => d !== "web" || Boolean(webHref));
  const parts = shown.filter((d): d is SaintTab => d !== "web");
  const key = parts.join(" ");
  const current = useSyncExternalStore(
    subscribe,
    () => tabFromHash(window.location.hash, key.split(" ") as SaintTab[]),
    () => parts[0],
  );
  const doorsRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const settle = useRef(false);
  const [pinned, setPinned] = useState(false);
  const slim = parts.length > 1;

  // The slim row arrives once the doors have gone up under the bar: one
  // observer on the doors, speaking only when they cross the bar's foot,
  // which is wherever the slim row's own CSS pins it (under the phone's bar,
  // or the computer's header). Made again when the screen crosses the width
  // where the two bars change places.
  useEffect(() => {
    const doorsEl = doorsRef.current;
    const strip = stripRef.current;
    if (!slim || !doorsEl || !strip || typeof IntersectionObserver === "undefined") return;
    let io: IntersectionObserver | null = null;
    const watch = () => {
      io?.disconnect();
      const top = Math.round(parseFloat(window.getComputedStyle(strip).top) || 0);
      io = new IntersectionObserver(
        ([entry]) => {
          const edge = entry.rootBounds?.top ?? top;
          setPinned(!entry.isIntersecting && entry.boundingClientRect.bottom <= edge + 1);
        },
        { rootMargin: `-${top}px 0px 0px 0px`, threshold: 0 },
      );
      io.observe(doorsEl);
    };
    watch();
    const wide = window.matchMedia("(min-width: 768px)");
    wide.addEventListener?.("change", watch);
    return () => {
      io?.disconnect();
      wide.removeEventListener?.("change", watch);
    };
  }, [slim]);

  // After a switch made from the slim row, the new part starts right under it.
  useIsoLayoutEffect(() => {
    if (!settle.current) return;
    settle.current = false;
    const strip = stripRef.current;
    const panelsEl = panelsRef.current;
    if (!strip || !panelsEl) return;
    const off = panelsEl.getBoundingClientRect().top - strip.getBoundingClientRect().bottom;
    if (Math.abs(off) > 1) window.scrollBy({ top: off, left: 0, behavior: "instant" as ScrollBehavior });
  }, [current]);

  function select(id: SaintTab, fromStrip: boolean) {
    if (id === current) return;
    settle.current = fromStrip;
    const url = window.location.pathname + window.location.search + hashFor(id, parts);
    // replaceState, never push: back leaves the page, it does not walk the doors.
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(DOOR_EVENT));
  }

  if (shown.length < 2) {
    return <div className="pt-4">{panels[parts[0]]}</div>;
  }

  return (
    <div>
      <div
        ref={doorsRef}
        role="group"
        aria-label={t("saints.sectionSwitcher")}
        className={cn("saint-head-in mx-auto grid max-w-[420px] gap-2 md:mx-0", COLS[shown.length])}
        style={{ "--i": 3 } as CSSProperties}
      >
        {shown.map((door) =>
          door === "web" ? (
            <Link
              key={door}
              href={webHref!}
              prefetch={false}
              aria-label={t("saints.door.webAria", { name: saintName })}
              // What the release's tour lights for the saint web (lib/whatsNew/tour.ts).
              data-tour="saint-web"
              className={cn(DOOR, DOOR_OFF)}
            >
              <DoorIcon door={door} size={20} />
              <span className="line-clamp-2 max-w-full text-center leading-[1.15] [overflow-wrap:anywhere]">{t(LABEL[door])}</span>
            </Link>
          ) : (
            <button
              key={door}
              id={`saint-door-${door}`}
              type="button"
              aria-pressed={door === current}
              aria-controls={`saint-panel-${door}`}
              onClick={() => select(door, false)}
              className={cn(DOOR, door === current ? DOOR_ON : DOOR_OFF)}
            >
              <DoorIcon door={door} size={20} />
              <span className="line-clamp-2 max-w-full text-center leading-[1.15] [overflow-wrap:anywhere]">{t(LABEL[door])}</span>
            </button>
          ),
        )}
      </div>

      {slim ? (
        <div
          ref={stripRef}
          aria-hidden
          data-pinned={pinned ? "" : undefined}
          // On a phone a solid band under the bar, as the 1.7 switch was; on a
          // computer the row alone, clear of the study rail beside the page.
          className="saint-doors-pin fixed inset-x-0 top-12 below-topbar z-20 bg-night px-5 py-2 md:pointer-events-none md:top-[72px] md:bg-transparent md:px-8"
        >
          <div className="mx-auto w-full max-w-[1100px]">
            <div className="mx-auto grid max-w-[420px] grid-flow-col auto-cols-fr gap-1 rounded-pill border border-paper/10 bg-paper/[0.03] p-1 md:pointer-events-auto md:mx-0 md:bg-night">
              {shown.map((door) =>
                door === "web" ? (
                  <Link key={door} href={webHref!} prefetch={false} tabIndex={-1} className={cn(SLIM, "text-paper/65 hover:text-paper")}>
                    <DoorIcon door={door} size={15} />
                    {t(LABEL[door])}
                  </Link>
                ) : (
                  <button
                    key={door}
                    type="button"
                    tabIndex={-1}
                    onClick={() => select(door, true)}
                    className={cn(SLIM, door === current ? "bg-paper text-night" : "text-paper/65 hover:text-paper")}
                  >
                    <DoorIcon door={door} size={15} />
                    {t(LABEL[door])}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div ref={panelsRef} className="pt-6">
        {parts.map((id) => (
          <div
            key={id}
            id={`saint-panel-${id}`}
            role="region"
            aria-labelledby={`saint-door-${id}`}
            hidden={id !== current}
          >
            {panels[id]}
          </div>
        ))}
      </div>
    </div>
  );
}
