"use client";

import { useEffect, useState } from "react";
import { pushAllLocalBookmarks, pullServerBookmarks } from "@/lib/sync/bookmarks";
import {
  pushAllLocalAnnotations,
  pullServerAnnotations,
} from "@/lib/sync/annotations";

const LAST_KEY = "purify.sync.last";
const ERR_KEY = "purify.sync.error";

function relativeShort(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "never";
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return "just now";
  const m = Math.floor(diffMs / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The sync-status widget on the account dashboard. Shows the last-sync
 * timestamp (read from the same localStorage key SyncOnMount writes to),
 * any error from the last attempt, and a manual "Sync now" button that
 * re-runs the bookmark + annotation push/pull pair.
 */
export function ProfileSyncStatus() {
  const [last, setLast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLast(window.localStorage.getItem(LAST_KEY));
    setErr(window.localStorage.getItem(ERR_KEY));
    const on = () => {
      setLast(window.localStorage.getItem(LAST_KEY));
      setErr(window.localStorage.getItem(ERR_KEY));
    };
    window.addEventListener("purify:sync", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("purify:sync", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  async function syncNow() {
    setBusy(true);
    try {
      await Promise.all([pushAllLocalBookmarks(), pushAllLocalAnnotations()]);
      await Promise.all([pullServerBookmarks(), pullServerAnnotations()]);
      const stamp = new Date().toISOString();
      window.localStorage.setItem(LAST_KEY, stamp);
      window.localStorage.removeItem(ERR_KEY);
      setLast(stamp);
      setErr(null);
      window.dispatchEvent(new CustomEvent("purify:sync"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.localStorage.setItem(ERR_KEY, msg);
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6">
      <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
        Cross-device sync
      </p>
      <div className="rounded-md border border-paper/12 bg-paper/[0.03] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-sans text-[13.5px] text-paper">
            <span className="text-paper/55">Last synced </span>
            <span className="font-semibold tabular-nums">
              {relativeShort(last)}
            </span>
          </p>
          {err && (
            <p className="mt-1.5 font-sans text-[12px] text-[#f8cac7] leading-[1.45]">
              Last attempt failed: {err}
            </p>
          )}
          {!err && last && (
            <p className="mt-1 font-sans text-[12px] text-paper/45">
              Your highlights, notes, bookmarks, and prayer streaks are saved
              to the server and pulled back on every device.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={syncNow}
          disabled={busy}
          className="shrink-0 font-sans text-[13px] font-medium rounded-pill border border-paper/25 bg-paper/[0.06] text-paper px-4 py-2 hover:bg-paper/10 hover:border-paper/45 disabled:opacity-60 transition-colors"
        >
          {busy ? "Syncing…" : "Sync now"}
        </button>
      </div>
    </section>
  );
}
