"use client";

import { useState } from "react";

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
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signOutOthers() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/signout-others", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg("Signed out of all other devices.");
    } catch (e) {
      setMsg(
        `Something went wrong: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  const ua = typeof window !== "undefined" ? window.navigator.userAgent : "";
  const label = parseUA(ua);

  return (
    <section className="mt-6">
      <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
        Devices
      </p>
      <div className="rounded-md border border-paper/12 bg-paper/[0.03] divide-y divide-paper/8 overflow-hidden">
        <div className="px-5 py-4">
          <p className="font-sans text-[14.5px] font-semibold text-paper">
            {label}
            <span className="ml-2 font-sans text-[11px] font-normal uppercase tracking-[1.2px] text-gold/80">
              This device
            </span>
          </p>
          <p className="mt-1 font-sans text-[12px] text-paper/55">
            Active session
          </p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="font-sans text-[14px] font-medium text-paper">
              Sign out of all other devices
            </p>
            <p className="mt-1 font-sans text-[12.5px] text-paper/55 leading-[1.5] max-w-[480px]">
              Revokes every active session except this one. Your data stays
              put; only the sign-in tokens are invalidated.
            </p>
            {msg && (
              <p className="mt-2 font-sans text-[12.5px] text-paper/80">{msg}</p>
            )}
          </div>
          <button
            type="button"
            onClick={signOutOthers}
            disabled={busy}
            className="shrink-0 font-sans text-[13px] font-medium rounded-pill border border-paper/25 bg-paper/[0.06] text-paper px-4 py-2 hover:bg-paper/10 hover:border-paper/45 disabled:opacity-60 transition-colors"
          >
            {busy ? "Working…" : "Sign out others"}
          </button>
        </div>
      </div>
    </section>
  );
}
