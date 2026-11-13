"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Share } from "@/components/ui/icons/Share";
import { shareWork, type WorkShare } from "@/lib/reading/shareWork";

/**
 * Share, as a row of a work's sheet (1.9, build 95 note 15, his word of
 * 2026-11-13: "allow every single work to be sharable by adding a share
 * button here and here"). It is drawn with the sheet's own row (`className`,
 * the look of the rows beside it), the phone's own mark for sharing
 * (components/ui/icons/Share.tsx) and the word every share in the app says
 * (common.share), in the reader's language; in Arabic and Urdu the row reads
 * from the right as its neighbours do, and the mark, an arrow rising out of
 * a tray, needs no turning.
 *
 * A tap opens the phone's share sheet with the work's title and its page on
 * purifyapp.net (lib/reading/shareWork.ts). Once shared, the sheet it stands
 * in closes; closed without choosing, it stays. Where there is no share
 * sheet (a computer's browser, mostly) the link is copied, and the row says
 * "Link copied" with a tick for a moment, where a screen reader hears it too.
 * No chevron at its end: it opens nothing of the app's, as Share in the
 * player's ••• (components/player/PlayerMore.tsx).
 */
export function ShareWorkRow({ share, className, onShared }: { share: WorkShare; className: string; onShared?: () => void }) {
  const { t } = useTranslate();
  const [copied, setCopied] = useState(false);
  // One share at a time: a second tap while the sheet is rising is not a second share.
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function onTap() {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await shareWork(share);
      if (result === "shared") onShared?.();
      else if (result === "copied") {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1800);
      }
    } finally {
      busy.current = false;
    }
  }

  return (
    <button type="button" data-share-work="" onClick={() => void onTap()} className={className}>
      <span className="inline-flex min-w-0 items-center gap-2">
        {copied ? <Check size={16} className="shrink-0" /> : <Share size={16} className="shrink-0" />}
        <span className="truncate">{copied ? t("common.linkCopied") : t("common.share")}</span>
      </span>
      <span aria-live="polite" className="sr-only">
        {copied ? t("common.linkCopied") : ""}
      </span>
    </button>
  );
}
