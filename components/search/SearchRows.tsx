"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrowUpLeft } from "@/components/ui/icons/ArrowUpLeft";
import { Book } from "@/components/ui/icons/Book";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Cart } from "@/components/ui/icons/Cart";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Church } from "@/components/ui/icons/Church";
import { Clock } from "@/components/ui/icons/Clock";
import { ClosedBook } from "@/components/ui/icons/ClosedBook";
import { Compass } from "@/components/ui/icons/Compass";
import { Cross } from "@/components/ui/icons/Cross";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Hands } from "@/components/ui/icons/Hands";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Lyre } from "@/components/ui/icons/Lyre";
import { NoSignal } from "@/components/ui/icons/NoSignal";
import { Note } from "@/components/ui/icons/Note";
import { Orans } from "@/components/ui/icons/Orans";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Search } from "@/components/ui/icons/Search";
import { Settings } from "@/components/ui/icons/Settings";
import { Shield } from "@/components/ui/icons/Shield";
import { PurifyMark } from "@/components/ui/PurifyMark";
import { cn } from "@/lib/cn";
import { iconFace } from "@/lib/saints/iconFaces";
import { hitParts, kindIn, pictureFor, type SearchRow } from "@/lib/search/engine";
import { DOOR_KINDS, KIND_LABEL, doorOf, type DoorId, type KindId } from "@/lib/search/places";

/*
 * The one set of rows the search draws (1.8, the owner's pick of r3-12):
 * a result, a word (recent or one that finishes the typed one), the eyebrow
 * over a group, the doors, a place's kinds as B's underlined strip, the top
 * result as a band over its picture, and the quiet lines for nothing found
 * and no signal. Drawn from the page's tokens, so every palette follows.
 */

type Glyph = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const KIND_GLYPH: Readonly<Record<KindId, Glyph>> = {
  doctrine: Cross,
  topics: Book,
  heresies: Scroll,
  apologetics: Shield,
  councils: Church,
  fathers: HaloedHead,
  dictionary: Book,
  saints: HaloedHead,
  writings: ClosedBook,
  rules: Hands,
  akathists: Lyre,
  chants: Note,
  lessons: Orans,
  plans: Calendar,
  walkthroughs: Compass,
};

/** A row's glyph: by its kind behind the door it is shown in, else by its group. */
export function glyphFor(row: SearchRow, door: DoorId): Glyph {
  for (const d of [door, "theology", "saints", "prayers", "reading", "councils"] as DoorId[]) {
    if (!DOOR_KINDS[d]) continue;
    const kind = kindIn(row, d);
    if (kind) return KIND_GLYPH[kind];
  }
  switch (row.group) {
    case "Bible":
      return Book;
    case "Saints":
      return HaloedHead;
    case "Reading":
      return ClosedBook;
    case "Prayers":
      return Hands;
    case "Councils & Heresies":
      return Church;
    case "History":
      return Hourglass;
    case "Topics":
      return Book;
    case "Settings":
      return Settings;
    default:
      return row.href.startsWith("/shop") ? Cart : Compass;
  }
}

/** The words found, lit in a line of text. */
export function Hit({ text, query }: { text: string; query: string }) {
  const parts = hitParts(text, query);
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <span key={i} className="search-hit">
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** The small capitals over a group: its name, how many, and an action at the end. */
export function Eyebrow({ label, count, end, className }: { label: ReactNode; count?: number; end?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-2 font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-paper/50", className)}>
      <span className="min-w-0 truncate">{label}</span>
      {count !== undefined ? <span className="text-[11.5px] font-semibold normal-case tracking-normal tabular-nums text-paper/40">{count}</span> : null}
      {end ? <span className="ms-auto shrink-0 normal-case tracking-normal">{end}</span> : null}
    </div>
  );
}

/** A saint by the face in his icon; a halo and his initial where there is no icon. */
export function Face({ src, name, size }: { src?: string; name: string; size: number }) {
  const initial = name.replace(/^(St\.?|Saint|Holy|Blessed)\s+/i, "").charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-night-soft"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `50% ${iconFace(src)}%` }}
        />
      ) : (
        <span className="font-serif font-bold text-paper/70" style={{ fontSize: size * 0.4 }}>
          {initial}
        </span>
      )}
      <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)]" />
    </span>
  );
}

