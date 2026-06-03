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
        className="hover:text-paper transition-colors"
      >
        Expand all
      </button>
      <span className="text-paper/25">·</span>
      <button
        type="button"
        onClick={() => setAll(false)}
        className="hover:text-paper transition-colors"
      >
        Collapse all
      </button>
    </div>
  );
}
