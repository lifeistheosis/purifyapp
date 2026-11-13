"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Sound } from "@/components/ui/icons/Sound";
import { Timer } from "@/components/ui/icons/Timer";
import { getAmbienceTrack } from "@/lib/ambience/ambience";
import { useAmbience } from "@/lib/ambience/player";
import { openAmbience } from "@/lib/ambience/sheet";
import { cn } from "@/lib/cn";
import { minutesLeft, useSleepTimer } from "@/lib/player/sleep";
import { shareOut } from "@/lib/share/shareOut";
import { shareLink } from "@/lib/site";

import { SaveOfflineRow } from "./SaveOffline";

/**
 * The player's ••• (1.8): round 8 A drew it at the right of the top bar
 * (Homebase/boards/purify-master/variants/08-player), and it went in with
 * the owner's "add everything we left out" of 2026-10-28. A sheet over the
 * player with what the player does that has no button of its own in that
 * corner, each in words: Save for offline (a chapter of the Bible, in the
 * apps), the sleep timer and Ambience, each opening its own sheet as it does
 * from the row under the controls, and Share, the page of what is playing.
 * Nothing moved here: every control under the controls is still there.
 *
 * Like the reader's ••• sheet, it goes first when a row opens another sheet,
 * so one sheet never opens over another.
 */
export function PlayerMoreSheet({
  open,
  onClose,
  title,
  src,
  share,
  onSleep,
}: {
  open: boolean;
  onClose: () => void;
  /** What is playing: the sheet's name, and what Share says. */
  title: string;
  src: string | null;
  /** The page of what is playing, for Share (lib/player/steps.ts shareHref), or null for none. */
  share: string | null;
  /** Open the sleep timer's own sheet. */
  onSleep: () => void;
}) {
  const { t } = useTranslate();
  const sleep = useSleepTimer();
  const { playing } = useAmbience();
  const sound = getAmbienceTrack(playing);
  const [copied, setCopied] = useState(false);

  const sleepValue =
    sleep.kind === "minutes" ? t("player.sleepIn", { count: minutesLeft(sleep) }) : sleep.kind === "end" ? t("player.sleepEnd") : t("common.off");

  /**
   * The phone's own share sheet, in the apps as in a browser (lib/share/shareOut.ts; until
   * build 95 note 24 the Android app only ever copied here); else the link, copied, and said.
   */
  async function shareIt() {
    if (!share) return;
    const result = await shareOut({ title, url: shareLink(share) });
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      return;
    }
    if (result !== "failed") onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} desktop layer="over-player">
      <div className="space-y-2.5 pt-1">
        <SaveOfflineRow src={src} onLeave={onClose} />
        <Row
          icon={<Timer size={16} />}
          label={t("player.sleep")}
          value={sleepValue}
          on={sleep.kind !== "off"}
          onClick={() => {
            onClose();
            onSleep();
          }}
        />
        <Row
          icon={<Sound size={16} />}
          label={t("ambience.title")}
          value={sound ? t(sound.labelKey) : t("common.off")}
          on={Boolean(sound)}
          onClick={() => {
            onClose();
            openAmbience({ overPlayer: true });
          }}
        />
        {share ? (
          <button
            type="button"
            onClick={() => void shareIt()}
            className="flex min-h-12 w-full items-center gap-3 rounded-pill border border-paper/15 bg-paper/[0.04] px-3.5 text-start font-sans text-detail font-medium text-paper/85 hover:border-paper/30 hover:bg-paper/10"
          >
            {copied ? <Check size={16} className="shrink-0" /> : <ShareMark />}
            <span className="min-w-0 truncate">{copied ? t("common.linkCopied") : t("common.share")}</span>
            <span aria-live="polite" className="sr-only">
              {copied ? t("common.linkCopied") : ""}
            </span>
          </button>
        ) : null}
      </div>
    </Sheet>
  );
}

/** A row that opens its own sheet: its mark and name, then what it is set to now, white while it is on. */
function Row({
  icon,
  label,
  value,
  on,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-pill border border-paper/15 bg-paper/[0.04] px-3.5 text-start font-sans text-detail font-medium text-paper/85 hover:border-paper/30 hover:bg-paper/10"
    >
      <span className="inline-flex min-w-0 items-center gap-3">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className={cn("inline-flex min-w-0 shrink items-center gap-1 font-semibold", on ? "text-paper" : "text-paper/60")}>
        <span className="truncate">{value}</span>
        <ChevronRight size={14} className="shrink-0 text-paper/55 rtl:-scale-x-100" />
      </span>
    </button>
  );
}

/** Share's mark, as the share button draws it. */
function ShareMark() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5 15.4 17.5" />
      <path d="M15.4 6.5 8.6 10.5" />
    </svg>
  );
}
