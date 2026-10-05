"use client";

import { useState } from "react";

import { ReaderSettingsSheet } from "@/components/bible/ReaderSettingsMenu";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Settings } from "@/components/ui/icons/Settings";

/**
 * The top bar's own action on a saint's work, on a phone: one gear that opens
 * the reader settings, the same sheet the Bible reader's gear opens
 * (MobileReaderActions), since they are the same preferences.
 *
 * This slot used to hold the three desktop pills, MODE, FONT and SIZE, each
 * with its label and its current value. Together they are about 430px wide in
 * a bar that has 240px to give, so they ran off the right of the screen and
 * the page grew to hold them: every work opened 103px wider than the phone
 * (measured 2026-10-05 at 390px), which a reader sees as the screen zoomed in
 * and sliding sideways. One 40px button cannot do that, and the sheet offers
 * more than the pills did: line spacing and focus reading too.
 */
export function MobileWorkActions() {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={t("bible.readerSettings")}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-pill text-paper/70 transition-colors hover:text-paper"
      >
        <Settings size={18} />
      </button>
      {/* No Interlinear here: that is the New Testament's Greek. */}
      <ReaderSettingsSheet open={open} onClose={() => setOpen(false)} showInterlinear={false} />
    </>
  );
}
