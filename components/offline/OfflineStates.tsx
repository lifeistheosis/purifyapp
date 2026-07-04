"use client";

// Calm, consistent offline / cached / sync states for the native app. Plain
// presentational components in the Purify register (paper text, muted grays,
// restrained borders) — no alarming errors, no browser network pages. They
// render the same on web but are only meaningfully used inside the native
// shell, where content can be local-only.

import { useSyncExternalStore } from "react";

/** Reactive online/offline status. Uses the browser online events; the native
 *  layer can later feed @capacitor/network through the same store. SSR-safe
 *  (assumes online on the server snapshot). */
function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (typeof navigator === "undefined" ? true : navigator.onLine),
    () => true,
  );
}

/** Slim banner shown while offline: reassures that downloaded content is live. */
export function OfflineBanner({ online }: { online?: boolean }) {
  const detected = useOnline();
  const isOffline = online === undefined ? !detected : !online;
  if (!isOffline) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 px-4 py-2 bg-night-soft border-b border-white/8 font-sans text-caption text-paper/60"
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-paper/40" />
      You&rsquo;re offline. Showing downloaded content.
    </div>
  );
}

/** Quiet "Available offline" marker for a resource that's been downloaded. */
export function AvailableOfflineBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/45">
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Available offline
    </span>
  );
}

/** Shown in place of a resource that isn't downloaded yet. */
export function NotDownloadedNotice({
  online,
  onDownload,
}: {
  online?: boolean;
  onDownload?: () => void;
}) {
  const detected = useOnline();
  const canDownload = online === undefined ? detected : online;
  return (
    <div className="rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-8 text-center">
      <p className="font-serif text-lede text-paper/75">Not downloaded yet</p>
      <p className="mt-2 font-sans text-detail text-paper/45">
        {canDownload
          ? "Connect to download this resource."
          : "You’re offline. This resource isn’t available yet — it will download when you’re back online."}
      </p>
      {canDownload && onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="tap-press mt-4 inline-flex h-10 items-center rounded-pill border border-paper/20 bg-paper/[0.04] px-5 font-sans text-ui font-medium text-paper hover:border-paper/40"
        >
          Download
        </button>
      )}
    </div>
  );
}

/** "N changes waiting to sync" pill for the account/settings surfaces. */
export function SyncPendingBadge({ pending }: { pending: number }) {
  if (pending <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-caption text-paper/55">
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-gold/70" />
      {pending} change{pending === 1 ? "" : "s"} waiting to sync
    </span>
  );
}
