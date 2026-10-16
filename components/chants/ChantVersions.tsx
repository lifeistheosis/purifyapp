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

import { AvailabilityLine, useChantPlay } from "./ChantPlay";

/**
 * A chant's versions, one row each (1.7): the version's name in its own
 * script, its tradition and setting, who sings it (or that nobody is known:
 * a performer is never invented), its length, a preview of the part it is
 * known by, and Play. A version that cannot play says why in place of its
 * buttons.
 */
export function ChantVersions({
  slug,
  title,
  variants,
  linesOf,
  coverSrc,
  selected,
  onSelect,
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
}) {
  const preview = usePreview();
  return (
    <ul className="divide-y divide-paper/[0.07]">
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
          preview={preview}
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
  preview,
}: {
  slug: string;
  title: string;
  variant: ChantIndexVariant;
  lines?: ChantLine[];
  coverSrc?: string;
  current: boolean;
  onSelect?: (id: string) => void;
  preview: ReturnType<typeof usePreview>;
}) {
  const { t } = useTranslate();
  const { availability, playing, toggle } = useChantPlay({ slug, title, variant, lines, coverSrc });
  const previewing = preview.playingId === `${slug}/${variant.id}`;
  const meta = [t(traditionKey(variant.tradition)), variant.setting, formatDuration(variant.audio.durationSec)].filter(Boolean);
  const sings = variant.performer ? t("chants.sungBy", { name: variant.performer }) : t("chants.performerUnknown");
  const blocked = availability === "offline" || availability === "pulled";

  const about = (
    <>
      <span dir="auto" className={cn("block truncate font-sans text-ui font-semibold", current ? "text-paper" : "text-paper/85")}>
        {variant.label}
      </span>
      <span className="mt-0.5 block truncate font-sans text-caption text-paper/55">{meta.join(" · ")}</span>
      <span className="mt-0.5 block truncate font-sans text-caption text-paper/45">{sings}</span>
      {blocked ? <AvailabilityLine availability={availability} className="mt-1" /> : null}
    </>
  );

  return (
    <li className="flex items-center gap-3 py-3.5">
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
      {blocked ? null : (
        <>
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
          <button
            type="button"
            onClick={() => {
              preview.stop();
              toggle();
            }}
            disabled={!playing && availability !== "playable"}
            aria-label={`${playing ? t("prayers.pause") : t("prayers.play")}: ${variant.label}`}
            className="tap-press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper text-night disabled:opacity-40"
          >
            {playing ? <Pause size={18} /> : <Play size={18} className="translate-x-[1px]" />}
          </button>
        </>
      )}
    </li>
  );
}
