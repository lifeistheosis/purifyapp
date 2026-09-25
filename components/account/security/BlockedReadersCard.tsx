"use client";

import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  listBlockedReaders,
  unblockCommunityAuthor,
  type BlockedReader,
} from "@/lib/community/client";

/**
 * The readers this account has blocked in Community, and a way back.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * Blocking shipped for App Review guideline 1.2 with a working DELETE route
 * and an `unblockCommunityAuthor()` that nothing in the app ever called. So a
 * block was permanent from the reader's side. On 2026-08-31 a reader wrote in
 * Community: "needs an unblock button i accidentally blocked patryk". They had
 * no way back, and neither had anyone else.
 *
 * It lives in Security rather than in Community because this is where people
 * look for "who have I blocked" in every app they already use, and because
 * the Community tab is a feed: a management list inside it would scroll away.
 *
 * ── Names only ──────────────────────────────────────────────────────────
 *
 * The list carries the name as it was when the block was made and the date,
 * never a user id. The route resolves authors server-side and the client is
 * never handed one, which is the same rule the public feed follows.
 *
 * ── Unblocking asks first ──────────────────────────────────────────────
 *
 * Lifting a block brings that person's posts and replies back into the feed,
 * which for somebody blocked for a reason is not a small thing to do by
 * mis-tap. So it confirms, the same as blocking now does.
 */
export function BlockedReadersCard() {
  const { t, tn } = useTranslate();
  // null while loading; "error" when the list could not be read, which must
  // never be shown as an empty list.
  const [blocks, setBlocks] = useState<BlockedReader[] | "error" | null>(null);
  const [confirming, setConfirming] = useState<BlockedReader | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await listBlockedReaders();
    setBlocks(list ?? "error");
  }, []);

  useEffect(() => {
    // Resolved here with .then rather than by calling load(), so the state
    // write happens in the promise callback and never synchronously in the
    // effect. `alive` stops a response that lands after the card unmounts.
    // load() stays for the Try again button, which is an event, not an effect.
    let alive = true;
    void listBlockedReaders().then((list) => {
      if (alive) setBlocks(list ?? "error");
    });
    return () => {
      alive = false;
    };
  }, []);

  async function unblock(reader: BlockedReader) {
    setPending(true);
    setError(null);
    const res = await unblockCommunityAuthor(reader.id);
    setPending(false);
    setConfirming(null);
    if (res.ok) {
      setBlocks((prev) =>
        Array.isArray(prev) ? prev.filter((b) => b.id !== reader.id) : prev,
      );
    } else {
      setError(res.error ?? t("community.unblockFailed"));
    }
  }

  return (
    <section className="rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
      <h2 className="font-sans text-body font-semibold text-paper mb-1">
        {t("community.blockedTitle")}
      </h2>
      <p className="font-sans text-detail text-paper/60 mb-5 leading-[1.55]">
        {t("community.blockedHint")}
      </p>

      {blocks === null ? (
        <p className="font-sans text-detail text-paper/45">{t("community.blockedLoading")}</p>
      ) : blocks === "error" ? (
        <div>
          <p className="font-sans text-detail text-crimson-soft">
            {t("community.blockedLoadFailed")}
          </p>
          <button
            type="button"
            onClick={() => {
              setBlocks(null);
              void load();
            }}
            className="mt-2 font-sans text-detail font-semibold text-gold-pale hover:text-paper"
          >
            {t("community.tryAgain")}
          </button>
        </div>
      ) : blocks.length === 0 ? (
        <p className="font-sans text-detail text-paper/45">{t("community.blockedNone")}</p>
      ) : (
        <>
          <p className="mb-3 font-sans text-caption text-paper/45">
            {tn("community.blockedCount", blocks.length)}
          </p>
          <ul className="divide-y divide-paper/8 rounded-md border border-paper/10">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-sans text-detail font-semibold text-paper">
                    {b.blocked_name}
                  </p>
                  <p className="font-sans text-caption text-paper/45">
                    {t("community.blockedOn", {
                      date: new Date(b.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }),
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirming(b)}
                  disabled={pending}
                  aria-label={t("community.unblockAria", { name: b.blocked_name })}
                  className="hit-44 shrink-0 rounded-pill border border-paper/20 px-3.5 py-1.5 font-sans text-caption font-medium text-paper/80 transition-colors hover:border-paper/40 hover:bg-paper/[0.06] hover:text-paper disabled:opacity-50"
                >
                  {t("community.unblock")}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {error ? (
        <p role="alert" className="mt-3 font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirming !== null}
        title={t("community.unblockConfirmTitle", { name: confirming?.blocked_name ?? "" })}
        description={t("community.unblockConfirmBody")}
        confirmLabel={t("community.unblock")}
        pending={pending}
        onConfirm={() => confirming && void unblock(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}
