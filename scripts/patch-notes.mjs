// The agent's side of the patch-notes review queue.
//
// WHY. /admin?tab=patch-notes shows the owner every proposed change to a
// release note as a tracked change: before, after, Accept / Deny / Suggest.
// This script is how a proposal gets INTO that queue without the agent
// writing straight into source, and how the agent reads the owner's answer.
// CLAUDE.md rule 8: no paid APIs for internal tooling; the agent is the
// pipeline. So there is no model call here. The agent writes the draft, runs
// this, and the owner sees it in the panel.
//
// Service role only, never in CI. Reads .env.local like scripts/seed-shop.mjs.
//
// Usage:
//   node scripts/patch-notes.mjs propose --file draft.json [--summary "..."] [--parent <id>]
//       Files one revision. draft.json is one note:
//         { "version": "1.4", "kind": "...", "date": "2026-09-10",
//           "title": "...", "blurb": "...", "items": ["...", "..."] }
//       `date` may also be "September 10, 2026". The live row with the same
//       version, if any, is snapshotted as `before`. DRY RUN unless --apply.
//       --summary defaults to "Claude changed <fields> in <version>".
//       --parent answers a suggestion the owner sent back.
//
//   node scripts/patch-notes.mjs inbox
//       Prints every pending and suggested revision, with the owner's note.
//       A `suggested` row is the owner saying "not like that, like this":
//       read the note, read their `after`, and answer with propose --parent.
//
//   node scripts/patch-notes.mjs pull [--apply]
//       Writes the PUBLISHED rows back into data/changelog/entries.json,
//       newest first, in the page's display date format. Run this before a
//       native build and as step 1 of the release ritual, because the static
//       export bundles the file and never reads the table. Dry run prints the
//       diff in versions; --apply writes.

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const cmd = args[0];
const APPLY = args.includes("--apply");
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

if (!["propose", "inbox", "pull"].includes(cmd)) {
  console.error("Usage: node scripts/patch-notes.mjs <propose|inbox|pull> [options]");
  process.exit(1);
}

