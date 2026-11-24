import "server-only";

import { categorize, summarizeBank, type Month } from "@/lib/owner/bank.mjs";

/**
 * The bank, read from Mercury for the admin's Bank panel (owner only, through
 * app/api/owner/bank). MERCURY_API_TOKEN on Render is a READ-ONLY token: it
 * can list accounts and transactions and cannot move money. Unset: the panel
 * says the bank is not connected, never $0.
 *
 * Kept ten minutes in memory, so opening the panel again and again asks
 * Mercury at most six times an hour. His word, 2026-11-24: "ensure our admin
 * panel incorporates the new changes and reflects the newest data
 * autonomously". docs/owner-digest.md.
 */

export type BankLine = { at: string; amount: number; who: string; category: string; status: string };
export type BankRead = {
  at: string;
  windowDays: number;
  accounts: { name: string; kind: string; balance: number }[];
  months: Record<string, Month>;
  recent: BankLine[];
};

type MercuryTx = {
  amount: number;
  counterpartyName?: string | null;
  bankDescription?: string | null;
  kind?: string;
  status?: string;
  postedAt?: string | null;
  createdAt?: string;
};

const KEEP_MS = 10 * 60_000;
const WINDOW_DAYS = 90;
let kept: { read: BankRead; at: number } | null = null;

export const mercuryConfigured = () => !!process.env.MERCURY_API_TOKEN;

async function get<T>(path: string, token: string): Promise<T> {
  const r = await fetch(`https://api.mercury.com/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Mercury answered ${r.status}`);
  return (await r.json()) as T;
}

export async function readBank(): Promise<BankRead> {
  if (kept && Date.now() - kept.at < KEEP_MS) return kept.read;
  const token = process.env.MERCURY_API_TOKEN;
  if (!token) throw new Error("not configured");

  const start = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const { accounts } = await get<{ accounts?: { id: string; name: string; kind: string; currentBalance: number }[] }>(
    "/accounts",
    token,
  );
  const txs: MercuryTx[] = [];
  for (const a of accounts ?? []) {
    for (let offset = 0; offset < 10_000; offset += 500) {
      const page = await get<{ transactions?: MercuryTx[] }>(
        `/account/${a.id}/transactions?limit=500&offset=${offset}&start=${start}`,
        token,
      );
      const list = page.transactions ?? [];
      txs.push(...list);
      if (list.length < 500) break;
    }
  }

  const when = (t: MercuryTx) => t.postedAt ?? t.createdAt ?? "";
  const read: BankRead = {
    at: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    accounts: (accounts ?? []).map((a) => ({ name: a.name, kind: a.kind, balance: a.currentBalance })),
    months: summarizeBank(txs),
    recent: [...txs]
      .sort((x, y) => when(y).localeCompare(when(x)))
      .slice(0, 8)
      .map((t) => ({
        at: when(t),
        amount: t.amount,
        who: t.counterpartyName ?? t.bankDescription ?? "Unnamed",
        category: categorize(t),
        status: t.status ?? "",
      })),
  };
  kept = { read, at: Date.now() };
  return read;
}
