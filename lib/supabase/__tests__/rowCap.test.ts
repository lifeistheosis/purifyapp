// No read asks the API for more rows than it gives, and no read walks a list
// in pages without an order.
//
// The Supabase API (PostgREST) returns at most 1,000 rows per request. What
// .limit() asks for makes no difference: .limit(20_000) gets 1,000 rows and
// no error. A count, a tally or a mailing built on that one request stops at
// a thousand and goes on reading as everything.
//
// That is what happened until 2026-10-03 (docs/audit/findings.yaml F-31). The
// Engagement tab said "1,000 views" for every range against 615,062 real
// ones. Insights drew every chart without its newest 245 points. The handle
// filter checked 1,000 of 2,295 handles and reported the rest clean. And the
// reads that send things were waiting behind them: the name day note, the
// library email's skip list, the welcome, each asking for 5,000 or 20,000
// rows and each due to stop at a thousand readers without a sign.
//
// So a number above 1,000 inside .limit() is always a mistake about what the
// server does, and the first test here refuses it.
//
// The second test is the other half of the repair. Reading in pages is only
// right when every page is a page of the same list, and rows with no stated
// order may come back differently on the next request, so a page boundary
// repeats a row or skips one. lib/email/preferences.ts read every marketing
// list that way. A .range() on a query with no .order() is refused.
//
// What neither test can see: a read that names no limit at all is capped the
// same way, and there is nothing in the text to catch it by. Those are found
// by reading the code.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const DIRS = ["app", "lib", "components", "scripts"];

/** What one request returns at most. */
const API_MAX_ROWS = 1000;

const HOW =
  "The API returns at most 1,000 rows per request however many .limit() asks " +
  "for, and returns no error when it stops, so this read is cut at 1,000 and " +
  "whatever is built on it goes on as if it were whole. Pick one: read every " +
  "row with pageAll() from lib/supabase/pageAll.ts and a total order " +
  '(.order() on a unique column, or on a column and then a unique one); count ' +
  'in the database with .select("id", { count: "exact", head: true }) when ' +
  "only a number is wanted; or, when 1,000 really is enough, ask for 1000 and " +
  "say why in a comment. A read kept above 1,000 on purpose goes in ALLOWED " +
  "in this file, with its reason.";

const HOW_ORDER =
  "A .range() reads one page of a list, and without .order() the list has no " +
  "stated order, so the next page may repeat a row or skip one. Order by a " +
  "unique column, or by a column and then a unique one, as " +
  "lib/supabase/pageAll.ts says.";

/**
 * Reads kept on purpose. `file` is from the repo root with forward slashes,
 * `call` is the call as it stands in the source. An entry that matches
 * nothing fails the last test, so this cannot outlive what it excuses.
 */
const ALLOWED: { file: string; call: string; why: string }[] = [];

type Site = { file: string; line: number; call: string };

