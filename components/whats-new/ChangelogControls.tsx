"use client";

import { useEffect } from "react";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";
import { markWhatsNewSeen } from "@/lib/whatsNew/seenStore";

/**
 * Two small text buttons that expand or collapse every <details> inside
 * the data-changelog section (both date groups and release entries).
 *
 * Also clears the hero "New" badge: reaching this page by any route means
 * the reader has seen the current release, so we record it. The badge in
 * WhatsNewChip re-arms on the next CURRENT_VERSION bump.
 */
export function ChangelogControls() {
  useEffect(() => {
    markWhatsNewSeen(CURRENT_VERSION);
  }, []);

  function setAll(open: boolean) {
    const root = document.querySelector("[data-changelog]");
    if (!root) return;
    root.querySelectorAll("details").forEach((d) => {
      if (open) d.setAttribute("open", "");
      else d.removeAttribute("open");
    });
  }

  return (
    <div className="flex items-center gap-3 font-sans text-caption text-paper/55">
      <button
        type="button"
        onClick={() => setAll(true)}
        // Written in English, as the notes they open are (build 90 note 4).
        lang="en"
        dir="ltr"
        // 44 tall to the touch (they were 18.6px; checkMock, 2026-11-10).
        className="inline-flex min-h-11 items-center hover:text-paper transition-colors"
      >
        Expand all
      </button>
      {/* A mark between two buttons, not a word to read aloud; at a share each
          palette holds to 4.5:1 (it was /25, 1.64:1 on Light). */}
      <span aria-hidden className="text-paper/45">
        ·
      </span>
      <button
        type="button"
        onClick={() => setAll(false)}
        lang="en"
        dir="ltr"
        className="inline-flex min-h-11 items-center hover:text-paper transition-colors"
      >
        Collapse all
      </button>
    </div>
  );
}
