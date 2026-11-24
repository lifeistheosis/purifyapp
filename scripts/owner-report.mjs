#!/usr/bin/env node
// The owner's report: Purify's readers, Plus and money in one read.
//
//   node scripts/owner-report.mjs            the report, as text
//   node scripts/owner-report.mjs --json     the same, as JSON
//   node scripts/owner-report.mjs --days 90  the bank's window (default 30)
//
// His word, 2026-11-24: "can we setup a system so you can look at that
// whenever", then "just finalize the tracking system". Run it when he asks
// how Purify is doing. Three sources, each read only, each key held by the
// cloud environment's proxy (no key is in this file, the repo or a variable):
//
//   purifyapp.net/api/owner/digest     accounts, visits, Plus as the admin counts it
//   api.revenuecat.com                 MRR, 28-day revenue, trials, active users
//   api.mercury.com                    every bank transaction, grouped by kind
//
// A source that fails is named in the report and the rest still print; a
// figure that could not be read is shown as missing, never as 0.
// Reasons and keys: docs/owner-digest.md.

const RC_PROJECT = "proj2ed00c93";

import { summarizeBank } from "../lib/owner/bank.mjs";


async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.json();
}

async function readBank(days) {
  const start = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { accounts } = await getJson("https://api.mercury.com/api/v1/accounts");
  const out = { accounts: [], transactions: [] };
  for (const a of accounts ?? []) {
    out.accounts.push({ name: a.name, kind: a.kind, balance: a.currentBalance });
    for (let offset = 0; ; offset += 500) {
      const page = await getJson(
        `https://api.mercury.com/api/v1/account/${a.id}/transactions?limit=500&offset=${offset}&start=${start}`,
      );
      const list = page.transactions ?? [];
      out.transactions.push(...list);
      if (list.length < 500) break;
    }
  }
  return out;
}

async function readRevenueCat() {
  const d = await getJson(`https://api.revenuecat.com/v2/projects/${RC_PROJECT}/metrics/overview`);
  return Object.fromEntries((d.metrics ?? []).map((m) => [m.name, { value: m.value, unit: m.unit, period: m.period }]));
}

async function main() {
  const args = process.argv.slice(2);
  const days = Number(args[args.indexOf("--days") + 1]) || 30;
  const settle = (p) => p.then((v) => ({ ok: v }), (e) => ({ err: e.message }));
  const [digest, rc, bank] = await Promise.all([
    settle(getJson("https://purifyapp.net/api/owner/digest")),
    settle(readRevenueCat()),
    settle(readBank(days)),
  ]);
  const report = {
    at: new Date().toISOString(),
    digest: digest.ok ?? { error: digest.err },
    revenuecat: rc.ok ?? { error: rc.err },
    bank: bank.ok
      ? { windowDays: days, accounts: bank.ok.accounts, lines: bank.ok.transactions.length, months: summarizeBank(bank.ok.transactions) }
      : { error: bank.err },
  };
  if (args.includes("--json")) return console.log(JSON.stringify(report, null, 2));

  const miss = (v) => (v === null || v === undefined ? "missing" : v);
  const d = report.digest;
  console.log(`Purify report, ${report.at.slice(0, 16).replace("T", " ")} UTC\n`);
  if (d.error) console.log(`Readers and Plus: could not read (${d.error})`);
  else {
    console.log(`Accounts ${d.accounts.total}; new ${d.accounts.new7} this week (${miss(d.rates.newAccountsChangePct)}% on last week), ${d.accounts.new30} in 30 days`);
    console.log(`Visits ${d.readers.sessions7} this week (${miss(d.rates.sessionsChangePct)}%), ${d.rates.pageviewsPerSession} pages a visit`);
    console.log(`Plus paying ${d.plus.paid} (${d.rates.plusConversionPct}% of accounts), trials ${d.plus.trial}, set to end ${d.plus.cancelling} (${d.rates.cancellingPct}%), billing issues ${d.plus.billingIssue}`);
    console.log(`Shop ${d.shop.paidOrders30} paid orders, $${(d.shop.paidRevenueCents30 / 100).toFixed(2)} in 30 days`);
  }
  const r = report.revenuecat;
  console.log("");
  if (r.error) console.log(`RevenueCat: could not read (${r.error})`);
  else for (const [k, v] of Object.entries(r)) console.log(`${k}: ${v.unit === "$" ? "$" : ""}${v.value} (${v.period})`);
  const b = report.bank;
  console.log("");
  if (b.error) console.log(`Bank: could not read (${b.error})`);
  else {
    console.log(`Bank, last ${b.windowDays} days: ${b.lines} lines; ${b.accounts.map((a) => `${a.name} $${a.balance}`).join(", ")}`);
    for (const [month, m] of Object.entries(b.months).sort()) {
      console.log(`  ${month}: in $${m.in}, out $${m.out}, net $${m.net}`);
      for (const [cat, v] of Object.entries(m.byCategory).sort((x, y) => x[1] - y[1])) console.log(`    ${cat}: $${v}`);
    }
  }
}

// The keys reach the three hosts only through the cloud environment's proxy,
// and Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY is set: run
// again with it, once, rather than ask every caller to remember it.
const needsProxy = process.env.HTTPS_PROXY && process.env.NODE_USE_ENV_PROXY !== "1";

if (import.meta.url === `file://${process.argv[1]}` && needsProxy) {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(process.execPath, ["--no-warnings", process.argv[1], ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, NODE_USE_ENV_PROXY: "1" },
  });
  process.exit(r.status ?? 1);
} else if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
