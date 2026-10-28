"use client";

// A small, localized share control. Uses the native Web Share sheet where it
// exists (most phones), and falls back to copying the page link with a brief
// "Link copied" confirmation. The label is translated to the reader's locale.
//
// The link is built with shareCurrentLink(), never window.location.href: the
// Capacitor shell serves the export from https://localhost, so the raw href
// is a dead link the moment it leaves the device. See lib/site.ts.

import { useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { shareCurrentLink } from "@/lib/site";
import { copyText as putOnClipboard } from "@/lib/ui/copyText";

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

  async function onShare() {
    const url = typeof window !== "undefined" ? shareCurrentLink() : "";
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        const resolved = titleKey ? t(titleKey) : (title ?? "");
        await navigator.share({ title: resolved, text: text ?? resolved, url });
      } catch {
        /* user dismissed the share sheet */
      }
      return;
    }
    try {
      if (!(await putOnClipboard(url))) throw new Error("the clipboard refused");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (round) {
    return (
      <button
        type="button"
        onClick={onShare}
        aria-label={copied ? t("common.linkCopied") : t("common.share")}
        className={cn(
          "tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-paper/10 bg-paper/[0.08] text-paper motion-safe:transition-colors hover:border-paper/30",
          className,
        )}
      >
        {copied ? <Check size={16} /> : <ShareIcon size={18} />}
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
        "inline-flex items-center gap-1.5 rounded-pill border border-paper/15 bg-paper/[0.04] px-3 py-1.5 font-sans text-detail text-paper/70 transition-colors hover:border-paper/35 hover:text-paper",
        className,
      )}
    >
      <ShareIcon />
      {copied ? t("common.linkCopied") : t("common.share")}
    </button>
  );
}

function ShareIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
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
