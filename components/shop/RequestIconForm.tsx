"use client";

import Link from "next/link";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { SAINTS } from "@/lib/saints/saints";
import { BUDGET_BAND_LABELS } from "@/lib/shop/format";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";
const labelCls = "font-sans text-caption font-semibold text-paper/60";

/**
 * Request an Icon. Demand collection for manual follow-up: no auction,
 * no public board, just "tell us who you're praying with". Saint
 * suggestions come from the Purify registry via a native datalist so
 * the field autocompletes without a widget.
 */
export function RequestIconForm({
  signedIn,
  defaultSubject = "",
  defaultNotify = false,
}: {
  signedIn: boolean;
  defaultSubject?: string;
  defaultNotify?: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const subjectRaw = String(form.get("subject") ?? "").trim();
    // If the typed subject matches a registry saint by name, carry the
    // slug too so the request links into the content graph.
    const matched = SAINTS.find(
      (s) => s.name.toLowerCase() === subjectRaw.toLowerCase(),
    );
    const payload = {
      subject: subjectRaw,
      saintSlug: matched?.slug ?? null,
      requestType: String(form.get("requestType") ?? "either"),
      preferredSize: String(form.get("preferredSize") ?? "") || null,
      productPreference: String(form.get("productPreference") ?? "") || null,
      budgetBand: String(form.get("budgetBand") ?? "") || null,
      desiredDate: String(form.get("desiredDate") ?? "") || null,
      notes: String(form.get("notes") ?? "") || null,
      email: String(form.get("email") ?? "") || null,
      notify: form.get("notify") === "on",
    };
    setState("busy");
    try {
      const res = await apiFetch("/api/shop/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setState("done");
        return;
      }
      setError(data.error ?? "Something went wrong. Please try again.");
      setState("idle");
    } catch {
      setError("Something went wrong. Please try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-paper/10 bg-night-soft/60 p-8">
        <p className="font-display-serif text-title text-paper">
          Your request is with us.
        </p>
        <p className="mt-3 font-serif text-body text-paper/70 leading-[1.65]">
          We read every request and answer by email when we find the icon or
          have a question. There&rsquo;s no obligation on your side.
        </p>
        <Link
          href="/shop"
          className="mt-5 inline-flex font-sans text-detail font-medium text-gold"
        >
          Back to the shop →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block space-y-1.5">
        <span className={labelCls}>Saint or subject *</span>
        <input
          name="subject"
          required
          minLength={2}
          maxLength={200}
          defaultValue={defaultSubject}
          placeholder="St Moses the Black, Christ Pantocrator, the Nativity…"
          list="shop-saints"
          className={field}
        />
        <datalist id="shop-saints">
          {SAINTS.map((s) => (
            <option key={s.slug} value={s.name} />
          ))}
        </datalist>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className={labelCls}>Ready-made or custom?</span>
          <select name="requestType" defaultValue="either" className={field}>
            <option value="either">Either</option>
            <option value="ready_made">Ready-made</option>
            <option value="custom">Custom work</option>
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Preferred product type</span>
          <input
            name="productPreference"
            maxLength={200}
            placeholder="Wooden icon, print, laminated…"
            className={field}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Preferred size</span>
          <input
            name="preferredSize"
            maxLength={100}
            placeholder='e.g. around 6&times;8"'
            className={field}
          />
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Budget</span>
          <select name="budgetBand" defaultValue="" className={field}>
            <option value="">Prefer not to say</option>
            {Object.entries(BUDGET_BAND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className={labelCls}>Needed by (optional)</span>
          <input name="desiredDate" type="date" className={field} />
        </label>
        {!signedIn ? (
          <label className="block space-y-1.5">
            <span className={labelCls}>Email *</span>
            <input
              name="email"
              type="email"
              required
              maxLength={320}
              placeholder="you@example.com"
              className={field}
            />
          </label>
        ) : null}
      </div>

      <label className="block space-y-1.5">
        <span className={labelCls}>Notes</span>
        <textarea
          name="notes"
          rows={4}
          maxLength={2000}
          placeholder="Anything that helps: the occasion, a style you love, a photo reference you have in mind…"
          className={field}
        />
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="notify"
          defaultChecked={defaultNotify}
          className="mt-1 h-4 w-4 rounded border-paper/30 bg-night accent-[#c9a961]"
        />
        <span className="font-sans text-detail text-paper/70">
          Email me if this icon becomes available in the shop.
        </span>
      </label>

      {error ? (
        <p role="alert" className="font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "busy"}
        className="tap-press inline-flex min-h-[48px] items-center justify-center rounded-pill bg-paper px-8 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
      >
        {state === "busy" ? "Sending…" : "Send request"}
      </button>
      <p className="font-sans text-caption text-paper/60">
        Requests go to the Purify Shop team for manual follow-up. Nothing is
        purchased or promised by sending one.
      </p>
    </form>
  );
}
