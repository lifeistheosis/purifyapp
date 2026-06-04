"use client";

// The hero "What's new" chip. It carries a glowing "New" badge that behaves
// like a notification: it pulses while the current release is unseen, and
// clears the moment the reader opens the changelog (here on click, and again
// on the /whats-new page itself). The seen state is the version string in
// localStorage, read through useSyncExternalStore so there is no hydration
// flash; the badge returns on its own the next time we ship a bump.

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";
import {
  subscribeSeen,
  getSeenSnapshot,
  getServerSeenSnapshot,
  markWhatsNewSeen,
} from "@/lib/whatsNew/seenStore";

export function WhatsNewChip({ isDe }: { isDe: boolean }) {
  const seenVersion = useSyncExternalStore(
    subscribeSeen,
    getSeenSnapshot,
    getServerSeenSnapshot,
  );
  // Show the badge whenever the stored version isn't the current one. A reader
  // with no record yet (fresh browser, or seenVersion === null on the server
  // snapshot) counts as unseen, so the badge greets them; useSyncExternalStore
  // swaps in the real localStorage value after hydration with no mismatch
  // warning, quietly removing it for anyone who has already opened this release.
  const isUnseen = seenVersion !== CURRENT_VERSION;

  return (
    <Link
      href="/whats-new"
      onClick={() => markWhatsNewSeen(CURRENT_VERSION)}
      style={{ animationDelay: "120ms" }}
      className="hero-copy-in group inline-flex items-center gap-2 rounded-pill border border-paper/20 bg-paper/[0.06] px-3 py-1.5 mb-7 hover:bg-paper/10 hover:border-paper/35 transition-colors duration-150"
    >
      {isUnseen && (
        <span className="new-glow font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] px-2 py-0.5 rounded-pill bg-gold text-night">
          {isDe ? "Neu" : "New"}
        </span>
      )}
      <span className="font-sans text-caption sm:text-detail text-paper/85 group-hover:text-paper transition-colors">
        <span className="sm:hidden">
          {CURRENT_VERSION} · A quieter palette and a floating mobile bar
        </span>
        <span className="hidden sm:inline">
          {CURRENT_VERSION} · A quieter palette, a redrawn calendar, and a floating mobile bar
        </span>
      </span>
      <span className="text-paper/55 group-hover:text-paper transition-colors text-detail">
        →
      </span>
    </Link>
  );
}
