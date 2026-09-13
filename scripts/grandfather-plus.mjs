// Grandfather every reader who already uses the Plus layer, BEFORE the
// paywall is enforced.
//
// WHY. app/(app)/terms/page.tsx promises that paid features never paywall
// what is free today, and the Florilegium, notes and bookmarks have been open
// to everyone since they shipped. Flipping PLUS_ENFORCED_* takes them back
// from readers who have collections in them, which breaks a written contract.
// So every account with at least one synced florilegium, annotation or
// bookmark is granted Plus first, with plus_source = 'legacy', so the admin
// panel can tell these rows from paid ones and never counts them as revenue
// (lib/entitlements/adminStats.ts).
//
// WHAT IT CANNOT SEE. The reading palettes are chosen in localStorage and
// never synced, so a reader whose only Plus use was Candlelight or Monastery
// cannot be found from the server. Likewise a florilegium that was never
// synced lives on one device only. Both are covered by the copy on the gate
// itself: everything already gathered stays on the device, free, whether or
// not the reader subscribes (plus.florilegium.keep, plus.palettes.keep).
//
// WHAT IT NEVER OVERWRITES. An account that already holds active Plus or Pro,
// from any source, is left exactly as it is: a paid row must not be
// relabelled 'legacy', and a comp must not be extended. The RPC it calls,
// upsert_entitlement, writes is_supporter, plus_until and plus_source only,
// so pro_until is never touched, and is_supporter is passed back unchanged
// from the existing row so a pre-launch supporter keeps that flag.
//
// DRY RUN BY DEFAULT. Without --apply this reads, counts, writes a CSV of
// what it would do, and exits. With --apply it performs the writes, one RPC
// per account, and reports any that failed. The CSV is written in both modes
// so the run is reviewable before and auditable after. Idempotent: an account
// already at plus_source = 'legacy' is skipped.
//
// Service role only, never in CI. Reads .env.local like scripts/seed-shop.mjs.
//
// Usage:
//   node scripts/grandfather-plus.mjs              dry run
//   node scripts/grandfather-plus.mjs --apply      write the rows
//   node scripts/grandfather-plus.mjs --limit 5    trial: first five accounts only

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : Infinity;

/** Far enough that no reader alive will see it lapse, close enough to parse. */
const LEGACY_UNTIL = "2099-12-31T00:00:00Z";
const LEGACY_SOURCE = "legacy";
const PAGE = 1000;

// Minimal .env.local loader (no dotenv dependency in this repo).
try {
  const env = await fs.readFile(path.join(ROOT, ".env.local"), "utf8");
  // \r?\n: on Windows .env.local is CRLF and `.` never matches \r, so a \n
  // split left every key unset (found 2026-09-04 through patch-notes.mjs).
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  /* rely on the process env */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Every distinct user_id in a table, paged, so a busy table is not capped at 1000. */
async function userIdsIn(table) {
  const ids = new Set();
  for (let page = 0; page < 100; page++) {
    const { data, error } = await admin
      .from(table)
      .select("user_id")
      .order("user_id", { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    for (const r of data ?? []) if (r.user_id) ids.add(r.user_id);
    if (!data || data.length < PAGE) break;
  }
  return ids;
}

const SOURCES = ["florilegia", "annotations", "bookmarks"];
const reasons = new Map(); // user_id -> Set(table)
for (const table of SOURCES) {
  const ids = await userIdsIn(table);
  for (const id of ids) {
    if (!reasons.has(id)) reasons.set(id, new Set());
    reasons.get(id).add(table);
  }
  console.log(`${table.padEnd(12)} ${ids.size} accounts`);
}

const candidates = [...reasons.keys()].sort();
console.log(`distinct     ${candidates.length} accounts use the Plus layer`);

/** Existing entitlement rows for the candidates, in chunks the URL can carry. */
const existing = new Map();
for (let i = 0; i < candidates.length; i += 200) {
  const chunk = candidates.slice(i, i + 200);
  const { data, error } = await admin
    .from("entitlements")
    .select("user_id, is_supporter, plus_until, plus_source, pro_until")
    .in("user_id", chunk);
  if (error) throw new Error(`entitlements: ${error.message}`);
  for (const r of data ?? []) existing.set(r.user_id, r);
}

const now = Date.now();
const active = (ts) => !!ts && new Date(ts).getTime() > now;

const plan = [];
for (const id of candidates) {
  const row = existing.get(id) ?? null;
  const why = [...reasons.get(id)].join("+");
  let action;
  if (row && (active(row.plus_until) || active(row.pro_until))) {
    action = row.plus_source === LEGACY_SOURCE ? "skip:already-legacy" : `skip:active-${row.plus_source ?? "unknown"}`;
  } else {
    action = "grant";
  }
  plan.push({ id, why, existingSource: row?.plus_source ?? "", supporter: row?.is_supporter === true, action });
}

const grants = plan.filter((p) => p.action === "grant").slice(0, LIMIT);
const skipped = plan.filter((p) => p.action !== "grant");
console.log(`to grant     ${grants.length}${Number.isFinite(LIMIT) ? ` (limited to ${LIMIT})` : ""}`);
console.log(`skipped      ${skipped.length} (already Plus or Pro)`);

// The CSV, before any write. user ids only, never emails.
const stampDir = path.join(ROOT, ".grandfather");
await fs.mkdir(stampDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const csvPath = path.join(stampDir, `${stamp}${APPLY ? "-apply" : "-dry"}.csv`);
const csv = ["user_id,reason,existing_source,supporter,action"]
  .concat(plan.map((p) => `${p.id},${p.why},${p.existingSource},${p.supporter},${p.action}`))
  .join("\n");
await fs.writeFile(csvPath, csv + "\n", "utf8");
console.log(`csv          ${path.relative(ROOT, csvPath)}`);

if (!APPLY) {
  console.log("\nDry run. Nothing was written. Re-run with --apply to grant.");
  process.exit(0);
}

let ok = 0;
let failed = 0;
for (const g of grants) {
  const { error } = await admin.rpc("upsert_entitlement", {
    p_user_id: g.id,
    p_is_supporter: g.supporter,
    p_plus_until: LEGACY_UNTIL,
    p_plus_source: LEGACY_SOURCE,
  });
  if (error) {
    failed += 1;
    console.error(`FAILED ${g.id}: ${error.message}`);
  } else {
    ok += 1;
  }
}
console.log(`\ngranted      ${ok}`);
if (failed) {
  console.error(`failed       ${failed}`);
  process.exit(2);
}
