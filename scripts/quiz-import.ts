// Validate the owner's question bank and make it the app's.
//
// WHY A SCRIPT. The bank is content, and content in this repo is reviewed,
// committed and versioned: data/topics, data/heresies, the saints. Questions
// are the same kind of thing. This is the only writer of
// data/catechism/questions.json, and it refuses the file before one bad row
// can reach a page: the shape of every question, the uniqueness of every id,
// and that every source_ref lands on a page that exists.
//
// Usage:
//   node --experimental-strip-types --import ./scripts/lib/register-alias.mjs \
//     scripts/quiz-import.ts --file bank.json [--apply] [--mirror]
//
//   --file    the owner's JSON: an array of questions (docs/CATECHISM.md).
//   --apply   write data/catechism/questions.json. DRY RUN without it.
//   --mirror  also upsert the rows into quiz_questions with the service role
//             from .env.local, so the admin tab can name each question beside
//             its counters. The file stays canonical; the table is a copy.
//
// Runs under plain Node with type stripping and the "@/" alias hook, the same
// way scripts/emit-widget-data.mjs does, so the checks here are the app's own
// schema and registries and cannot drift from them.

import fs from "node:fs";
import path from "node:path";

import { parseQuestion } from "@/lib/catechism/schema";
import { resolveSourceRef, parseSourceRef, type Registries } from "@/lib/catechism/sourceRef";
import { ANCHOR_MIN_BANK, type Question } from "@/lib/catechism/types";
import { getBook } from "@/lib/bible/books";
import { getSaint } from "@/lib/saints/saints";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data", "catechism", "questions.json");
const TOPICS_DIR = path.join(ROOT, "data", "topics");
const SAINTS_DIR = path.join(ROOT, "data", "saints");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const MIRROR = args.includes("--mirror");
const fileIdx = args.indexOf("--file");
const FILE = fileIdx >= 0 ? args[fileIdx + 1] : undefined;

if (!FILE) {
  console.error(
    "Usage: node --experimental-strip-types --import ./scripts/lib/register-alias.mjs scripts/quiz-import.ts --file bank.json [--apply] [--mirror]",
  );
  process.exit(1);
}

// Thrown by fail() and caught at the bottom. process.exit() from inside an
// awaited supabase call trips a libuv assertion on Windows; see
// scripts/patch-notes.mjs.
class Quit extends Error {}
function fail(msg: string): never {
  console.error(msg);
  process.exitCode = 1;
  throw new Quit(msg);
}

// ── Registries ───────────────────────────────────────────────────────────

function topicRegistries(): Registries {
  const titles = new Map<string, string>();
  if (fs.existsSync(TOPICS_DIR)) {
    for (const f of fs.readdirSync(TOPICS_DIR)) {
      if (!f.endsWith(".json") || f.startsWith("_")) continue;
      try {
        const t = JSON.parse(fs.readFileSync(path.join(TOPICS_DIR, f), "utf8")) as {
          slug?: string;
          title?: string;
        };
        if (t.slug && t.title) titles.set(t.slug, t.title);
      } catch {
        /* a malformed topic file is that page's problem, not this script's */
      }
    }
  }
  return { topicTitle: (slug) => titles.get(slug) ?? null };
}

/** Whether data/saints/{saint}/{work}.json has a section numbered n. */
function workHasSection(saint: string, work: string, n: number): boolean {
  const file = path.join(SAINTS_DIR, saint, `${work}.json`);
  if (!fs.existsSync(file)) return false;
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf8")) as { sections?: { n?: number }[] };
    return Array.isArray(j.sections) && j.sections.some((s) => s.n === n);
  } catch {
    return false;
  }
}

// ── Validation ───────────────────────────────────────────────────────────

type Problem = { index: number; id?: string; message: string };

