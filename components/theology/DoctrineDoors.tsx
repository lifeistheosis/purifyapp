"use client";

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
import { Codex } from "@/components/ui/icons/Codex";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { LinkChain } from "@/components/ui/icons/LinkChain";
import { cn } from "@/lib/cn";
import { SLIM_SIZES, doorsForAddress, slimLinesHeight, slimSize, type DoctrineDoor } from "@/lib/theology/page";
import { scrollBehavior } from "@/lib/ui/motion";
import { hashFor, tabFromHash } from "@/lib/ui/sectionTabs";

// On the server there is no layout to read (components/nav/ScrollResetBridge.tsx).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * A doctrine's four doors (1.8, round 3 r3-04, part 2, B's doors in the
 * owner's B and C mix of 2026-10-30): under the cover, the title and Read the
 * study, four doors, The study, The Fathers, Scripture and Related, that
 * switch what is shown below them, "the same doors a saint's page has, so
 * Theology chooses the way the rest of Purify does" (components/saints/
 * SaintDoors.tsx, whose look and ways these are). The Fathers' door holds C's
 * deck of passages (FathersDeck).
 *
 * Every part is in the page, the others `hidden`, so a search engine still
 * reads them all. The open door is kept in the address (#study, #scripture,
 * #related; none for the door the page opens on) with replaceState, read in
 * the first render on the device (lib/ui/sectionTabs.ts), so a reader back
 * from a Father's work finds the door they left. Only the doors a study has
 * are drawn (lib/theology/page.ts, doctrineDoors).
 *
 * Once the doors have gone up under the bar, they come back as one slim row
 * pinned under it, so a reader deep in the study can still reach the
 * Fathers. A copy for the eye and the finger (`aria-hidden`, out of the tab
 * order), as on a saint's page.
 */

const LABEL: Record<DoctrineDoor, string> = {
  study: "study.theology.door.study",
  fathers: "footer.theFathers",
  scripture: "study.history.category.scripture.label",
  related: "study.related",
};

function DoorIcon({ door, size }: { door: DoctrineDoor; size: number }) {
  if (door === "study") return <ClosedBook size={size} />;
  if (door === "fathers") return <HaloedHead size={size} />;
  if (door === "scripture") return <Codex size={size} />;
  return <LinkChain size={size} />;
}

const COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

const DOOR =
  "tap-press flex h-[60px] min-w-0 flex-col items-center justify-center gap-[7px] rounded-[16px] border px-1 font-sans text-[12.5px] font-semibold leading-none motion-safe:transition-colors";
const DOOR_OFF = "theology-door border-paper/10 text-paper hover:bg-paper/[0.1]";
const DOOR_ON = "reader-lit border-paper bg-paper text-night";

/**
 * A door in the slim row: its label alone, no icon, set at the row's size
 * (--slim-size, which fitSlimRow below brings down until every label reads
 * whole). The doors share the row equally, and a door whose longest word
 * needs more takes it from the others (its min-content width, globals.css
 * .doctrine-slim-door). A label wraps between its words, onto two lines at
 * most; it is never cut. Build 83's walk found it cut at 390px ("The s...",
 * "Scrip...") when each door carried its icon as well.
 */
const SLIM =
  "doctrine-slim-door flex min-h-11 flex-1 basis-0 items-center justify-center rounded-pill px-1 py-1 text-center font-sans font-semibold leading-[1.1]";

const DOOR_EVENT = "purify:doctrine-door";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(DOOR_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(DOOR_EVENT, onChange);
  };
}

/**
 * Set the slim row's labels at the largest size, 13px down to 9px, at which
 * every one reads whole: the row holds all four doors, no label is wider
 * than its door, and none runs past two lines (lib/theology/page.ts,
 * slimSize). The longest of the 21 catalogs' labels (Georgian's
 * დაკავშირებული, Russian's Священное Писание) come down a step or two at
 * 360px. Should nothing fit even at 9px, a word may break inside itself
 * (data-squeezed) rather than be cut.
 */
function fitSlimRow(row: HTMLElement): void {
  delete row.dataset.squeezed;
  const labels = [...row.querySelectorAll<HTMLElement>("[data-slim-label]")];
  const fits = (size: number) => {
    row.style.setProperty("--slim-size", `${size}px`);
    if (row.scrollWidth > row.clientWidth + 1) return false;
    return labels.every((label) => label.scrollWidth <= label.clientWidth + 1 && label.offsetHeight <= slimLinesHeight(size, 2) + 1);
  };
  if (slimSize(fits) === null) {
    row.style.setProperty("--slim-size", `${SLIM_SIZES.floor}px`);
    row.dataset.squeezed = "";
  }
}

/** Open a door from outside the doors (Read the study), and bring its part into view. */
export function openDoctrineDoor(door: DoctrineDoor, doors: readonly DoctrineDoor[]): void {
  const order = doorsForAddress(doors);
  const url = window.location.pathname + window.location.search + hashFor(door, order);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(DOOR_EVENT));
  // After the part is shown: its top under the bar and the slim row
  // (.doctrine-panels keeps that room), smoothly only while Purify's motion is on.
  window.requestAnimationFrame(() => {
    document.getElementById("doctrine-panels")?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
  });
}

