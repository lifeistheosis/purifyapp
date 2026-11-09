"use client";

/**
 * The admin's second sign-in step (A4): one quiet card, two forms of it.
 *
 *   verify  He has the code app: type the 6 digits, and the panel opens.
 *   enroll  He adds the code app: open it, scan the code, type the 6 digits.
 *
 * Edgar's condition (2026-11-09): "if you're gonna implement it into the
 * onboarding, make sure it's clean". So: one card, three short steps at
 * most, one field, one button, and every message in plain words. The rule
 * and why it is safe are in lib/admin/secondStep.ts.
 *
 * The code is checked by Supabase Auth itself (mfa.challengeAndVerify),
 * straight from the browser with his own session; no admin route is
 * involved. On success the session is at aal2 and the page is loaded again,
 * so the server reads the new level from the cookie.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";

import { cleanCode, groupKey, qrImageSrc } from "@/lib/admin/secondStep";
import { createClient } from "@/lib/supabase/client";

type Mode = "verify" | "enroll";

type Setup = { qr: string; secret: string };

const ink = { color: "var(--adm-ink)" } as const;
const ink2 = { color: "var(--adm-ink-2)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

const PRIMARY: CSSProperties = {
  "--_bd": "transparent",
  "--_bg": "var(--adm-accent)",
  "--_bg-hover": "color-mix(in oklab, var(--adm-accent), var(--adm-bg) 14%)",
  color: "var(--adm-on-accent)",
} as CSSProperties;

/** Where to go once the code is accepted: the panel, keeping a #tab= link. */
function backToPanel() {
  window.location.replace(`/admin${window.location.hash}`);
}

