"use client";

// A small, localized share control. Uses the native Web Share sheet where it
// exists (most phones), and falls back to copying the page link with a brief
// "Link copied" confirmation. The label is translated to the reader's locale.

import { useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

export function ShareButton({
  title,
  titleKey,
  text,
  className,
}: {
  title?: string;
  /** Catalog key resolved client-side; wins over title when set. */
  titleKey?: string;
  /** Optional longer body for the share sheet; defaults to the title. */
  text?: string;
  className?: string;
}) {
  const { t } = useTranslate();
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
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
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
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

function ShareIcon() {
  return (
    <svg
      width="14"
      height="14"
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
