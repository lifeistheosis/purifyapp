"use client";

// The hero "What's new" chip. It carries a glowing "New" badge that behaves
// like a notification: it pulses while the current release is unseen, and
// clears the moment the reader opens the changelog (here on click, and again
// on the /whats-new page itself). The seen state is the version string in
// localStorage, read through useSyncExternalStore so there is no hydration
// flash; the badge returns on its own the next time we ship a bump.

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
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
  // Hold the badge back until the component has mounted on the client. The
  // server can't read localStorage, so an SSR render of the badge would show
  // it to *everyone* on first paint and then yank it away once hydration
  // learns the reader has already seen this release, the split-second "New"
  // flash. Gating on `mounted` means the first paint never carries the badge;
  // it then appears (and stays) only for readers who genuinely haven't opened
  // the current version. No flash, no flicker.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // 0-delay defer keeps the state flip out of the effect body proper,
    // matching the existing pattern in InstallPrompt etc.
    // (react-hooks/set-state-in-effect).
    const tm = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(tm);
  }, []);
  const isUnseen = mounted && seenVersion !== CURRENT_VERSION;

  return (
    <Link
      href="/whats-new"
      onClick={() => markWhatsNewSeen(CURRENT_VERSION)}
      style={{ animationDelay: "120ms" }}
      className="hero-copy-in group inline-flex items-center gap-2 rounded-pill border border-paper/20 bg-paper/[0.06] px-3 py-1.5 mb-7 hover:bg-paper/10 hover:border-paper/35 transition-colors duration-150"
    >
      {isUnseen && (
        <span className="new-glow font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] px-2 py-0.5 rounded-pill bg-[#d4af37] text-night">
          {isDe ? "Neu" : "New"}
        </span>
      )}
      <span className="font-sans text-caption sm:text-detail text-paper/85 group-hover:text-paper transition-colors">
        <span className="sm:hidden">
          {CURRENT_VERSION} · Search anything, multi-verse Bible, the Creed, smaller fixes
        </span>
        <span className="hidden sm:inline">
          {CURRENT_VERSION} · Multi-verse Bible search, search across prayers and saints, the Nicene Creed in Morning and Evening prayer, the small things you asked for
        </span>
      </span>
      <span className="text-paper/55 group-hover:text-paper transition-colors text-detail">
        →
      </span>
    </Link>
  );
}
