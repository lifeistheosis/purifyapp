"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { pushAllLocalBookmarks, pullServerBookmarks } from "@/lib/sync/bookmarks";
import {
  pushAllLocalAnnotations,
  pullServerAnnotations,
} from "@/lib/sync/annotations";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { getClientEntitlements } from "@/lib/entitlements/client";
import { onEntitlementsChanged } from "@/lib/entitlements/refresh";

const LAST_KEY = "purify.sync.last";
const ERR_KEY = "purify.sync.error";
const EVENT = "purify:sync";

type SyncSnapshot = { last: string | null; err: string | null };

const EMPTY: SyncSnapshot = { last: null, err: null };

// Stable snapshot for useSyncExternalStore: cache by the joined raw values so
// re-reads return the same reference until either localStorage entry changes.
let snapKey: string | undefined;
let snapValue: SyncSnapshot = EMPTY;

function readSnapshot(): SyncSnapshot {
  if (typeof window === "undefined") return EMPTY;
  let last: string | null = null;
  let err: string | null = null;
  try {
    last = window.localStorage.getItem(LAST_KEY);
    err = window.localStorage.getItem(ERR_KEY);
  } catch {
    return EMPTY;
  }
  const key = `${last ?? ""}|${err ?? ""}`;
  if (key === snapKey) return snapValue;
  snapKey = key;
  snapValue = last === null && err === null ? EMPTY : { last, err };
  return snapValue;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function relativeShort(
  iso: string | null,
  t: (key: string) => string,
  tn: (keyBase: string, count: number) => string,
): string {
  if (!iso) return t("ui.syncNever");
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return t("ui.syncNever");
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return t("ui.syncJustNow");
  const m = Math.floor(diffMs / 60_000);
  if (m < 60) return tn("ui.syncMinutesAgo", m);
  const h = Math.floor(m / 60);
  if (h < 24) return tn("ui.syncHoursAgo", h);
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
 *
 * Reads via useSyncExternalStore listening for the in-tab `purify:sync`
 * event + cross-tab `storage` event, so manual sync from this surface and
 * background sync from SyncOnMount both refresh the widget without a
 * hydrate-in-effect setState.
 *
 * ── When sync is not this reader's to have ──────────────────────────────
 *
 * Carrying a library across devices is the Plus layer, and lib/sync/* asks
 * canSync() before every push and pull. Until an enforcement switch flips
 * that answer is yes for everyone, and this widget never had a second state
 * to show. Two things were wrong with that the moment one flips. A free
 * reader would be told nothing at all: their notes would simply stop meeting
 * across devices, with no line anywhere saying so or saying what carries
 * them. And Sync now would still stamp "synced just now" over four calls that
 * each returned early, which is a widget lying about the one fact it exists
 * to report.
 *
 * So the lock is a state of this widget: it says where the notes are, says
 * what Plus does with them, and offers the sheet. It errs OPEN while the
 * entitlement is resolving, for the reason every other gate here does: a
 * subscriber must never be shown a lock they already paid to remove.
 */
export function ProfileSyncStatus() {
  const { t, tn } = useTranslate();
  const { last, err } = useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);
  const [busy, setBusy] = useState(false);
  // null while resolving, which renders as allowed.
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const upgrade = useUpgradeModal();

  useEffect(() => {
    let alive = true;
    const read = () => {
      void getClientEntitlements()
        .then((e) => {
          if (alive) setAllowed(e.sync);
        })
        .catch(() => {
          // A failed lookup must not invent a lock.
          if (alive) setAllowed(true);
        });
    };
    read();
    const off = onEntitlementsChanged(read);
    return () => {
      alive = false;
      off();
    };
  }, []);

  const locked = allowed === false;

  async function syncNow() {
    // Every call below returns early when sync is not allowed, so stamping a
    // time here would report a sync that did not happen.
    if (locked) {
      upgrade.open("sync");
      return;
    }
    setBusy(true);
    try {
      await Promise.all([pushAllLocalBookmarks(), pushAllLocalAnnotations()]);
      await Promise.all([pullServerBookmarks(), pullServerAnnotations()]);
      const stamp = new Date().toISOString();
      window.localStorage.setItem(LAST_KEY, stamp);
      window.localStorage.removeItem(ERR_KEY);
      window.dispatchEvent(new CustomEvent(EVENT));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.localStorage.setItem(ERR_KEY, msg);
      window.dispatchEvent(new CustomEvent(EVENT));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6">
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
        {t("ui.crossDeviceSync")}
      </p>
      <div className="rounded-md border border-paper/12 bg-paper/[0.03] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-sans text-detail text-paper">
            {locked ? (
              <span className="font-semibold">{t("ui.syncKeptOnThisDevice")}</span>
            ) : (
              <>
                <span className="text-paper/55">{t("ui.lastSynced")} </span>
                <span className="font-semibold tabular-nums">
                  {relativeShort(last, t, tn)}
                </span>
              </>
            )}
          </p>
          {locked && (
            <p className="mt-1.5 font-sans text-caption text-paper/55 leading-[1.45] max-w-[46ch]">
              {t("ui.syncLockedBody")}
            </p>
          )}
          {!locked && err && (
            <p className="mt-1.5 font-sans text-caption text-crimson-soft leading-[1.45]">
              {t("ui.lastAttemptFailed")} {err}
            </p>
          )}
          {!locked && !err && last && (
            <p className="mt-1 font-sans text-caption text-paper/45">
              {t("ui.yourHighlightsNotesAndBookmarksXX")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={syncNow}
          disabled={busy}
          className={
            locked
              ? "shrink-0 font-sans text-detail font-medium rounded-pill border border-gold/45 bg-gold/10 text-gold px-4 py-2 hover:bg-gold/15 hover:border-gold/70 transition-colors"
              : "shrink-0 font-sans text-detail font-medium rounded-pill border border-paper/25 bg-paper/[0.06] text-paper px-4 py-2 hover:bg-paper/10 hover:border-paper/45 disabled:opacity-60 transition-colors"
          }
        >
          {locked ? t("ui.syncSeePlus") : busy ? t("ui.syncing") : t("ui.syncNow")}
        </button>
      </div>
    </section>
  );
}