// Minimal .env.local loader (no dotenv dependency in this repo).
try {
  const env = await fs.readFile(path.join(ROOT, ".env.local"), "utf8");
  // \r?\n, not \n. On Windows the file is CRLF, `.` in a JS regex never
  // matches \r, so a \n split left every line unmatched and every key unset.
  // scripts/grandfather-plus.mjs and scripts/seed-shop.mjs carry the \n split
  // and fail the same way on this machine.
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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const isoToDisplay = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : iso;
};
const displayToIso = (d) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(String(d).trim());
  if (!m) return null;
  const idx = MONTHS.findIndex((n) => n.toLowerCase() === m[1].toLowerCase());
  if (idx < 0) return null;
  return `${m[3]}-${String(idx + 1).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
};

const NOTE_COLUMNS = "id, version, kind, date, title, blurb, items, status, updated_at";
const FIELDS = ["version", "kind", "date", "title", "blurb"];

function shape(row) {
  return {
    version: row.version,
    kind: row.kind ?? "",
    date: row.date,
    title: row.title ?? "",
    blurb: row.blurb ?? "",
    items: Array.isArray(row.items) ? row.items.map(String) : [],
  };
}

function describe(before, after) {
  if (!before) return `Claude proposed a new note, ${after.version}`;
  const parts = [];
  for (const f of FIELDS) if ((before[f] ?? "") !== (after[f] ?? "")) parts.push(`the ${f}`);
  const max = Math.max(before.items.length, after.items.length);
  const items = [];
  for (let i = 0; i < max; i++) if ((before.items[i] ?? "") !== (after.items[i] ?? "")) items.push(i + 1);
  if (items.length === 1) parts.push(`item ${items[0]}`);
  else if (items.length > 1) parts.push(`items ${items.join(", ")}`);
  if (parts.length === 0) return null;
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  return `Claude changed ${list} in ${after.version}`;
}

// Thrown by fail() and caught at the bottom. process.exit() from inside an
// awaited supabase call trips a libuv assertion on Windows (UV_HANDLE_CLOSING)
// and turns a clean "exit 1" into a crash with exit 127.
class Quit extends Error {}
function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
  throw new Quit(msg);
}
function done() {
  throw new Quit("done");
}

// supabase-js answers a missing relation with PostgREST's PGRST205, not
// Postgres's 42P01; see lib/admin/tableAbsent.ts.
function absent(error) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

try {

if (cmd === "propose") {
  const file = opt("--file");
  if (!file) fail("propose needs --file <draft.json>");
  const raw = JSON.parse(await fs.readFile(path.resolve(ROOT, file), "utf8"));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("draft must be one note object");
  const iso = displayToIso(raw.date ?? "");
  if (!iso) fail(`date "${raw.date}" must be YYYY-MM-DD or "Month D, YYYY"`);
  const after = shape({ ...raw, date: iso });
  if (!after.version) fail("draft needs a version");
  const text = JSON.stringify(after);
  if (/—/.test(text)) fail("the draft carries an em dash. Release notes may not. Fix it and run again.");

  const { data: live, error } = await admin
    .from("patch_notes")
    .select(NOTE_COLUMNS)
    .eq("version", after.version)
    .maybeSingle();
  if (absent(error)) fail("patch_notes is not applied. Merge supabase/migrations/20260904_patch_notes.sql first.");
  if (error) fail(`read failed: ${error.message}`);

  const before = live ? shape(live) : null;
  const summary = opt("--summary") ?? describe(before, after);
  if (!summary) fail(`nothing differs from the live ${after.version}; nothing to propose`);

  console.log(`${APPLY ? "Filing" : "Would file"}: ${summary}`);
  console.log(before ? `  against live row ${live.id} (${live.status})` : "  as a new note");
  if (!APPLY) {
    console.log("Dry run. Add --apply to write it.");
    done();
  }
  const { data, error: insErr } = await admin
    .from("patch_note_revisions")
    .insert({
      note_id: live?.id ?? null,
      version: after.version,
      author: "claude",
      summary,
      before,
      after,
      status: "pending",
      parent_id: opt("--parent") ?? null,
    })
    .select("id")
    .maybeSingle();
  if (insErr) fail(`insert failed: ${insErr.message}`);
  console.log(`Filed revision ${data.id}. It is waiting in /admin?tab=patch-notes.`);
}

if (cmd === "inbox") {
  const { data, error } = await admin
    .from("patch_note_revisions")
    .select("*")
    .in("status", ["pending", "suggested"])
    .order("created_at", { ascending: true });
  if (absent(error)) fail("patch_notes is not applied. Merge supabase/migrations/20260904_patch_notes.sql first.");
  if (error) fail(`read failed: ${error.message}`);
  if (!data || data.length === 0) {
    console.log("Inbox empty. Nothing pending, nothing sent back.");
    done();
  }
  for (const r of data) {
    console.log(`\n${r.status.toUpperCase()}  ${r.id}`);
    console.log(`  ${r.summary}`);
    console.log(`  by ${r.author}, ${r.created_at}${r.parent_id ? `, answers ${r.parent_id}` : ""}`);
    if (r.status === "suggested") {
      console.log(`  ${r.reviewed_by_email ?? "the owner"} sent it back on ${r.reviewed_at}:`);
      console.log(`  > ${(r.review_note ?? "").split("\n").join("\n  > ")}`);
      console.log("  Their version of the note is in `after` below. Answer with: propose --parent " + r.id);
    }
    console.log("  after:", JSON.stringify(r.after, null, 2).split("\n").join("\n  "));
  }
}

if (cmd === "pull") {
  const { data, error } = await admin
    .from("patch_notes")
    .select(NOTE_COLUMNS)
    .eq("status", "published")
    .order("date", { ascending: false })
    .order("version", { ascending: false });
  if (absent(error)) fail("patch_notes is not applied. Merge supabase/migrations/20260904_patch_notes.sql first.");
  if (error) fail(`read failed: ${error.message}`);
  if (!data || data.length === 0) fail("patch_notes has no published rows; refusing to empty entries.json");

  const target = path.join(ROOT, "data/changelog/entries.json");
  const current = JSON.parse(await fs.readFile(target, "utf8"));
  const next = data.map((r) => ({
    version: r.version,
    kind: r.kind ?? "",
    date: isoToDisplay(r.date),
    blurb: r.blurb ?? "",
    items: Array.isArray(r.items) ? r.items.map(String) : [],
  }));
  const bad = next.find((e) => /—/.test(JSON.stringify(e)));
  if (bad) fail(`live row ${bad.version} carries an em dash; fix it in /admin before pulling`);

  const was = new Set(current.map((e) => e.version));
  const now = new Set(next.map((e) => e.version));
  const added = [...now].filter((v) => !was.has(v));
  const removed = [...was].filter((v) => !now.has(v));
  const changed = next.filter((e) => {
    const c = current.find((x) => x.version === e.version);
    return c && JSON.stringify(c) !== JSON.stringify(e);
  }).map((e) => e.version);

  console.log(`${next.length} published rows, ${current.length} in the file.`);
  console.log(`  added: ${added.join(", ") || "none"}`);
  console.log(`  removed: ${removed.join(", ") || "none"}`);
  console.log(`  changed: ${changed.join(", ") || "none"}`);
  if (added.length + removed.length + changed.length === 0) {
    console.log("entries.json already matches.");
    done();
  }
  if (!APPLY) {
    console.log("Dry run. Add --apply to write entries.json.");
    done();
  }
  await fs.writeFile(target, JSON.stringify(next, null, 2) + "\n");
  console.log(`Wrote ${target}. Run npm run test:unit; notesAgree checks it against patches.json.`);
}
} catch (e) {
  if (!(e instanceof Quit)) throw e;
}
