"use client";

import { useCallback, useState } from "react";

import { Card, Pill, ToolbarButton } from "./primitives";

/**
 * Find money Stripe took that the order rows never learned about.
 *
 * Measured on production 2026-09-01: 31 orders sitting `pending` with a Stripe
 * session attached, 1 marked paid, and Stripe's dashboard showing roughly
 * sixty dollars. Settlement runs entirely through the webhook, so anything
 * that stops one arriving leaves the order pending forever and the revenue
 * figures short by exactly that much.
 *
 * DRY RUN FIRST, ALWAYS. The card opens showing what Stripe says without
 * changing anything, and applying is a second, deliberate press. Money moving
 * into the books is not something a page load should do.
 */

type Finding = {
  orderId: string;
  totalCents: number;
  stripeStatus: string;
  result?: string;
  note?: string;
};

type Payload = {
  ok: boolean;
  applied: boolean;
  pendingChecked: number;
  settleable: number;
  recoveredCents: number;
  findings: Finding[];
  lastWebhookAt: string | null;
  lastWebhookResult: string | null;
  error?: string;
};

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

export function ReconcileCard() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState<null | "check" | "apply">(null);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async (apply: boolean) => {
    setBusy(apply ? "apply" : "check");
    setError(null);
    try {
      const r = await fetch("/api/admin/shop/reconcile", {
        method: apply ? "POST" : "GET",
        headers: apply ? { "Content-Type": "application/json" } : undefined,
        body: apply ? JSON.stringify({ confirm: true }) : undefined,
      });
      const body = (await r.json().catch(() => null)) as Payload | null;
      if (!r.ok) {
        setError(body?.error ?? "That didn't run.");
        return;
      }
      setData(body);
    } catch {
      setError("That didn't run.");
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <Card
      title="Reconcile against Stripe"
      subtitle="Asks Stripe which pending orders it actually took money for. Stripe is the only source consulted, and nothing is written until you apply"
      action={
        <div className="flex flex-wrap gap-1.5">
          <ToolbarButton loading={busy === "check"} onClick={() => void call(false)}>
            Check
          </ToolbarButton>
          {/* Only offered once a dry run has found something, so applying is
              never the first thing available. */}
          {data && data.settleable > 0 && !data.applied && (
            <ToolbarButton
              variant="primary"
              loading={busy === "apply"}
              onClick={() => void call(true)}
            >
              Settle {data.settleable}
            </ToolbarButton>
          )}
        </div>
      }
    >
      {error && (
        <p role="alert" className="font-sans text-detail text-[color:var(--adm-critical)]">
          {error}
        </p>
      )}

      {!data && !error && (
        <p className="font-sans text-detail text-paper/45">
          Press Check. Nothing is written by looking.
        </p>
      )}

      {data && (
        <>
          {/* THE DIAGNOSIS, above the recovery. Recovering the money by hand
              is worth nothing if the next sale does the same thing, and this
              line separates the two causes: a webhook that never arrives is a
              registration problem in the Stripe dashboard, while one that
              arrives and fails is a code or data problem visible in the
              Audit log. */}
          <p
            className="mb-2 font-sans text-detail"
            style={{
              color: data.lastWebhookAt ? "var(--adm-ink-2)" : "var(--adm-critical)",
            }}
          >
            {data.lastWebhookAt
              ? `Stripe last called this site on ${new Date(data.lastWebhookAt).toLocaleString()} (${data.lastWebhookResult ?? "no result recorded"}).`
              : "Stripe has never called this site, as far as the log goes back. Check Developers, Webhooks in the Stripe dashboard: an endpoint pointing at https://purifyapp.net/api/shop/stripe-webhook, subscribed to checkout.session.completed."}
          </p>

          <p className="font-sans text-detail text-paper/80">
            {data.applied ? "Settled" : "Checked"} {data.pendingChecked} pending{" "}
            {data.pendingChecked === 1 ? "order" : "orders"}.{" "}
            {data.settleable > 0 ? (
              <span className="text-paper">
                Stripe confirms {data.settleable} of them paid,{" "}
                {usd(data.recoveredCents)}
                {data.applied ? " now in the books." : " not yet in the books."}
              </span>
            ) : (
              "Stripe confirms none of them were paid, so the books are already right."
            )}
          </p>

          {data.findings.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {data.findings.slice(0, 25).map((f) => (
                <li
                  key={f.orderId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--adm-radius-sm)] border p-2"
                  style={{ borderColor: "var(--adm-line)" }}
                >
                  <span className="font-sans text-[12px] text-paper/60 tabular-nums">
                    {usd(f.totalCents)}
                    <span className="ml-2 text-paper/35">{f.orderId.slice(0, 8)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Pill
                      tone={
                        f.stripeStatus === "paid"
                          ? "emerald"
                          : f.stripeStatus === "unreadable"
                            ? "rose"
                            : "neutral"
                      }
                    >
                      {f.stripeStatus}
                    </Pill>
                    {/* An amount mismatch is the guard refusing to settle,
                        not a failure to report quietly: Stripe's total and
                        the order's disagree and a human has to look. */}
                    {f.result && (
                      <Pill tone={f.result === "amount-mismatch" ? "rose" : "neutral"}>
                        {f.result}
                      </Pill>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
