"use client";

import { useState } from "react";

/**
 * Sign out, clear local data, delete account. Wraps each destructive action
 * in a confirmation step so an errant tap doesn't wipe a praying life.
 */
export function ProfileDanger({ signedIn }: { signedIn: boolean }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55">
              Danger zone
            </span>
            <span className="font-sans text-[12px] text-paper/40">
              Sign out · clear local · delete account
            </span>
          </span>
          <span
            aria-hidden
            className="text-paper/40 group-open:rotate-180 transition-transform duration-200 text-[12px]"
          >
            ▾
          </span>
        </summary>

        <div className="px-5 pb-5 pt-2 space-y-5">
          {signedIn && (
            <Row
              title="Sign out"
              body="Sign out on this device. Your local data stays put. Your server-side data stays in your account."
            >
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="font-sans text-[13px] font-medium border border-paper/25 text-paper rounded-pill px-4 py-2 hover:bg-paper/10 transition-colors"
                >
                  Sign out
                </button>
              </form>
            </Row>
          )}

          <Row
            title="Clear local data on this device"
            body="Wipes every purify:* entry from localStorage. Anything synced to your account is untouched. Reload happens automatically."
          >
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="font-sans text-[13px] font-medium border border-paper/25 text-paper rounded-pill px-4 py-2 hover:bg-paper/10 transition-colors"
              >
                Clear local data…
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearLocal}
                  className="font-sans text-[13px] font-semibold bg-[#c1272d] text-paper rounded-pill px-4 py-2 hover:bg-[#a31f24] transition-colors"
                >
                  Yes, wipe local
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="font-sans text-[13px] text-paper/55 hover:text-paper transition-colors px-3 py-2"
                >
                  Cancel
                </button>
              </div>
            )}
          </Row>

          {signedIn && (
            <Row
              title="Delete account"
              body="Removes your account and every server-side row tied to it (profile, bookmarks, annotations). This cannot be undone. Local data on this device is left alone; clear that separately if you want it gone too."
              destructive
            >
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="font-sans text-[13px] font-medium border border-[#c1272d]/40 text-[#f8cac7] rounded-pill px-4 py-2 hover:bg-[#c1272d]/15 transition-colors"
                >
                  Delete account…
                </button>
              ) : (
                <form action="/api/auth/delete" method="post" className="flex gap-2">
                  <button
                    type="submit"
                    className="font-sans text-[13px] font-semibold bg-[#c1272d] text-paper rounded-pill px-4 py-2 hover:bg-[#a31f24] transition-colors"
                  >
                    Yes, delete forever
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="font-sans text-[13px] text-paper/55 hover:text-paper transition-colors px-3 py-2"
                  >
                    Cancel
                  </button>
                </form>
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
        destructive ? "border border-[#c1272d]/25 bg-[#c1272d]/[0.06]" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="font-sans text-[14.5px] font-semibold text-paper leading-tight">
          {title}
        </p>
        <p className="mt-1 font-sans text-[12.5px] text-paper/65 leading-[1.55] max-w-[560px]">
          {body}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
