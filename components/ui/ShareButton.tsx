"use client";

// A small, localized share control. Opens the phone's own share sheet, in the
// apps as in a browser (lib/share/shareOut.ts: until build 95 note 24 it asked
// for the Web Share sheet alone, which Android's web view does not have, so
// in the Android app it only ever copied), and copies the page link with a
// brief "Link copied" only where there is no share sheet. The label is
// translated to the reader's locale.
//
// The link is built with shareCurrentLink(), never window.location.href: the
// Capacitor shell serves the export from https://localhost, so the raw href
// is a dead link the moment it leaves the device. See lib/site.ts.

import { useRef, useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { shareOut } from "@/lib/share/shareOut";
import { shareCurrentLink } from "@/lib/site";
import { TOP_ICON, TOP_PLATE } from "@/components/nav/topPlate";

export function ShareButton({
  title,
  titleKey,
  text,
  className,
  round = false,
}: {
  title?: string;
  /** Catalog key resolved client-side; wins over title when set. */
  titleKey?: string;
  /** Optional longer body for the share sheet; defaults to the title. */
  text?: string;
  className?: string;
  /**
   * A round 44px button with the mark alone, named by its label for
   * assistive technology (1.8, the share at the end of a saint's row, round
   * 3b D). Once the link is copied it says so where a screen reader hears it.
   */
  round?: boolean;
}) {
  const { t } = useTranslate();
  const [copied, setCopied] = useState(false);
  // One share at a time: a second tap while the sheet is rising is not a second share.
  const busy = useRef(false);

  async function onShare() {
    if (busy.current) return;
    busy.current = true;
    try {
      const url = typeof window !== "undefined" ? shareCurrentLink() : "";
      const resolved = titleKey ? t(titleKey) : (title ?? "");
      if ((await shareOut({ title: resolved, text: text ?? resolved, url })) === "copied") {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } finally {
      busy.current = false;
    }
  }

  if (round) {
    return (
      <button
        type="button"
        onClick={onShare}
        aria-label={copied ? t("common.linkCopied") : t("common.share")}
        className={cn(
          `tap-press ${TOP_PLATE} border border-paper/10 bg-paper/[0.08] text-paper motion-safe:transition-colors hover:border-paper/30`,
          className,
        )}
      >
        {copied ? <Check {...TOP_ICON} /> : <ShareIcon size={TOP_ICON.size} stroke={TOP_ICON.strokeWidth} />}
        <span aria-live="polite" className="sr-only">
          {copied ? t("common.linkCopied") : ""}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onShare}
      aria-label={t("common.share")}
      className={cn(
        "hit-44 inline-flex items-center gap-1.5 rounded-pill border border-paper/15 bg-paper/[0.04] px-3 py-1.5 font-sans text-detail text-paper/70 transition-colors hover:border-paper/35 hover:text-paper",
        className,
      )}
    >
      <ShareIcon />
      {copied ? t("common.linkCopied") : t("common.share")}
    </button>
  );
}

function ShareIcon({ size = 14, stroke = 1.7 }: { size?: number; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5 15.4 17.5" />
      <path d="M15.4 6.5 8.6 10.5" />
    </svg>
  );
}
