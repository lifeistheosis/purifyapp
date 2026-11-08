"use client";

// Share this page (1.9, docs/1.9-build/JOURNAL.md, step 3): a saved page goes
// out as a copy at an unlisted link (/p/<id>), through the phone's share
// sheet. Everyone may share three pages a month; Plus shares without limit,
// and a reader with none left meets the upgrade sheet named for the journal.
// The count is the server's (app/api/journal/share), never kept here.
//
// Shown only where it can work: on a page already saved, for a reader signed
// in, once the server has its table (the owner's SQL,
// docs/1.9-build/sql/shared-pages.sql). Until then it stays out of sight.

import { useEffect, useState } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Share } from "@/components/ui/icons/Share";
import { apiFetch } from "@/lib/api/client";
import { shareText } from "@/lib/share/shareImage";
import { softTick } from "@/lib/ui/softTick";

type Ready = { left: number | null } | null;

export function SharePageButton({ recordId, body, title }: { recordId: string; body: string; title: string }) {
  const { t } = useTranslate();
  const upgrade = useUpgradeModal();
  const [ready, setReady] = useState<Ready>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    apiFetch("/api/journal/share")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { ready?: boolean; left?: number | null };
        if (live && data.ready) setReady({ left: data.left ?? null });
      })
      .catch(() => {
        /* no signal, or not signed in: no Share */
      });
    return () => {
      live = false;
    };
  }, [recordId]);

  if (!ready) return null;

  const share = async () => {
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
        setReady({ left: 0 });
        upgrade.open("journal");
        return;
      }
      if (!res.ok || !data.url) return;
      setReady({ left: data.left ?? null });
      softTick();
      await shareText(title || t("journal.title"), title || t("journal.title"), data.url);
    } catch {
      /* the page stays as it was; nothing was shared */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      data-journal-share=""
      aria-label={ready.left === null ? t("journal.share.action") : `${t("journal.share.action")}, ${t("journal.share.left", { count: ready.left })}`}
      title={ready.left === null ? undefined : t("journal.share.left", { count: ready.left })}
      className="tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-paper/80 hover:text-paper disabled:opacity-50"
    >
      <Share size={20} />
    </button>
  );
}
