"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";

/**
 * "Message the seller" from an order (or a product page later). Unfolds
 * into a one-field composer; on send the buyer lands in the thread,
 * where replies will arrive. Reuses the order's open thread server-side
 * so double-tapping never forks the conversation.
 */
export function BuyerMessageButton({
  orderId,
  storeName,
  subject,
}: {
  orderId: string;
  storeName: string;
  subject: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/shop/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, subject, body: text }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        conversationId?: string;
        error?: string;
      };
      if (res.ok && data.ok && data.conversationId) {
        router.push(`/shop/messages/detail?id=${data.conversationId}`);
        return;
      }
      setError(data.error ?? "Couldn't send the message.");
    } catch {
      setError("Couldn't send the message.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-press inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper"
      >
        Message {storeName}
      </button>
    );
  }

  return (
    <form onSubmit={send} className="w-full space-y-3">
      <label className="block">
        <span className="sr-only">Message to {storeName}</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={`Write to ${storeName} about this order…`}
          className={field}
        />
      </label>
      {error ? (
        <p role="alert" className="font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
