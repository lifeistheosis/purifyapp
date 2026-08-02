"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { NotConfirmedError, expectOk } from "@/lib/api/expectOk";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Sign out, clear local data, delete account. Wraps each destructive action
 * in a confirmation step so an errant tap doesn't wipe a praying life.
 *
 * Both server-side actions here used to be plain `<form action="/api/...">`
 * POSTs. Inside the native shell that posts to https://localhost, where
 * app/api has been stashed out of the export and nothing answers: the reader
 * confirmed "delete forever", landed on an error page, and still had an
 * account. A form POST also cannot report failure, which is why deletion is
 * now a fetch whose success is asserted from the response body.
 */
export function ProfileDanger({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslate();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await apiFetch("/api/auth/delete", { method: "POST" });
      // Only a JSON body saying ok:true counts. Anything else, including a
      // 200 carrying the shell's HTML fallback, is a deletion that did not
      // happen and must never be reported as one.
      await expectOk(res);
      // The account is gone; drop the local session before leaving so the app
      // does not spend a moment believing it is still signed in.
      try {
        await createClient().auth.signOut();
      } catch {
        // Already invalid server-side. Navigating away is enough.
      }
      window.location.assign("/");
    } catch (e) {
      setDeleteError(
        e instanceof NotConfirmedError
          ? `${e.message} Your account has not been deleted.`
          : "Couldn't reach the server. Your account has not been deleted.",
      );
      setDeleting(false);
    }
  }

  function clearLocal() {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith("purify:")) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
    window.dispatchEvent(new CustomEvent("purify:bookmark"));
    window.dispatchEvent(new CustomEvent("purify:annotation"));
    setConfirmClear(false);
    // A tiny pause so the visual confirmation registers.
    setTimeout(() => window.location.reload(), 300);
  }

  return (
    <section className="mt-12">
      <details className="group rounded-md border border-paper/12 bg-paper/[0.02] open:bg-paper/[0.04] transition-colors">
        <summary className="cursor-pointer list-none px-5 py-3.5 flex items-center justify-between">
          <span className="flex items-baseline gap-3">
            <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
              {t("ui.dangerZone")}
            </span>
            <span className="font-sans text-caption text-paper/40">
              {t("ui.signOutClearLocalDelete")}
            </span>
          </span>
          <span
            aria-hidden
            className="text-paper/40 group-open:rotate-180 transition-transform duration-200 text-caption"
          >
            ▾
          </span>
        </summary>

        <div className="px-5 pb-5 pt-2 space-y-5">
          {signedIn && (
            <Row
              title={t("common.signOut")}
              body="Sign out on this device. Your local data stays put. Your server-side data stays in your account."
            >
              {/* /signout, not a POST to /api/auth/signout. The dedicated
                  page already handles the native case correctly with a client
                  signOut({ scope: "local" }); the form POST simply died at
                  https://localhost and left the reader signed in on an error
                  page. Two sign-out affordances, and only one worked. */}
              <Link
                href="/signout"
                className="inline-flex font-sans text-detail font-medium border border-paper/25 text-paper rounded-pill px-4 py-2 hover:bg-paper/10 transition-colors"
              >
                {t("common.signOut")}
              </Link>
            </Row>
          )}

          <Row
            title={t("ui.clearLocalDataOnThis")}
            body="Wipes every purify:* entry from localStorage. Anything synced to your account is untouched. Reload happens automatically."
          >
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="font-sans text-detail font-medium border border-paper/25 text-paper rounded-pill px-4 py-2 hover:bg-paper/10 transition-colors"
              >
                {t("ui.clearLocalData")}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearLocal}
                  className="font-sans text-detail font-semibold bg-crimson text-paper rounded-pill px-4 py-2 hover:bg-[#a31f24] transition-colors"
                >
                  {t("ui.yesWipeLocal")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="font-sans text-detail text-paper/55 hover:text-paper transition-colors px-3 py-2"
                >
                  {t("common.cancel")}
                </button>
              </div>
            )}
          </Row>

          {signedIn && (
            <Row
              title={t("account.deleteAccount")}
              body="Removes your account and every server-side row tied to it (profile, bookmarks, annotations). This cannot be undone. Local data on this device is left alone; clear that separately if you want it gone too."
              destructive
            >
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="font-sans text-detail font-medium border border-crimson/40 text-crimson-soft rounded-pill px-4 py-2 hover:bg-crimson/15 transition-colors"
                >
                  {t("ui.deleteAccount")}
                </button>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={deleteAccount}
                      disabled={deleting}
                      className="font-sans text-detail font-semibold bg-crimson text-paper rounded-pill px-4 py-2 hover:bg-[#a31f24] transition-colors disabled:opacity-60"
                    >
                      {deleting ? "Deleting…" : t("ui.yesDeleteForever")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="font-sans text-detail text-paper/55 hover:text-paper transition-colors px-3 py-2 disabled:opacity-60"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                  {deleteError && (
                    <p
                      role="alert"
                      className="mt-3 font-sans text-caption text-crimson-soft"
                    >
                      {deleteError}
                    </p>
                  )}
                </div>
              )}
            </Row>
          )}
        </div>
      </details>
    </section>
  );
}

function Row({
  title,
  body,
  destructive,
  children,
}: {
  title: string;
  body: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-start justify-between gap-4 rounded-md p-4 ${
        destructive ? "border border-crimson/25 bg-crimson/[0.06]" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="font-sans text-ui font-semibold text-paper leading-tight">
          {title}
        </p>
        <p className="mt-1 font-sans text-caption text-paper/65 leading-[1.55] max-w-[560px]">
          {body}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
