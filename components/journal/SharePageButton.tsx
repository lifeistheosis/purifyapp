"use client";

// Share this page (1.9, docs/1.9-build/JOURNAL.md, step 3): a saved page goes
// out as a copy at an unlisted link (/p/<id>), through the phone's share
// sheet, the app's one way (lib/share/shareOut.ts): on a computer with no
// share sheet the link is copied and the button says so, where it once made
// the link and showed nothing (Updates 8's finding, routed by Arbiter 2 on
// 2026-11-13). Everyone may share three pages a month; Plus shares without limit,
// and a reader with none left meets the upgrade sheet named for the journal.
// The count is the server's (app/api/journal/share), never kept here.
//
// Shown only where it can work: on a page already saved, for a reader signed
// in, once the server has its table (the owner's SQL,
// docs/1.9-build/sql/shared-pages.sql). Until then it stays out of sight.
//
// Stop sharing (his yes, 2026-11-09, B3 of Fable's release check 1): while a
// page has a copy out, the composer says so under its header, with Stop
// sharing beside it. Stopping asks first, because it deletes: the copy goes
// at once, with the reports on it, and every link to it stops working, as the
// privacy page says (version B). The page stays in the reader's journal.

import { useCallback, useEffect, useState } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Check } from "@/components/ui/icons/Check";
import { Share } from "@/components/ui/icons/Share";
import { countJournalPageShared } from "@/lib/analytics/featureCount";
import { apiFetch } from "@/lib/api/client";
import { shareOut } from "@/lib/share/shareOut";
import { softTick } from "@/lib/ui/softTick";

/** The server's answer for a page: shares left this month (null: no limit), and the page's copies out now. */
type Ready = { left: number | null; shared: number } | null;

export type JournalShare = {
  ready: Ready;
  busy: boolean;
  /** The link was copied, where there was no share sheet to hand it to: said for a moment. */
  copied: boolean;
  share: () => Promise<void>;
  stop: () => Promise<boolean>;
};

/**
 * A saved page's sharing: what the server says of it, Share and Stop sharing.
 * `recordId` null (a note, a page not kept yet, the composer closed) asks
 * nothing and offers nothing.
 */
export function useJournalShare(recordId: string | null, body: string, title: string): JournalShare {
  const { t } = useTranslate();
  const upgrade = useUpgradeModal();
  // The answer is kept with the page it is for, so another page (or none) reads as not asked yet.
  const [known, setKnown] = useState<{ id: string; ready: Ready } | null>(null);
  const ready = recordId && known?.id === recordId ? known.ready : null;
  const setReady = (next: Ready) => {
    if (recordId) setKnown({ id: recordId, ready: next });
  };
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const read = useCallback(async (id: string): Promise<Ready> => {
    try {
      const res = await apiFetch(`/api/journal/share?recordId=${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { ready?: boolean; left?: number | null; shared?: number };
      return data.ready ? { left: data.left ?? null, shared: data.shared ?? 0 } : null;
    } catch {
      /* no signal, or not signed in: no Share */
      return null;
    }
  }, []);

  useEffect(() => {
    if (!recordId) return;
    let live = true;
    void read(recordId).then((r) => {
      if (live) setKnown({ id: recordId, ready: r });
    });
    return () => {
      live = false;
    };
  }, [recordId, read]);

  const share = async () => {
    if (!ready || !recordId) return;
    if (ready.left === 0) {
      upgrade.open("journal");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch("/api/journal/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, body }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; left?: number | null };
      if (res.status === 403) {
        setReady({ ...ready, left: 0 });
        upgrade.open("journal");
        return;
      }
      if (!res.ok || !data.url) return;
      // The 1.9 counts (admin A5): the server has made the link.
      countJournalPageShared();
      setReady({ left: data.left ?? null, shared: ready.shared + 1 });
      softTick();
      if ((await shareOut({ title: title || t("journal.title"), url: data.url })) === "copied") {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* the page stays as it was; nothing was shared */
    } finally {
      setBusy(false);
    }
  };

  const stop = async (): Promise<boolean> => {
    if (!recordId) return false;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/journal/share?recordId=${encodeURIComponent(recordId)}`, { method: "DELETE" });
      if (!res.ok) return false;
      softTick();
      // The server's count again: the month's shares, and none of this page's.
      setReady((await read(recordId)) ?? (ready ? { ...ready, shared: 0 } : null));
      return true;
    } catch {
      /* still shared: the line stays, and Stop sharing can be tried again */
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { ready, busy, copied, share, stop };
}

export function SharePageButton({ share }: { share: JournalShare }) {
  const { t } = useTranslate();
  const { ready, busy, copied } = share;
  if (!ready) return null;
  const named = ready.left === null ? t("journal.share.action") : `${t("journal.share.action")}, ${t("journal.share.left", { count: ready.left })}`;
  return (
    <button
      type="button"
      onClick={() => void share.share()}
      disabled={busy}
      data-journal-share=""
      aria-label={copied ? t("common.linkCopied") : named}
      title={ready.left === null ? undefined : t("journal.share.left", { count: ready.left })}
      className="tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-paper/80 hover:text-paper disabled:opacity-50"
    >
      {copied ? <Check size={20} /> : <Share size={20} />}
      <span aria-live="polite" className="sr-only">
        {copied ? t("common.linkCopied") : ""}
      </span>
    </button>
  );
}

/** Under the composer's header while the page has a copy out: that it is shared, and Stop sharing, which asks first. */
export function SharedPageLine({ share }: { share: JournalShare }) {
  const { t } = useTranslate();
  const [asking, setAsking] = useState(false);
  if (!share.ready || share.ready.shared === 0) return null;
  return (
    <>
      <p className="mt-3 flex min-w-0 items-center gap-3 font-sans text-caption text-paper/60" data-journal-shared="">
        <span className="min-w-0">{t("journal.share.sharedLine")}</span>
        <button
          type="button"
          onClick={() => setAsking(true)}
          disabled={share.busy}
          data-journal-stop-sharing=""
          className="tap-press ms-auto inline-flex min-h-11 shrink-0 items-center px-3 font-semibold text-paper/80 underline underline-offset-4 hover:text-paper disabled:opacity-50"
        >
          {t("journal.share.stop")}
        </button>
      </p>
      <ConfirmDialog
        open={asking}
        title={t("journal.share.stopTitle")}
        description={t("journal.share.stopBody")}
        confirmLabel={t("journal.share.stop")}
        cancelLabel={t("common.cancel")}
        destructive
        onConfirm={() => {
          setAsking(false);
          void share.stop();
        }}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}