/** A glyph on its small raised plate. */
function Plate({ glyph: G }: { glyph: Glyph }) {
  return (
    <span aria-hidden className="search-plate grid size-[30px] shrink-0 place-items-center rounded-[9px] text-paper/85">
      <G size={16} />
    </span>
  );
}

/**
 * A result: its glyph (a saint by his face), its name with the words found
 * lit, and one line on what it is. In Theology the line is the library's
 * own, two lines long, as its search drew it; elsewhere the list's short one.
 */
export function ResultRow({
  row,
  query,
  door,
  onOpen,
  active,
  face = 30,
  idx,
  dim,
  sub,
}: {
  row: SearchRow;
  query: string;
  door: DoorId;
  onOpen: (row: SearchRow) => void;
  active?: boolean;
  /** The face's size, for a saint. */
  face?: number;
  /** Its place in the keyboard's order. */
  idx?: number;
  /** Drawn quiet: a row that cannot open with no signal. */
  dim?: boolean;
  /** A line in place of the row's own (the shop's "Needs a connection"). */
  sub?: string;
}) {
  const saint = row.group === "Saints";
  const line = sub ?? (door === "theology" && row.line ? row.line : (row.sublabel ?? row.line));
  // Two lines for Theology's own and beside a larger face (a saint's titles).
  const long = !sub && ((door === "theology" && Boolean(row.line)) || (saint && face > 30));
  return (
    <button
      type="button"
      data-idx={idx}
      data-active={active || undefined}
      onClick={() => onOpen(row)}
      className={cn("search-row flex w-full items-start gap-3 rounded-[14px] px-1.5 py-2.5 text-start", dim && "opacity-55")}
    >
      {saint ? <Face src={row.picture} name={row.label} size={face} /> : <Plate glyph={glyphFor(row, door)} />}
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[15px] font-semibold leading-[1.25] text-paper/92">
          <Hit text={row.label} query={query} />
        </span>
        {line ? (
          <span className={cn("mt-[3px] block font-sans text-caption leading-[1.4] text-paper/52", long ? "line-clamp-2" : "truncate")}>
            <Hit text={line} query={query} />
          </span>
        ) : null}
      </span>
      <ChevronRight size={13} className="mt-1 shrink-0 text-paper/30 rtl:-scale-x-100" />
    </button>
  );
}

/** Saints in a row by their faces, the name under each (C: "the saints by their faces"). */
export function FaceStrip({ rows, onOpen }: { rows: SearchRow[]; onOpen: (row: SearchRow) => void }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-3.5 overflow-x-auto px-1 pb-0.5 pt-1">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onOpen(row)}
          className="search-row flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-[14px] py-1 text-center"
        >
          <Face src={row.picture} name={row.label} size={52} />
          <span className="line-clamp-2 font-sans text-[11px] font-semibold leading-[1.25] text-paper/72">{shortName(row.label)}</span>
        </button>
      ))}
    </div>
  );
}

/** "St. Spyridon of Trimythous" as a face's caption: "Spyridon". */
export function shortName(name: string): string {
  return name
    .replace(/^(St\.?|Saint|Holy|Blessed|Righteous|Venerable)\s+/i, "")
    .split(/,| of | the /)[0]
    .trim();
}

/**
 * A word: one searched before (a clock), or one that finishes the word being
 * typed (a magnifier, the typed part quiet and the rest bright). A tap
 * searches it; the arrow at the end only puts it in the field, to go on
 * typing.
 */
