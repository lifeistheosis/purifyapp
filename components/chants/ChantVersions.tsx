"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PreviewButton } from "@/components/player/PreviewButton";
import { Pause } from "@/components/ui/icons/Pause";
import { Play } from "@/components/ui/icons/Play";
import { cn } from "@/lib/cn";
import { chantMediaUrl, formatDuration } from "@/lib/chants/media";
import { traditionKey } from "@/lib/chants/names";
import type { ChantIndexVariant, ChantLine } from "@/lib/chants/types";
import { usePreview } from "@/lib/player/preview";

import { availabilityKey, isBlocked, useChantPlay } from "./ChantPlay";

/**
 * A chant's versions, one row each (1.7): the version's name in its own
 * script, who sings it (or that nobody is known: a performer is never
 * invented), what it is and its length, and Play.
 *
 * 1.7.1, after the owner's "the buttons load and then it disappears because
 * it says plays with a connection": nothing in a row moves when the list of
 * recordings answers. The buttons stay where they are, dimmed while the list
 * is read and while a version cannot play, and the reason takes the place of
 * what it is, so the row keeps its height.
 *
 * 1.8, sheet r3-18 B (the owner's pick of 2026-10-31), behind a chant's
 * Versions door: who sings it is named in full, the choir by name, on as
 * many lines as it takes ("Performer not known", in italic, where nobody is
 * known), and the version on the page carries a small lit mark. A row's Play
 * plays that version where the page sings along, not in Now Playing, and the
 * page opens on its words (onPlay). The page's rows have no preview: Play
 * there plays the whole version with its words lit; the Chants home keeps it.
 */
export function ChantVersions({
  slug,
  title,
  variants,
  linesOf,
  coverSrc,
  selected,
  onSelect,
  onPlay,
  open = true,
  preview = true,
  className,
}: {
  slug: string;
  /** The chant's name in the reader's language. */
  title: string;
  variants: ChantIndexVariant[];
  /** A version's words, where the page has them, for the live captions. */
  linesOf?: (id: string) => ChantLine[] | undefined;
  coverSrc?: string;
  /** The version the page shows, marked in the list. */
  selected?: string;
  onSelect?: (id: string) => void;
  /** A row's Play has started its version. */
  onPlay?: (id: string) => void;
  /** Open Now Playing on its words when a row starts playing. */
  open?: boolean;
  /** A preview of the part each version is known by, beside its Play. */
  preview?: boolean;
  className?: string;
}) {
  const clips = usePreview();
  return (
    <ul className={cn("divide-y divide-paper/[0.07]", className)}>
      {variants.map((v) => (
        <VersionRow
          key={v.id}
          slug={slug}
          title={title}
          variant={v}
          lines={linesOf?.(v.id)}
          coverSrc={coverSrc}
          current={selected === v.id}
          onSelect={onSelect}
          onPlay={onPlay}
          open={open}
          preview={preview ? clips : null}
        />
      ))}
    </ul>
  );
}

function VersionRow({
  slug,
  title,
  variant,
  lines,
  coverSrc,
  current,
  onSelect,
  onPlay,
  open,
  preview,
}: {
  slug: string;
  title: string;
  variant: ChantIndexVariant;
  lines?: ChantLine[];
  coverSrc?: string;
  current: boolean;
  onSelect?: (id: string) => void;
  onPlay?: (id: string) => void;
  open: boolean;
  preview: ReturnType<typeof usePreview> | null;
}) {
  const { t } = useTranslate();
  const { availability, playing, toggle } = useChantPlay({ slug, title, variant, lines, coverSrc, open });
  const previewing = preview?.playingId === `${slug}/${variant.id}`;
  // What it is: its setting where it is known, else its tradition, and its length.
  const meta = [variant.setting ?? t(traditionKey(variant.tradition)), formatDuration(variant.audio.durationSec)].filter(Boolean);
  const sings = variant.performer ? t("chants.sungBy", { name: variant.performer }) : t("chants.performerUnknown");
  const blocked = isBlocked(availability);
  const why = availabilityKey(availability);

  const about = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <span
          dir="auto"
          lang={variant.language}
          className={cn("truncate font-sans text-[15.5px] font-semibold leading-snug", current ? "text-paper" : "text-paper/85")}
        >
          {variant.label}
        </span>
        {current ? <span aria-hidden className="chant-version-dot" /> : null}
      </span>
      {/* Who sings it, in full: the choir by name, never cut short. */}
      <span
        className={cn(
          "mt-[3px] block text-[13px] leading-[1.4]",
          variant.performer ? "font-sans text-paper/80" : "font-serif italic text-paper/50",
        )}
      >
        {sings}
      </span>
      {/* One line either way: what it is, or why it cannot play now. */}
      <span className={cn("mt-0.5 block truncate font-sans text-caption", why ? "text-paper/70" : "text-paper/50")}>
        {why ? t(why) : meta.join(" · ")}
      </span>
    </>
  );

  return (
    <li className="flex items-center gap-3 py-[13px]">
      {onSelect ? (
        // Choosing a version shows its words on the page.
        <button
          type="button"
          onClick={() => onSelect(variant.id)}
          aria-pressed={current}
          className="tap-press min-w-0 flex-1 text-start"
        >
          {about}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{about}</div>
      )}
      {preview ? (
        <PreviewButton
          playing={previewing}
          progress={preview.progress}
          disabled={availability !== "playable"}
          label={previewing ? t("chant.stopPreview") : t("chant.preview", { title: `${title} (${variant.label})` })}
          onToggle={() =>
            previewing
              ? preview.stop()
              : preview.start({ id: `${slug}/${variant.id}`, src: chantMediaUrl(variant.audio.src), ...variant.preview })
          }
        />
      ) : null}
      <button
        type="button"
        onClick={() => {
          preview?.stop();
          if (!playing && availability === "playable") onPlay?.(variant.id);
          toggle();
        }}
        disabled={!playing && availability !== "playable"}
        aria-busy={availability === "checking" || undefined}
        aria-label={`${playing ? t("prayers.pause") : t("prayers.play")}: ${variant.label}`}
        className={cn(
          "tap-press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper text-night motion-safe:transition-opacity disabled:opacity-40",
          blocked && !playing && "disabled:opacity-25",
        )}
      >
        {playing ? <Pause size={18} /> : <Play size={18} className="translate-x-[1px]" />}
      </button>
    </li>
  );
}
