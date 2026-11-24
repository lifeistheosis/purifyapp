"use client";

/**
 * The bank, on Money's Overview: Mercury's balances, this month's money in
 * and out by kind, and the newest lines. Owner only: /api/owner/bank answers
 * 403 to any other admin, and then nothing renders. Read when the tab opens,
 * kept ten minutes on the server (lib/owner/mercury.server.ts), so the panel
 * follows the bank by itself with nothing typed in.
 *
 * His word, 2026-11-24: "ensure our admin panel incorporates the new changes
 * and reflects the newest data autonomously". A bank that is not connected or
 * not read is said in words, never shown as $0.
 */

import { useEffect, useState } from "react";

import { SENSITIVE } from "@/lib/admin/streamer";
import type { BankRead } from "@/lib/owner/mercury.server";

import { Panel, Quiet } from "../daily/parts";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

type State =
  | { kind: "reading" }
  | { kind: "hidden" }
  | { kind: "note"; text: string }
  | { kind: "read"; bank: BankRead };

export function BankPanel() {
  const [s, setS] = useState<State>({ kind: "reading" });

  useEffect(() => {
    let live = true;
    void fetch("/api/owner/bank", { cache: "no-store" })
      .then(async (r) => {
        if (!live) return;
        if (r.status === 403 || r.status === 401) return setS({ kind: "hidden" });
        const body = (await r.json().catch(() => null)) as (BankRead & { error?: string }) | null;
        if (!r.ok || !body || body.error) return setS({ kind: "note", text: body?.error ?? "The bank could not be read." });
        setS({ kind: "read", bank: body });
      })
      .catch(() => live && setS({ kind: "note", text: "The bank could not be read." }));
    return () => {
      live = false;
    };
  }, []);

  if (s.kind === "hidden") return null;
  if (s.kind !== "read") {
    return (
      <Panel title="The bank">
        <Quiet>{s.kind === "reading" ? "Reading." : s.text}</Quiet>
      </Panel>
    );
  }

  const { bank } = s;
  const month = new Date().toISOString().slice(0, 7);
  const m = bank.months[month];
  const balance = bank.accounts.reduce((t, a) => t + (a.balance ?? 0), 0);
  const read = new Date(bank.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const cats = m ? Object.entries(m.byCategory).sort((a, b) => a[1] - b[1]) : [];

  return (
    <Panel title={`The bank, Mercury, read at ${read}`}>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { k: "Balance", v: balance },
          { k: "In this month", v: m?.in ?? 0 },
          { k: "Out this month", v: m?.out ?? 0 },
          { k: "Kept this month", v: m?.net ?? 0 },
        ].map((f) => (
          <div key={f.k} className="min-w-0">
            <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
              {f.k}
            </p>
            <p className={"font-mono text-[18px] " + SENSITIVE} style={{ color: "var(--adm-ink)" }}>
              {usd(f.v)}
            </p>
          </div>
        ))}
      </div>

      {cats.length === 0 ? (
        <Quiet className="mt-3">
          No bank lines this month. Store payouts and bills show here once they go through Mercury.
        </Quiet>
      ) : (
        <ul className="mt-3">
          {cats.map(([cat, v]) => (
            <li
              key={cat}
              className="flex min-h-[36px] items-center gap-3 border-t font-sans text-[12.5px]"
              style={{ borderColor: "var(--adm-line)" }}
            >
              <span className="min-w-0 flex-1 truncate" style={{ color: "var(--adm-ink-2)" }}>
                {cat}
              </span>
              <span className={"font-mono " + SENSITIVE} style={{ color: "var(--adm-ink)" }}>
                {usd(v)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {bank.recent.length > 0 ? (
        <>
          <h3 className="mt-4 font-sans text-[12px] font-normal" style={{ color: "var(--adm-ink-3)" }}>
            Newest lines
          </h3>
          <ul className="mt-1">
            {bank.recent.map((t, i) => (
              <li
                key={`${t.at}-${i}`}
                className="flex min-h-[36px] items-center gap-3 border-t font-sans text-[12.5px]"
                style={{ borderColor: "var(--adm-line)" }}
              >
                <span className={"min-w-0 flex-1 truncate " + SENSITIVE} style={{ color: "var(--adm-ink-2)" }}>
                  {t.who}
                  <span style={{ color: "var(--adm-ink-3)" }}>, {t.category}</span>
                </span>
                <span className={"font-mono " + SENSITIVE} style={{ color: "var(--adm-ink)" }}>
                  {usd(t.amount)}
                </span>
                <span className="w-[66px] shrink-0 text-right text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                  {t.at ? new Date(t.at).toLocaleDateString([], { month: "short", day: "numeric" }) : "pending"}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Panel>
  );
}