export function DoctrineDoors({ doors, panels }: { doors: readonly DoctrineDoor[]; panels: Partial<Record<DoctrineDoor, ReactNode>> }) {
  const { t } = useTranslate();
  const order = doorsForAddress(doors);
  const key = order.join(" ");
  const current = useSyncExternalStore(
    subscribe,
    () => tabFromHash(window.location.hash, key.split(" ") as DoctrineDoor[]),
    () => order[0],
  );
  const doorsRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const slimRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const settle = useRef(false);
  const [pinned, setPinned] = useState(false);
  const many = doors.length > 1;
  const labels = doors.map((door) => t(LABEL[door])).join("\n");

  // The slim row's labels read whole in every language and at every width:
  // set again when the words change (another language) and when the screen
  // or the fonts do. Hidden until pinned, but laid out, so it can be measured.
  useIsoLayoutEffect(() => {
    const row = slimRef.current;
    if (!many || !row) return;
    const fit = () => fitSlimRow(row);
    fit();
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) fit();
    });
    window.addEventListener("resize", fit);
    return () => {
      live = false;
      window.removeEventListener("resize", fit);
    };
  }, [many, labels]);

  // The slim row arrives once the doors have gone up under the bar, as on a
  // saint's page: one observer on the doors, speaking only when they cross
  // the bar's foot.
  useEffect(() => {
    const doorsEl = doorsRef.current;
    const strip = stripRef.current;
    if (!many || !doorsEl || !strip || typeof IntersectionObserver === "undefined") return;
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
  }, [many]);

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

  function select(id: DoctrineDoor, fromStrip: boolean) {
    if (id === current) return;
    settle.current = fromStrip;
    const url = window.location.pathname + window.location.search + hashFor(id, order);
    // replaceState, never push: back leaves the page, it does not walk the doors.
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(DOOR_EVENT));
  }

  return (
    <div>
      {many ? (
        <div
          ref={doorsRef}
          role="group"
          aria-label={t("saints.sectionSwitcher")}
          data-doctrine-doors=""
          className={cn("saint-head-in mx-auto grid max-w-[420px] gap-2 md:mx-0", COLS[doors.length])}
          style={{ "--i": 3 } as CSSProperties}
        >
          {doors.map((door) => (
            <button
              key={door}
              id={`doctrine-door-${door}`}
              type="button"
              aria-pressed={door === current}
              aria-controls={`doctrine-panel-${door}`}
              onClick={() => select(door, false)}
              className={cn(DOOR, door === current ? DOOR_ON : DOOR_OFF)}
            >
              <DoorIcon door={door} size={20} />
              <span className="line-clamp-2 max-w-full text-center leading-[1.15] [overflow-wrap:anywhere]">{t(LABEL[door])}</span>
            </button>
          ))}
        </div>
      ) : null}

      {many ? (
        <div
          ref={stripRef}
          aria-hidden
          data-pinned={pinned ? "" : undefined}
          // On a phone a solid band under the bar; on a computer the row alone.
          // 16px at its sides on a phone, a little less than the page's 20,
          // so the labels have the room at 360px.
          className="saint-doors-pin fixed inset-x-0 top-12 below-topbar z-20 bg-night px-4 py-2 md:pointer-events-none md:top-[72px] md:bg-transparent md:px-8"
        >
          <div className="mx-auto w-full max-w-[760px]">
            <div
              ref={slimRef}
              data-doctrine-slim=""
              className="doctrine-slim mx-auto flex max-w-[420px] gap-1 overflow-hidden rounded-pill border border-paper/10 bg-paper/[0.03] p-1 md:pointer-events-auto md:mx-0 md:bg-night"
            >
              {doors.map((door) => (
                <button
                  key={door}
                  type="button"
                  tabIndex={-1}
                  onClick={() => select(door, true)}
                  className={cn(SLIM, door === current ? "bg-paper text-night" : "text-paper/65 hover:text-paper")}
                >
                  <span data-slim-label="" className="doctrine-slim-label">
                    {t(LABEL[door])}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div ref={panelsRef} id="doctrine-panels" className="doctrine-panels pt-6">
        {doors.map((id) => (
          <div
            key={id}
            id={`doctrine-panel-${id}`}
            role="region"
            aria-labelledby={many ? `doctrine-door-${id}` : undefined}
            hidden={id !== current}
          >
            {panels[id]}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Read the study (C): the page's main button, which opens the long form,
 * the study's door, and brings it into view.
 */
export function ReadTheStudy({ doors, minutes }: { doors: readonly DoctrineDoor[]; minutes?: number }) {
  const { t } = useTranslate();
  return (
    <button
      type="button"
      data-read-study=""
      onClick={() => openDoctrineDoor("study", doors)}
      className="reader-lit tap-press flex h-[46px] w-full items-center justify-center gap-2 rounded-pill bg-paper px-5 font-sans text-[15px] font-semibold text-night md:w-auto md:min-w-[280px]"
    >
      <Book size={18} />
      {t("study.theology.readStudy")}
      {minutes ? <span className="font-medium opacity-55">{t("bible.minRead", { minutes })}</span> : null}
    </button>
  );
}