/** The .limit() calls above the cap and the unordered .range() calls in one source text. */
function scan(file: string, text: string): { over: Site[]; unordered: Site[] } {
  const over: Site[] = [];
  const unordered: Site[] = [];
  if (!text.includes(".limit(") && !text.includes(".range(")) return { over, unordered };

  const kind = /\.tsx$/.test(file) ? ts.ScriptKind.TSX : /\.(mjs|js)$/.test(file) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);

  /** A call written as something.name(...), or null. Parsed, so a comment or a string is never one. */
  const method = (node: ts.Node): { name: string; call: ts.CallExpression; on: ts.Expression } | null =>
    ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      ? { name: node.expression.name.text, call: node, on: node.expression.expression }
      : null;

  const at = (m: { name: string; call: ts.CallExpression }): Site => ({
    file,
    line: source.getLineAndCharacterOfPosition(m.call.expression.getEnd()).line + 1,
    call: `.${m.name}(${m.call.arguments.map((a) => a.getText(source)).join(", ")})`,
  });

  // const NAME = 5000, so that .limit(NAME) is read as the number it is.
  const named = new Map<string, number>();
  const collect = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isNumericLiteral(node.initializer)) {
      named.set(node.name.text, Number(node.initializer.text));
    }
    ts.forEachChild(node, collect);
  };
  collect(source);

  /** Every method in the chain a call belongs to: the calls it is made on, and the calls made on it. */
  const chain = (call: ts.CallExpression): string[] => {
    let top: ts.CallExpression = call;
    for (;;) {
      const access = top.parent;
      const outer = access?.parent;
      if (!access || !outer || !ts.isPropertyAccessExpression(access) || access.expression !== top) break;
      if (!ts.isCallExpression(outer) || outer.expression !== access) break;
      top = outer;
    }
    const names: string[] = [];
    for (let m = method(top); m; m = method(m.on)) names.push(m.name);
    return names;
  };

  const visit = (node: ts.Node) => {
    const m = method(node);
    if (m?.name === "limit" && m.call.arguments.length === 1) {
      const arg = m.call.arguments[0];
      const n = ts.isNumericLiteral(arg) ? Number(arg.text) : ts.isIdentifier(arg) ? named.get(arg.text) : undefined;
      if (n !== undefined && n > API_MAX_ROWS) over.push(at(m));
    }
    if (m?.name === "range" && m.call.arguments.length === 2) {
      const names = chain(m.call);
      const isRead = names.includes("select") || names.includes("rpc");
      if (isRead && !names.includes("order")) unordered.push(at(m));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { over, unordered };
}

function sources(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__tests__" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(full, out);
    else if (/\.(ts|tsx|mts|mjs|js)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

const found = { over: [] as Site[], unordered: [] as Site[], files: 0 };
for (const dir of DIRS) {
  for (const full of sources(path.join(ROOT, dir))) {
    const file = path.relative(ROOT, full).split(path.sep).join("/");
    const { over, unordered } = scan(file, fs.readFileSync(full, "utf8"));
    found.over.push(...over);
    found.unordered.push(...unordered);
    found.files += 1;
  }
}

const allowed = (s: Site) => ALLOWED.some((a) => a.file === s.file && a.call === s.call);
const show = (s: Site) => `${s.file}:${s.line}  ${s.call}`;

describe("reads against the API's 1,000 row cap", () => {
  it("sees what it is looking for", () => {
    // The check below passes on an empty list, so first prove the scan finds
    // these in a file where they are, and leaves alone what it should.
    const sample = `
      // a comment may say .limit(50_000) without asking for anything
      const text = "and so may a string: .limit(9999)";
      const PAGE_ROWS = 5_000;
      const SMALL = 200;
      async function reads(admin) {
        await admin.from("a").select("id").limit(20000);
        await admin.from("b").select("id").limit(2_000);
        await admin.from("c").select("id").limit(PAGE_ROWS);
        await admin.from("d").select("id").limit(1000);
        await admin.from("e").select("id").limit(SMALL);
        await admin.from("f").select("id").range(0, 999);
        await admin.from("g").select("id").order("id").range(0, 999);
        await admin.from("h").select("id").eq("x", 1).range(0, 999).order("id");
        await admin.rpc("i", {}).range(0, 999);
        new Range().range(1, 2);
      }
    `;
    const { over, unordered } = scan("sample.ts", sample);
    expect(over.map((s) => s.call)).toEqual([".limit(20000)", ".limit(2_000)", ".limit(PAGE_ROWS)"]);
    expect(unordered.map((s) => s.line)).toEqual([12, 15]);
  });

  it("walked the source and not an empty folder", () => {
    expect(found.files).toBeGreaterThan(500);
  });

  it("never asks one request for more than 1,000 rows", () => {
    const bad = found.over.filter((s) => !allowed(s)).map(show);
    expect(bad, `${HOW}\n  ` + bad.join("\n  ")).toEqual([]);
  });

  it("never reads a list in pages without an order", () => {
    const bad = found.unordered.map(show);
    expect(bad, `${HOW_ORDER}\n  ` + bad.join("\n  ")).toEqual([]);
  });

  it("excuses only reads that are still there", () => {
    const stale = ALLOWED.filter((a) => !found.over.some((s) => s.file === a.file && s.call === a.call)).map(
      (a) => `${a.file}  ${a.call}`,
    );
    expect(stale, "These ALLOWED entries match no read any more. Take them out.\n  " + stale.join("\n  ")).toEqual([]);
    const unexplained = ALLOWED.filter((a) => a.why.trim().length < 20).map((a) => `${a.file}  ${a.call}`);
    expect(unexplained, "Each ALLOWED entry says why in a sentence.\n  " + unexplained.join("\n  ")).toEqual([]);
  });
});