export function WordRow({
  kind,
  typed,
  rest,
  count,
  onSearch,
  onFill,
}: {
  kind: "recent" | "complete";
  typed: string;
  rest?: string;
  /** How many it finds, at the end of the row (a near spelling's). */
  count?: number;
  onSearch: () => void;
  onFill: () => void;
}) {
  const G = kind === "recent" ? Clock : Search;
  return (
    <div className="flex items-center">
      <button type="button" onClick={onSearch} className="search-row flex min-h-[42px] min-w-0 flex-1 items-center gap-3 rounded-[12px] px-1.5 text-start">
        <G size={18} className="shrink-0 text-paper/42" />
        <span className="min-w-0 flex-1 truncate font-sans text-[15.5px] text-paper/88">
          {rest !== undefined ? (
            <>
              <span className="text-paper/55">{typed}</span>
              <span className="font-semibold text-paper">{rest}</span>
            </>
          ) : (
            typed
          )}
        </span>
        {count !== undefined ? <span className="shrink-0 font-sans text-[12.5px] tabular-nums text-paper/50">{count}</span> : null}
      </button>
      {/* A shortcut for the finger; the row itself is the way in for a keyboard. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onFill}
        className="inline-flex size-[44px] shrink-0 items-center justify-center text-paper/38 hover:text-paper"
      >
        <ArrowUpLeft size={16} className="rtl:-scale-x-100" />
      </button>
    </div>
  );
}

/** The quiet line for nothing found, in the serif's italic. */
export function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="px-5 text-center font-serif text-[16.5px] italic leading-[1.5] text-paper/66">
      {children}
    </p>
  );
}

/** One quiet line: no signal, and the search answers from what is on the phone. */
export function OfflineLine() {
  const { t } = useTranslate();
  return (
    <p role="status" className="flex items-center gap-2.5 rounded-[12px] border border-paper/[0.08] bg-paper/[0.045] px-3 py-2.5 font-sans text-[12.5px] font-medium leading-[1.4] text-paper/72">
      <NoSignal size={18} className="shrink-0 text-paper/60" />
      {t("search.offline")}
    </p>
  );
}

/** A row that hands the words on, behind the Purify mark (back to Everything). */
export function Handoff({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="search-row flex w-full items-center gap-3 rounded-[16px] border border-paper/10 bg-paper/[0.03] px-3.5 py-3 text-start font-sans text-ui font-medium leading-[1.35] text-paper/85"
    >
      <PurifyMark size={17} className="shrink-0 text-paper/70" />
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight size={14} className="shrink-0 text-paper/35 rtl:-scale-x-100" />
    </button>
  );
}

/**
 * The top result, as a band over its picture: what it is above its name, the
 * name with the words lit, one line under it. A row with no picture of its
 * own wears its door's (lib/search/engine.ts, pictureFor).
 */
export function TopBand({
  row,
  query,
  eyebrow,
  onOpen,
  active,
}: {
  row: SearchRow;
  query: string;
  eyebrow: string;
  onOpen: (row: SearchRow) => void;
  /** Chosen by a computer's arrow keys: Enter opens it. */
  active?: boolean;
}) {
  const picture = pictureFor(row);
  const line = row.line ?? row.sublabel;
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      data-search-top=""
      data-idx={0}
      data-active={active || undefined}
      className={cn(
        "press-card relative block h-[132px] w-full overflow-hidden rounded-[20px] text-start shadow-[inset_0_0_0_1px_rgb(255_255_255/0.09),0_20px_34px_-20px_rgb(0_0_0/0.95)]",
        active && "ring-2 ring-paper/70",
      )}
    >
      <span aria-hidden className="absolute inset-0 bg-night" />
      {picture ? (
        <span aria-hidden className="band-picture-tall absolute inset-0 bg-night-soft">
          {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are */}
          <img
            src={picture.src}
            alt=""
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: picture.focus ?? "50% 30%" }}
          />
        </span>
      ) : null}
      {/* The name first in the reading order, as every row reads (its name,
          then what it is); the eyebrow is drawn above it. */}
      <span className="relative flex h-full w-[64%] flex-col justify-end ps-4 pe-2 pb-[13px] pt-3.5">
        <span className="mt-[5px] line-clamp-2 font-serif text-[18.5px] font-bold leading-[1.17] text-paper">
          <Hit text={row.label} query={query} />
        </span>
        {line ? <span className="mt-[5px] line-clamp-2 font-sans text-caption leading-[1.4] text-paper/72">{line}</span> : null}
        <span className="order-first font-sans text-[10.5px] font-bold uppercase tracking-[0.12em] text-paper/62">{eyebrow}</span>
      </span>
    </button>
  );
}

