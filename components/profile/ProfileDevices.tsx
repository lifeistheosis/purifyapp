"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { NotConfirmedError, expectOk } from "@/lib/api/expectOk";
import { useTranslate } from "@/components/i18n/MessagesProvider";

function parseUA(ua: string): string {
  if (!ua) return "This device";
  if (/iPhone|iPod/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh|Mac OS X/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Web";
}

/**
 * Devices section on the account dashboard. v5.3 ships a simplified
 * version: the current device card (parsed from window.navigator.userAgent)
 * plus a "Sign out of all other devices" action that POSTs to
 * `/api/auth/signout-others`. The full per-session list with revoke-
 * individual lives in v5.4 (needs the Supabase admin API).
 */
export function ProfileDevices() {
  const { t } = useTranslate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function signOutOthers() {
    setBusy(true);
    setMsg(null);
    setFailed(false);
    try {
      // apiFetch, because a relative path inside the native shell reaches
      // https://localhost where app/api is stashed out of the export.
      const res = await apiFetch("/api/auth/signout-others", { method: "POST" });
      // expectOk, not res.ok: the shell can answer that same request with the
      // SPA fallback, HTTP 200 and an HTML body, and this control then said
      // "Signed out of all other devices" while every other session stayed
      // live. A security control that lies is worse than one that is missing.
      await expectOk(res);
      setMsg("Signed out of all other devices.");
    } catch (e) {
      setFailed(true);
      setMsg(
        e instanceof NotConfirmedError
          ? `${e.message} Your other sessions may still be active.`
          : "Couldn't reach the server. Your other sessions may still be active.",
      );
    } finally {
      setBusy(false);
    }
  }

  const ua = typeof window !== "undefined" ? window.navigator.userAgent : "";
  const label = parseUA(ua);

  return (
    <section className="mt-6">
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
        {t("ui.devices")}
      </p>
      <div className="rounded-md border border-paper/12 bg-paper/[0.03] divide-y divide-paper/8 overflow-hidden">
        <div className="px-5 py-4">
          <p className="font-sans text-ui font-semibold text-paper">
            {label}
            <span className="ml-2 font-sans text-eyebrow font-normal uppercase tracking-[1.2px] text-gold/80">
              {t("ui.thisDevice")}
            </span>
          </p>
          <p className="mt-1 font-sans text-caption text-paper/55">
            {t("ui.activeSession")}
          </p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="font-sans text-ui font-medium text-paper">
              {t("ui.signOutOfAllOther")}
            </p>
            <p className="mt-1 font-sans text-caption text-paper/55 leading-[1.5] max-w-[480px]">
              {t("ui.revokesEveryActiveSessionExcept")}
            </p>
            {msg && (
              // role="alert" so the outcome of a security action is announced,
              // and a distinct colour so a failure cannot be mistaken for the
              // success it used to always claim.
              <p
                role="alert"
                className={`mt-2 font-sans text-caption ${
                  failed ? "text-crimson-soft" : "text-paper/80"
                }`}
              >
                {msg}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={signOutOthers}
            disabled={busy}
            className="shrink-0 font-sans text-detail font-medium rounded-pill border border-paper/25 bg-paper/[0.06] text-paper px-4 py-2 hover:bg-paper/10 hover:border-paper/45 disabled:opacity-60 transition-colors"
          >
            {busy ? "Working…" : "Sign out others"}
          </button>
        </div>
      </div>
    </section>
  );
}
