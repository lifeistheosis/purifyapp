"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { pushAllLocalBookmarks, pullServerBookmarks } from "@/lib/sync/bookmarks";
import { getClientEntitlements } from "@/lib/entitlements/client";
import { onEntitlementsChanged } from "@/lib/entitlements/refresh";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import {
  pushAllLocalAnnotations,
  pullServerAnnotations,
} from "@/lib/sync/annotations";
import { useTranslate } from "@/components/i18n/MessagesProvider";

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
 */
export function ProfileSyncStatus() {
  const { t, tn } = useTranslate();
  const { last, err } = useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);
  const [busy, setBusy] = useState(false);
  const upgrade = useUpgradeModal();

  // Whether this account may sync at all. Once Plus is enforced, lib/sync/*
  // returns early for a free account and says nothing, so this widget used
  // to show "Last synced: never" and a Sync now button that silently did
  // nothing: the one place the reader could learn why was silent. Resolved
  // at runtime, the FlorilegiumGate pattern, and re-asked after a purchase.
  // Erring open while it resolves, so a subscriber never sees the pitch flash.
  const [syncAllowed, setSyncAllowed] = useState(true);
  useEffect(() => {
    let alive = true;
    const resolve = () =>
      getClientEntitlements().then((e) => {
        if (alive) setSyncAllowed(e.sync);
      });
    void resolve();
    const off = onEntitlementsChanged(() => void resolve());
    return () => {
      alive = false;
      off();
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
      window.dispatchEvent(new CustomEvent(EVENT));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.localStorage.setItem(ERR_KEY, msg);
      window.dispatchEvent(new CustomEvent(EVENT));
    } finally {
      setBusy(false);
    }
  }

  if (!syncAllowed) {
    return (
      <section className="mt-6">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          {t("ui.crossDeviceSync")}
        </p>
        <div className="rounded-md border border-gold/30 bg-gold/[0.04] px-5 py-4">
          <p className="font-sans text-detail font-semibold text-paper leading-snug">
            {t("plus.sync.title")}
          </p>
          <p className="mt-1.5 font-sans text-caption text-paper/70 leading-[1.55]">
            {t("plus.sync.body")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => upgrade.open("sync")}
              className="font-sans text-detail font-semibold rounded-pill px-4 py-2 bg-gold text-night hover:bg-gold-soft transition-colors"
            >
              {t("plus.start")}
            </button>
            <span className="font-sans text-caption text-paper/50">{t("plus.sync.keep")}</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
        {t("ui.crossDeviceSync")}
      </p>
      <div className="rounded-md border border-paper/12 bg-paper/[0.03] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="font-sans text-detail text-paper">
            <span className="text-paper/55">{t("ui.lastSynced")} </span>
            <span className="font-semibold tabular-nums">
              {relativeShort(last, t, tn)}
            </span>
          </p>
          {err && (
            <p className="mt-1.5 font-sans text-caption text-crimson-soft leading-[1.45]">
              {t("ui.lastAttemptFailed")} {err}
            </p>
          )}
          {!err && last && (
            <p className="mt-1 font-sans text-caption text-paper/45">
              {t("ui.yourHighlightsNotesAndBookmarksXX")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={syncNow}
          disabled={busy}
          className="shrink-0 font-sans text-detail font-medium rounded-pill border border-paper/25 bg-paper/[0.06] text-paper px-4 py-2 hover:bg-paper/10 hover:border-paper/45 disabled:opacity-60 transition-colors"
        >
          {busy ? t("ui.syncing") : t("ui.syncNow")}
        </button>
      </div>
    </section>
  );
}