/**
 * The doors: the library's parts in their own pictures, Everything first
 * under the Purify mark. Large before anything is typed; small, each with
 * how many it found, once something is. The chosen one is lit white; with no
 * signal the shop's goes grey.
 */
export function Doors({
  doors,
  current,
  counts,
  small,
  off,
  onPick,
}: {
  doors: readonly DoorId[];
  /** The door the search is turned to; none where the doors are offered to browse. */
  current: DoorId | null;
  counts?: ReadonlyMap<DoorId, number>;
  small?: boolean;
  off?: ReadonlySet<DoorId>;
  onPick: (door: DoorId) => void;
}) {
  const { t } = useTranslate();
  const size = small ? 58 : 74;
  return (
    // A phone swipes the row sideways; a computer's card, with no swipe, wraps it.
    <div data-search-doors="" className={cn("no-scrollbar flex overflow-x-auto px-5 pb-1 pt-1 md:flex-wrap md:gap-y-3 md:overflow-x-visible", small ? "gap-[11px]" : "gap-3")}>
      {doors.map((id) => {
        const door = doorOf(id);
        const n = counts?.get(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={id === current}
            data-door={id}
            data-off={off?.has(id) || undefined}
            onClick={() => onPick(id)}
            className={cn(
              "search-door-tile flex shrink-0 flex-col items-center text-center font-sans font-semibold",
              small ? "gap-1.5 text-[11px]" : "gap-[7px] text-[11.5px]",
              id === current ? "text-paper" : off?.has(id) ? "text-paper/38" : "text-paper/62",
            )}
            style={{ minWidth: size }}
          >
            <span
              className={cn("search-door-pic grid place-items-center", !door.picture && "search-door-mark", small ? "rounded-[17px]" : "rounded-[20px]")}
              style={{ width: size, height: size }}
            >
              {door.picture ? (
                // eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are
                <img
                  src={door.picture}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: door.focus ?? "50% 28%" }}
                />
              ) : (
                <PurifyMark size={small ? 24 : 30} className="text-paper" />
              )}
              {n !== undefined ? (
                <span className="search-count absolute bottom-[5px] end-[5px] z-[1] h-[18px] min-w-5 rounded-[9px] px-[5px] text-center text-[10.5px] font-semibold leading-[18px] tabular-nums text-paper">
                  {n}
                </span>
              ) : null}
            </span>
            <span className="whitespace-nowrap">{t(door.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * B's strip: the kinds of the place the search is turned to, All first, the
 * chosen one underlined in light. A real selector, never a cloud of pills;
 * it scrolls sideways when the kinds are many.
 */
export function KindStrip({
  kinds,
  counts,
  total,
  current,
  onPick,
}: {
  kinds: readonly KindId[];
  counts: ReadonlyMap<KindId, number>;
  total: number;
  current: KindId | null;
  onPick: (kind: KindId | null) => void;
}) {
  const { t } = useTranslate();
  const tab = (key: string, label: string, n: number, on: boolean, pick: () => void) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={on}
      onClick={pick}
      className="search-tab relative shrink-0 pb-[11px] font-sans text-ui font-semibold text-paper/50"
    >
      {label}
      <span className={cn("ms-[5px] font-medium tabular-nums", on ? "text-paper/60" : "text-paper/34")}>{n}</span>
    </button>
  );
  return (
    <div
      role="tablist"
      data-search-kinds=""
      // A phone swipes the strip sideways; a computer's card wraps it.
      className="no-scrollbar flex h-[44px] shrink-0 items-end gap-x-[22px] overflow-x-auto border-b border-paper/[0.07] px-5 md:h-auto md:flex-wrap md:gap-y-2 md:overflow-x-visible md:pt-2"
    >
      {tab("all", t("common.all"), total, current === null, () => onPick(null))}
      {kinds.map((kind) => tab(kind, t(KIND_LABEL[kind]), counts.get(kind) ?? 0, current === kind, () => onPick(kind)))}
    </div>
  );
}