function validate(rows: unknown[]): { questions: Question[]; problems: Problem[] } {
  const registries = topicRegistries();
  const questions: Question[] = [];
  const problems: Problem[] = [];
  const ids = new Set<string>();

  rows.forEach((row, index) => {
    const parsed = parseQuestion(row);
    if (!parsed.ok) {
      for (const e of parsed.errors) problems.push({ index, message: e });
      return;
    }
    const q = parsed.question;
    if (ids.has(q.id)) {
      problems.push({ index, id: q.id, message: "duplicate id" });
      return;
    }
    ids.add(q.id);

    const source = resolveSourceRef(q.source_ref, registries);
    if (!source) {
      problems.push({ index, id: q.id, message: `source_ref does not resolve: ${q.source_ref}` });
    } else {
      const p = parseSourceRef(q.source_ref);
      if (p?.kind === "work" && !workHasSection(p.saint!, p.work!, p.section!)) {
        problems.push({
          index,
          id: q.id,
          message: `source_ref names section ${p.section} of ${p.saint}/${p.work}, which the work does not have`,
        });
      }
    }

    const a = q.calendar_anchor;
    if (a?.saint && !getSaint(a.saint)) {
      problems.push({ index, id: q.id, message: `calendar_anchor.saint is not in the registry: ${a.saint}` });
    }
    if (a?.reading) {
      const book = getBook(a.reading.book);
      if (!book) {
        problems.push({ index, id: q.id, message: `calendar_anchor.reading.book is not a Bible book: ${a.reading.book}` });
      } else if (a.reading.chapter > book.chapters) {
        problems.push({
          index,
          id: q.id,
          message: `calendar_anchor.reading.chapter ${a.reading.chapter} is past the end of ${book.name}`,
        });
      }
    }

    questions.push(q);
  });

  return { questions, problems };
}

function report(questions: Question[]) {
  const byType = new Map<string, number>();
  const byTag = new Map<string, number>();
  let anchored = 0;
  for (const q of questions) {
    byType.set(q.type, (byType.get(q.type) ?? 0) + 1);
    for (const t of q.tags) byTag.set(t, (byTag.get(t) ?? 0) + 1);
    if (q.calendar_anchor) anchored++;
  }
  console.log(`${questions.length} questions`);
  for (const [t, n] of byType) console.log(`  ${t}: ${n}`);
  console.log(`  anchored to the calendar: ${anchored}`);
  console.log(`  tags: ${[...byTag].map(([t, n]) => `${t} (${n})`).join(", ") || "none"}`);
  if (questions.length < ANCHOR_MIN_BANK) {
    console.log(
      `  NOTE: under ${ANCHOR_MIN_BANK} questions the anchor slot is skipped so the seven-day no-repeat rule can hold.`,
    );
  }
}

// ── Mirror ───────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
    // \r?\n, not \n: the file is CRLF on Windows and a \n split leaves every
    // key unset. See scripts/patch-notes.mjs.
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* rely on the process env */
  }
}

async function mirror(questions: Question[]) {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for --mirror.");
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const rows = questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options ?? null,
    answer: q.answer,
    explanation: q.explanation,
    source_ref: q.source_ref,
    tags: q.tags,
    calendar_anchor: q.calendar_anchor ?? null,
    reviewed_by: q.reviewed_by,
    published_at: q.published_at ?? null,
    retired_at: q.retired_at ?? null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await admin.from("quiz_questions").upsert(rows, { onConflict: "id" });
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      fail("quiz_questions is not there: supabase/migrations/20260905_catechism.sql has not been applied.");
    }
    fail(`quiz_questions upsert failed: ${error.message}`);
  }

  const { data: live, error: readErr } = await admin.from("quiz_questions").select("id");
  if (!readErr && live) {
    const inFile = new Set(questions.map((q) => q.id));
    const orphans = (live as { id: string }[]).filter((r) => !inFile.has(r.id));
    if (orphans.length) {
      console.log(
        `  ${orphans.length} row(s) in quiz_questions are not in the file and were left alone: ${orphans.map((o) => o.id).join(", ")}`,
      );
    }
  }
  console.log(`  mirrored ${rows.length} rows into quiz_questions`);
}

// ── Main ─────────────────────────────────────────────────────────────────

try {
  const file = path.resolve(ROOT, FILE);
  if (!fs.existsSync(file)) fail(`No such file: ${file}`);
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    fail(`${FILE} is not valid JSON: ${(e as Error).message}`);
  }
  if (!Array.isArray(raw)) fail(`${FILE} must be a JSON array of questions.`);

  const { questions, problems } = validate(raw as unknown[]);
  if (problems.length) {
    console.error(`${problems.length} problem(s):`);
    for (const p of problems) {
      console.error(`  row ${p.index}${p.id ? ` (${p.id})` : ""}: ${p.message}`);
    }
    fail("Nothing written.");
  }

  report(questions);

  if (!APPLY) {
    console.log(`\nDry run. Add --apply to write ${path.relative(ROOT, OUT)}.`);
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(questions, null, 2) + "\n");
    console.log(`\nWrote ${path.relative(ROOT, OUT)} (${questions.length} questions).`);
    if (MIRROR) await mirror(questions);
  }
} catch (e) {
  if (!(e instanceof Quit)) {
    console.error((e as Error).stack ?? String(e));
    process.exitCode = 1;
  }
}
