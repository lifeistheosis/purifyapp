"use client";

import { useState } from "react";

/**
 * Support request form. Posts to /api/support/tickets, which creates the
 * ticket and returns its number. Anonymous is fine; a signed-in user's email
 * can be prefilled by the server page.
 *
 * The success panel shows the ticket number and does NOT promise a
 * confirmation email. The route only sends a receipt to a signed-in user's
 * own account address, because sending one to an arbitrary address in the
 * form is what made this endpoint a mail relay. Telling an anonymous
 * submitter to watch their inbox would be a promise the server no longer
 * keeps, so the number on screen is the receipt.
 */
export function ContactForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, subject, body }),
      });
      const data = (await res.json()) as {
        ticketNumber?: string;
        error?: string;
      };
      if (res.ok && data.ticketNumber) {
        setTicketNumber(data.ticketNumber);
        return;
      }
      setError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (ticketNumber) {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.05] p-6 text-center">
        <p className="font-display-serif text-title text-paper">Message received</p>
        <p className="mt-2 font-sans text-detail text-paper/70">
          We&rsquo;ll reply by email shortly. Your ticket number is
        </p>
        <p className="mt-2 font-sans text-title-sm font-semibold tracking-wide text-paper">
          {ticketNumber}
        </p>
        <p className="mt-3 font-sans text-caption text-paper/55">
          Keep this number. We&rsquo;ll reply to {email}.
        </p>
      </div>
    );
  }

  const field =
    "mt-1 w-full rounded-lg border border-paper/15 bg-paper/[0.03] px-3 py-2.5 font-sans text-ui text-paper placeholder:text-paper/35 focus:border-paper/40 focus:outline-none";
  const label = "font-sans text-caption font-medium text-paper/70";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Your name</span>
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional"
            maxLength={120}
          />
        </label>
        <label className="block">
          <span className={label}>Email</span>
          <input
            className={field}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={200}
          />
        </label>
      </div>
      <label className="block">
        <span className={label}>Subject</span>
        <input
          className={field}
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="How can we help?"
          maxLength={200}
        />
      </label>
      <label className="block">
        <span className={label}>Message</span>
        <textarea
          className={field}
          required
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tell us what's going on. Include your order number if it's about an order."
          maxLength={5000}
        />
      </label>
      {error ? (
        <p role="alert" className="font-sans text-caption text-crimson-soft">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="tap-press inline-flex min-h-[48px] items-center justify-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
