"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Change-email card. Supabase sends a confirmation link to the NEW
 * address; until the user clicks it, the email on file stays the
 * old one. We surface that "check your new inbox" state plainly.
 */
export function ChangeEmailCard({ currentEmail }: { currentEmail: string }) {
  const [next, setNext] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    const target = next.trim();
    if (!target) return;
    if (target === currentEmail) {
      setError("That's the email already on file.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ email: target });
      if (err) throw err;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't request the change.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
      <h2 className="font-sans text-[16px] font-semibold text-paper mb-1">
        Change email
      </h2>
      <p className="font-sans text-[13px] text-paper/60 mb-5 leading-[1.55]">
        Current:{" "}
        <span className="text-paper/85 font-medium">{currentEmail}</span>.
        We&rsquo;ll send a confirmation link to the new address; the
        change isn&rsquo;t live until you click it.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3 max-w-[420px]">
        <div>
          <label
            htmlFor="new-email"
            className="font-sans text-[12px] font-medium text-paper/75 block mb-1.5"
          >
            New email
          </label>
          <input
            id="new-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="new@somewhere.com"
            className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-[15px] text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/55 transition-colors"
          />
        </div>
        {error ? (
          <p className="font-sans text-[13px] text-[#f8cac7]">{error}</p>
        ) : null}
        {sent ? (
          <p className="font-sans text-[13px] text-emerald-300">
            Sent. Open the confirmation in <strong>{next.trim()}</strong> to
            finish the change.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-pill bg-paper text-night font-sans text-[13.5px] font-semibold px-5 py-2.5 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
        >
          {pending ? "Sending…" : "Send confirmation"}
        </button>
      </form>
    </section>
  );
}