export function AdminSecondStep({ mode, email, optional = false }: { mode: Mode; email: string; optional?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const started = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Find his code app, or start adding one. Once: a second run would start a
  // second setup and leave the first half-made.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        if (mode === "verify") {
          const app = data.totp.find((f) => f.status === "verified");
          if (!app) {
            setProblem("This account's second step is not a code app. Remove it in Supabase (Authentication, Users), then add a code app here.");
            return;
          }
          setFactorId(app.id);
        } else {
          // A setup started before and never finished is cleared first, so
          // this one starts clean.
          for (const f of data.all) {
            if (f.factor_type === "totp" && f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
          }
          const { data: made, error: makeError } = await supabase.auth.mfa.enroll({
            factorType: "totp",
            issuer: "Purify",
            friendlyName: `Purify admin ${new Date().toISOString().slice(0, 10)}`,
          });
          if (makeError) throw makeError;
          setFactorId(made.id);
          setSetup({ qr: qrImageSrc(made.totp.qr_code), secret: made.totp.secret });
        }
        setReady(true);
      } catch (e) {
        // Supabase answers this way when code apps are switched off for the
        // project: say where to switch them on rather than "try again".
        const message = e instanceof Error ? e.message : "";
        setProblem(
          /disabled|not enabled/i.test(message)
            ? "Code apps are switched off for this project. In Supabase, open Authentication, then Multi-Factor, turn on TOTP, and reload this page."
            : "The sign-in service did not answer. Reload the page to try again.",
        );
      }
    })();
  }, [mode, supabase]);

  useEffect(() => {
    if (ready) input.current?.focus();
  }, [ready]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const typed = cleanCode(code);
    if (!typed) {
      setProblem("Type the 6 digits your app shows.");
      return;
    }
    if (!factorId) return;
    setBusy(true);
    setProblem(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: typed });
    if (error) {
      setBusy(false);
      setCode("");
      input.current?.focus();
      setProblem(
        /invalid|expired|mismatch|code/i.test(error.message)
          ? "That code did not match. The code changes every 30 seconds, so type the newest one."
          : "The code could not be checked just now. Try again.",
      );
      return;
    }
    backToPanel();
  }

  return (
    <section className="adm adm-page grid min-h-[100dvh] place-items-center px-4 py-10">
      <div
        className="w-full max-w-[440px] rounded-[var(--adm-radius-lg)] border p-6 sm:p-7"
        style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel)", boxShadow: "var(--adm-shadow-card)" }}
      >
        <p className="font-sans text-[11.5px] uppercase tracking-[0.08em]" style={ink3}>
          Purify admin
        </p>
        <h1 className="mt-2 font-sans text-[22px] font-semibold leading-tight" style={ink}>
          {mode === "verify" ? "Enter your sign-in code" : "Add a sign-in code"}
        </h1>
        <p className="mt-2 font-sans text-[14px] leading-[1.55]" style={ink2}>
          {mode === "verify"
            ? "The 6 digits from the authenticator app on your phone."
            : "From now on the admin asks for a 6-digit code from your phone after you sign in. It takes a minute."}
        </p>

        {mode === "enroll" ? (
          <ol className="mt-5 space-y-4 font-sans text-[14px] leading-[1.5]" style={ink2}>
            <li>
              <span style={ink}>1.</span> Open an authenticator app on your phone: Google Authenticator, Microsoft
              Authenticator, 1Password or Authy.
            </li>
            <li>
              <span style={ink}>2.</span> Scan this code with it.
              <div className="mt-3 flex justify-center">
                {setup ? (
                  // On white whatever the theme: a phone's camera needs the contrast.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={setup.qr}
                    alt="The code to scan, for your authenticator app"
                    width={176}
                    height={176}
                    className="rounded-[var(--adm-radius-sm)] bg-white p-2"
                  />
                ) : (
                  <div className="h-[176px] w-[176px] rounded-[var(--adm-radius-sm)]" style={{ background: "var(--adm-panel-2)" }} aria-hidden />
                )}
              </div>
              {setup ? (
                <p className="mt-2 text-center text-[12.5px]" style={ink3}>
                  Can&apos;t scan it? Add this key by hand:{" "}
                  <span className="select-all font-mono" style={ink2}>
                    {groupKey(setup.secret)}
                  </span>
                </p>
              ) : null}
            </li>
            <li>
              <span style={ink}>3.</span> Type the 6 digits it shows.
            </li>
          </ol>
        ) : null}

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <label htmlFor="admin-code" className="font-sans text-[12.5px]" style={ink3}>
            6-digit code
          </label>
          <input
            ref={input}
            id="admin-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={!ready || busy}
            className="min-h-12 w-full rounded-[var(--adm-radius-sm)] border px-3 text-center font-mono text-[22px] tracking-[0.3em] outline-none"
            style={{ borderColor: "var(--adm-line-strong)", background: "var(--adm-control)", color: "var(--adm-ink)" }}
            aria-describedby={problem ? "admin-code-problem" : undefined}
          />
          <button
            type="submit"
            disabled={!ready || busy}
            aria-busy={busy || undefined}
            className="adm-control min-h-11 w-full rounded-[var(--adm-radius-sm)] font-sans text-[14px] font-semibold disabled:opacity-60"
            style={PRIMARY}
          >
            {busy ? "Checking" : mode === "verify" ? "Continue" : "Turn it on"}
          </button>
          {problem ? (
            <p id="admin-code-problem" role="alert" className="font-sans text-[13px] leading-[1.5]" style={{ color: "var(--adm-critical)" }}>
              {problem}
            </p>
          ) : null}
        </form>

        <p className="mt-6 font-sans text-[12.5px] leading-[1.5]" style={ink3}>
          Signed in as {email}.{" "}
          <a href="/signout" className="inline-flex min-h-11 items-center underline" style={ink2}>
            Sign out
          </a>
          {optional ? (
            <>
              {" "}
              <a href="/admin" className="inline-flex min-h-11 items-center underline" style={ink2}>
                Not now
              </a>
            </>
          ) : null}
        </p>
        {mode === "enroll" ? (
          <p className="font-sans text-[12px] leading-[1.5]" style={ink3}>
            If the phone is ever lost, the code is removed in Supabase (Authentication, Users, your account), and added
            again here.
          </p>
        ) : null}
      </div>
    </section>
  );
}
