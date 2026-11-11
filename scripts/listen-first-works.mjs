// The Fathers' works to record first (1.9, the owner's word of 2026-11-11:
// "rec voices": his PC records the Fathers' most-read works after the
// release, appearing per text with no store build).
//
// "Most read" is the count the website already keeps: page views by address
// and day (public.analytics_daily_counts, level 'page'), which names no
// reader. The owner runs the one read-only query in OWNER-STEPS V9 and saves
// its answer; this puts each work's size beside its count:
//
//   node scripts/listen-first-works.mjs                 every work, longest first, no counts
//   node scripts/listen-first-works.mjs views.json      most opened first
//   node scripts/listen-first-works.mjs views.json 25   the first 25
//
// views.json is the query's answer as the SQL editor exports it:
// [{ "key": "/saints/<saint>/<work>", "views": 123 }, ...]
//
// Hours: the words of data/reading/stats.json at the pace the Bible was read
// (184.4 words a minute, measured), and his PC at 0.75 of real time (his own
// number), as docs/1.9-build/notes/voices-fable.md section 1 has them. A work
// whose every section is already recorded (data/listen/index.json) is left out.

import fs from "node:fs";
import path from "node:path";

const WORDS_A_MINUTE = 184.4;
const PC_SPEED = 0.75;

export function firstWorks(root, views = null) {
  const stats = JSON.parse(fs.readFileSync(path.join(root, "data/reading/stats.json"), "utf8"));
  const recorded = new Set(JSON.parse(fs.readFileSync(path.join(root, "data/listen/index.json"), "utf8")));
  const opened = new Map();
  for (const row of views ?? []) {
    const m = /^\/saints\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/.exec(String(row.key ?? ""));
    if (m && m[2] !== "web") opened.set(`${m[1]}/${m[2]}`, (opened.get(`${m[1]}/${m[2]}`) ?? 0) + Number(row.views ?? 0));
  }
  const works = [];
  for (const [id, s] of Object.entries(stats)) {
    const [saint, work] = id.split("/");
    const sections = s.sections ?? [];
    const left = sections.filter(([n]) => !recorded.has(`work/${saint}/${work}/${n}`));
    if (sections.length && left.length === 0) continue;
    const words = left.length ? left.reduce((sum, [, w]) => sum + w, 0) : s.words;
    const listenHours = words / WORDS_A_MINUTE / 60;
    works.push({ id, words, listenHours, pcHours: listenHours / PC_SPEED, views: opened.get(id) ?? 0 });
  }
  works.sort(views ? (a, b) => b.views - a.views || a.pcHours - b.pcHours : (a, b) => b.pcHours - a.pcHours);
  return works;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  const top = Number(process.argv[3] ?? 0);
  const views = file ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
  const works = firstWorks(process.cwd(), views);
  const shown = top ? works.slice(0, top) : works;
  let running = 0;
  console.log(`${views ? "views".padStart(7) + "  " : ""}${"to hear".padStart(8)}  ${"his PC".padStart(8)}  ${"PC so far".padStart(9)}  work`);
  for (const w of shown) {
    running += w.pcHours;
    console.log(`${views ? String(w.views).padStart(7) + "  " : ""}${w.listenHours.toFixed(1).padStart(6)} h  ${w.pcHours.toFixed(1).padStart(6)} h  ${running.toFixed(0).padStart(7)} h  ${w.id}`);
  }
  const all = works.reduce((s, w) => s + w.pcHours, 0);
  console.log(`\n${works.length} works not yet recorded: ${(all * PC_SPEED).toFixed(0)} hours to hear, ${all.toFixed(0)} hours of his PC.`);
}
