// No security definer function may be left callable by the public key, or by
// every signed-in reader, without a written reason.
//
// On Supabase every new function in `public` is granted EXECUTE to anon and
// authenticated BY NAME, on top of the grant Postgres itself gives PUBLIC. So
// `revoke all on function ... from public` closes nothing: the anon key,
// which ships in every browser, still calls it at /rest/v1/rpc/<name>. That
// is how analytics_daily_buckets answered anyone with the daily visitor, page
// view and sign-up counts until 2026-10-03 (docs/audit/findings.yaml F-32).
// 20261008000100_admin_rollups.sql closed it, and
// lib/admin/__tests__/rollupsMigration.test.ts pins that one file. This file
// holds the next one.
//
// It reads supabase/migrations in name order and keeps, for each function
// signature, who still holds EXECUTE, the way Postgres would: a new function
// starts open to all three, `create or replace` on the same signature keeps
// the grants it had, a drop or a different argument list starts again, and
// each revoke and grant moves the roles it names. Whatever anon or
// authenticated can still call at the end has to be in LEFT_OPEN, with who
// and why.
//
// The folder is not the database. This says what a database built from the
// folder would hold; production is asked with the public key, and the ledger
// has the method (docs/audit/continuation-ledger.md, "Were there others like
// F-32?").

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "supabase", "migrations");

type Caller = "anon" | "authenticated";
type Role = Caller | "public";
const CALLERS: Caller[] = ["anon", "authenticated"];
const ROLES: Role[] = ["public", ...CALLERS];

/**
 * Security definer functions that anon or authenticated can still call: the
 * signature, the roles that hold it, and why. The truth on 2026-10-04,
 * measured by replaying the folder on a local Postgres with Supabase's
 * default grants and asking has_function_privilege. Opening a function is a
 * decision, so an entry without a reason is only a hole with a name.
 */
const LEFT_OPEN: Record<string, { to: Caller[]; why: string }> = {
  "is_campaign_group_member(uuid)": {
    to: ["anon", "authenticated"],
    why:
      "On purpose. The row level security policies call it, the public feed's among them, " +
      "so signed-out readers need it too, and it answers only about auth.uid().",
  },
  "shop_submit_review(uuid, integer, text, text, text, boolean)": {
    to: ["authenticated"],
    why:
      "On purpose. A signed-in buyer posts a product review through it. Closed to anon by " +
      "20260714000100_shop_review_identity.sql; the two files that replace it since keep that.",
  },
  "shop_submit_store_review(uuid, integer, text, text, text, boolean)": {
    to: ["authenticated"],
    why:
      "On purpose. A signed-in buyer posts a store review through it. Closed to anon by " +
      "20260718000300_shop_reviews_v2.sql; the file that replaces it since keeps that.",
  },
  "community_mark_notifications_read()": {
    to: ["anon", "authenticated"],
    why:
      "Meant for authenticated only. anon still holds its default grant, by F-32's mistake: " +
      "20260801000000_community_notifications.sql and 20261002000000_community_social.sql " +
      "both revoke from public only. Harmless: it updates rows where user_id = auth.uid(), " +
      "which is null for the public key. Closing it takes a migration, and a migration " +
      "merged to main runs against production, so the owner signs off the SQL first. When " +
      "one does, take anon out of this entry.",
  },
};

type Statement = { text: string; quoted: string[] };

/**
 * A migration as the statements it runs, lower case on one line each, with
 * the comments gone and whatever sat in quotes or dollar quotes lifted out,
 * so a pattern cannot match a comment, a string or a function body. What was
 * lifted out is kept beside the statement.
 */
function statements(sql: string): Statement[] {
  const token = new RegExp(
    String.raw`--[^\n]*|/\*|\b[eE]'(?:[^'\\]|''|\\[\s\S])*'|'(?:[^']|'')*'|"(?:[^"]|"")*"` +
      String.raw`|(?<![\w$])\$([A-Za-z_]\w*)?\$[\s\S]*?\$\1\$|;`,
    "g",
  );
  const comment = /\/\*|\*\//g;
  const out: Statement[] = [];
  let text = "";
  let quoted: string[] = [];
  let at = 0;
  const close = () => {
    text = text.replace(/\s+/g, " ").trim().toLowerCase();
    if (text) out.push({ text, quoted });
    text = "";
    quoted = [];
  };
  let m: RegExpExecArray | null;
  while ((m = token.exec(sql))) {
    text += sql.slice(at, m.index);
    at = token.lastIndex;
    const t = m[0];
    if (t === ";") close();
    else if (t === "/*") {
      // Block comments nest in Postgres, so the first `*/` is not always the end.
      comment.lastIndex = at;
      let depth = 1;
      while (depth > 0) {
        const edge = comment.exec(sql);
        if (!edge) break;
        depth += edge[0] === "/*" ? 1 : -1;
      }
      at = depth > 0 ? sql.length : comment.lastIndex;
      token.lastIndex = at;
      text += " ";
    } else if (t.startsWith("--")) text += " ";
    else if (t.startsWith('"')) text += t;
    else {
      quoted.push(t);
      text += t.startsWith("$") ? " $$ " : " '' ";
    }
  }
  text += sql.slice(at);
  close();
  return out;
}

/** Split on the commas that are not inside brackets: `a(text, int), b()` is two. */
function commaList(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") depth--;
    else if (s[i] === "," && depth === 0) {
      out.push(s.slice(from, i));
      from = i + 1;
    }
  }
  out.push(s.slice(from));
  return out.map((part) => part.trim()).filter(Boolean);
}

/** Spellings of one type. Only real synonyms: folding two types into one would hide an overload. */
const ALIAS: Record<string, string> = {
  int: "integer",
  int4: "integer",
  int8: "bigint",
  int2: "smallint",
  bool: "boolean",
  "timestamp with time zone": "timestamptz",
  "timestamp without time zone": "timestamp",
  "time with time zone": "timetz",
  "time without time zone": "time",
  float8: "double precision",
  float4: "real",
  "character varying": "varchar",
  character: "char",
  decimal: "numeric",
};
const SEVERAL_WORDS = /^(?:double precision|(?:timestamp|time) with(?:out)? time zone|character varying|bit varying)\b/;

/**
 * An argument list as Postgres identifies the function by it: the input
 * types only, so `p_since timestamptz, p_days int default 30` and
 * `timestamp with time zone, integer` both come out `timestamptz, integer`.
 */
function argTypes(args: string): string {
  return commaList(args)
    .map((arg) => arg.replace(/\s*\([\d\s,]*\)/g, "").replace(/\s*(?:\bdefault\b|=).*$/, ""))
    .filter((arg) => !/^out\s/.test(arg))
    .map((arg) => {
      const bare = arg.replace(/^(?:in|inout|variadic)\s+/, "");
      const words = bare.split(" ");
      // A lone word is a type, and so is a type that is itself several words.
      const type = words.length === 1 || SEVERAL_WORDS.test(bare) ? bare : words.slice(1).join(" ");
      const array = /(?:\[\d*\])+$| array$/;
      const base = type.replace(array, "").trim().replace(/^(?:pg_catalog|public)\./, "");
      return (ALIAS[base] ?? base) + (array.test(type) ? "[]" : "");
    })
    .join(", ");
}

/** `[schema.]name[(arguments)]` at the start of `s`, and what follows it. */
function head(s: string): { inPublic: boolean; name: string; args: string | null; rest: string } | null {
  const src = s.replace(/"/g, "");
  const m = /^(?:(\w+)\.)?(\w+)\s*/.exec(src);
  if (!m) return null;
  let end = m[0].length;
  let args: string | null = null;
  if (src[end] === "(") {
    const open = end;
    let depth = 0;
    do {
      if (src[end] === "(") depth++;
      else if (src[end] === ")") depth--;
      end++;
    } while (depth > 0 && end < src.length);
    if (depth > 0) return null;
    args = argTypes(src.slice(open + 1, end - 1));
  }
  return { inPublic: (m[1] ?? "public") === "public", name: m[2], args, rest: src.slice(end) };
}

type Fn = { sig: string; name: string; file: string; definer: boolean; trigger: boolean; held: Set<Role> };
type Seen = { fn: string; file: string; open: Caller[] };

// A statement about functions in a shape the scan does not follow, at the
// top level of a file or inside a `do` block. Reported, never skipped.
const KIND = "(?:function|procedure|routine)";
const TOUCHES = new RegExp(
  String.raw`^(?:create (?:or replace )?|drop )${KIND}\b` +
    String.raw`|^alter ${KIND}\b.*\b(?:security (?:definer|invoker)|rename to|set schema)\b` +
    String.raw`|^(?:grant|revoke)\b.* on (?:all )?${KIND}s?\b` +
    String.raw`|^alter default privileges\b.* on (?:functions|routines)\b`,
);
const HIDDEN = new RegExp(
  String.raw`\b(?:grant|revoke)\b[^;]*\bon\s+(?:all\s+)?${KIND}s?\b` +
    String.raw`|\b(?:create|drop|alter)\s+(?:or\s+replace\s+)?${KIND}\b` +
    String.raw`|\balter\s+default\s+privileges\b`,
  "i",
);

/**
 * Replay the files in the order given. Returns every security definer
 * function in `public` that the API can call, with the file that last
 * defined it and which of anon and authenticated may call it, and every
 * statement about functions the scan could not follow. It knows three
 * grantees, PUBLIC, anon and authenticated, and no role granted to them.
 */
function scan(files: { name: string; sql: string }[]): { definers: Seen[]; unread: string[] } {
  const live = new Map<string, Fn>();
  const unread: string[] = [];

  /** The live functions a grant, revoke or drop means by `public.f(uuid)`, or by a bare `f`. */
  const meant = (ref: string, opening: boolean): Fn[] => {
    const h = head(ref);
    if (!h || !h.inPublic) return [];
    const exact = h.args === null ? undefined : live.get(`${h.name}(${h.args})`);
    if (exact) return [exact];
    const named = [...live.values()].filter((f) => f.name === h.name);
    // When the scan cannot place a statement it errs towards open: a grant
    // reaches every function of that name, a revoke or a drop reaches none
    // unless the name alone settles it.
    return opening || (h.args === null && named.length === 1) ? named : [];
  };

  for (const { name: file, sql } of files) {
    for (const { text, quoted } of statements(sql)) {
      const created = /^create (or replace )?function (.+)$/.exec(text);
      const dropped = /^drop function (?:if exists )?(.+)$/.exec(text);
      const moved =
        /^(grant|revoke) (?:grant option for )?(?:execute|all(?: privileges)?) on function (.+?) (?:to|from) (.+)$/.exec(text);
      const made = created ? head(created[2]) : null;

      if (created && made && made.args !== null) {
        if (!made.inPublic) continue;
        const sig = `${made.name}(${made.args})`;
        // Only `or replace` keeps what the function already had.
        const before = created[1] ? live.get(sig) : undefined;
        live.set(sig, {
          sig,
          name: made.name,
          file,
          definer: /\bsecurity definer\b/.test(made.rest),
          trigger: /\breturns trigger\b/.test(made.rest),
          held: before?.held ?? new Set(ROLES),
        });
      } else if (dropped) {
        for (const ref of commaList(dropped[1])) {
          for (const f of meant(ref, false)) live.delete(f.sig);
        }
      } else if (moved) {
        const opening = moved[1] === "grant";
        const named = commaList(moved[3]).map((role) => role.replace(/^group /, "").split(" ")[0]);
        for (const ref of commaList(moved[2])) {
          for (const f of meant(ref, opening)) {
            for (const role of ROLES.filter((r) => named.includes(r))) {
              if (opening) f.held.add(role);
              else f.held.delete(role);
            }
          }
        }
      } else if (TOUCHES.test(text) || (text.startsWith("do ") && quoted.some((q) => HIDDEN.test(q)))) {
        unread.push(`${file}: ${text.slice(0, 120)}`);
      }
    }
  }

  const definers = [...live.values()]
    .filter((f) => f.definer && !f.trigger)
    // Every role is a member of PUBLIC, so a grant left there reaches both.
    .map((f) => ({ fn: f.sig, file: f.file, open: CALLERS.filter((role) => f.held.has(role) || f.held.has("public")) }));
  return { definers, unread };
}

/** Who can call what beyond the roles LEFT_OPEN gives a reason for, one line a function. */
function unexplained(definers: Seen[]): string[] {
  return definers.flatMap((f) => {
    const allowed = LEFT_OPEN[f.fn]?.to ?? [];
    const extra = f.open.filter((role) => !allowed.includes(role));
    if (extra.length === 0) return [];
    const covered = allowed.length ? ` (LEFT_OPEN covers only ${allowed.join(" and ")})` : "";
    return [`public.${f.fn}, last defined in ${f.file}: ${extra.join(" and ")} can call it${covered}`];
  });
}

const FILES = fs
  .readdirSync(DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => ({ name, sql: fs.readFileSync(path.join(DIR, name), "utf8") }));
const FOLDER = scan(FILES);

describe("security definer functions in supabase/migrations", () => {
  it("follows every statement that makes, drops or regrants a function", () => {
    expect(
      FOLDER.unread,
      "The scan follows `create [or replace] function`, `drop function`, and `grant` or " +
        "`revoke execute|all on function ... to|from ...`, at the top level of a file. Write " +
        "the statement that way, or teach the scan the new shape before trusting its answer.",
    ).toEqual([]);
  });

  it("leaves none callable by anon or authenticated without a stated reason", () => {
    expect(
      unexplained(FOLDER.definers),
      "On Supabase anon and authenticated hold EXECUTE on every new function by name, so " +
        "`revoke ... from public` alone closes nothing, and the public key can call the " +
        "function at /rest/v1/rpc/<name> (F-32). In the file that defines it, write\n" +
        "  revoke execute on function public.<name>(<argument types>) from public, anon, authenticated;\n" +
        "and grant execute to service_role if the server calls it. If it is meant to be open, " +
        "say to whom and why in LEFT_OPEN.",
    ).toEqual([]);
  });

  it("the entries in LEFT_OPEN still describe the folder, so closing one means unpinning it", () => {
    for (const [fn, { to, why }] of Object.entries(LEFT_OPEN)) {
      expect(why.length, `${fn} needs its reason`).toBeGreaterThan(0);
      expect(
        FOLDER.definers.find((f) => f.fn === fn)?.open,
        `LEFT_OPEN says ${to.join(" and ")} can call ${fn}. Make the entry say what the folder does, or delete it.`,
      ).toEqual([...to].sort());
    }
  });
});

/** A security definer function the API can call, for the cases below. */
const definer = (sig: string) =>
  `create or replace function public.${sig} returns int language sql security definer set search_path = public as $$ select 1 $$;`;
const CLOSED = "from public, anon, authenticated";

/**
 * What the scan has to get right: the files, in order, and who may then call
 * each security definer function. Every case is SQL that runs, and every
 * answer was checked against has_function_privilege on a local Postgres with
 * Supabase's default grants, 2026-10-04.
 */
const CASES: [string, string[], Record<string, string>][] = [
  [
    "F-32 as it shipped: revoked from public only",
    [
      `${definer("f(p_since timestamptz, p_days int default 30)")}
       revoke all on function public.f(timestamptz, int) from public;
       grant execute on function public.f(timestamptz, int) to service_role;`,
    ],
    { "f(timestamptz, integer)": "anon authenticated" },
  ],
  ["the two resync functions: no revoke at all", [definer("f(p_id uuid)")], { "f(uuid)": "anon authenticated" }],
  ["one revoke naming the three roles", [`${definer("f()")} revoke all on function public.f() ${CLOSED};`], { "f()": "" }],
  [
    "three revokes, a role each, as merge_insight_points has them",
    [
      `${definer("f(p_points jsonb)")}
       revoke all on function public.f(jsonb) from public;
       revoke all on function public.f(jsonb) from anon;
       revoke all on function public.f(jsonb) from authenticated;`,
    ],
    { "f(jsonb)": "" },
  ],
  [
    "one revoke naming two functions, in capitals and over two lines",
    [`${definer("f()")} ${definer("g(p_code text)")} REVOKE EXECUTE ON FUNCTION public.f(), public.g(text)\n  FROM PUBLIC, anon, authenticated;`],
    { "f()": "", "g(text)": "" },
  ],
  [
    "revoked from the two roles but not from public, which both belong to",
    [`${definer("f()")} revoke execute on function public.f() from anon, authenticated;`],
    { "f()": "anon authenticated" },
  ],
  [
    "closed, and a later file grants it back",
    [`${definer("f()")} revoke all on function public.f() ${CLOSED};`, "grant execute on function public.f() to authenticated;"],
    { "f()": "authenticated" },
  ],
  [
    "a trigger function, which the API cannot call",
    ["create function public.t() returns trigger language plpgsql security definer as $$ begin return new; end $$;"],
    {},
  ],
  ["a function a later file drops", [definer("f(p_n int)"), "drop function if exists public.f(integer);"], {}],
  [
    "an overload: closing the four argument form leaves the five argument one open",
    [
      `${definer("f(a uuid, b boolean, c timestamptz, d text)")}
       revoke execute on function public.f(uuid, boolean, timestamptz, text) ${CLOSED};`,
      definer("f(a uuid, b boolean, c timestamptz, d text, e timestamptz default null)"),
    ],
    { "f(uuid, boolean, timestamptz, text)": "", "f(uuid, boolean, timestamptz, text, timestamptz)": "anon authenticated" },
  ],
  [
    "create or replace keeps the grants, however the types are spelled",
    [
      `${definer("f(a int, b timestamp with time zone)")} revoke all on function public.f(integer, timestamptz) ${CLOSED};`,
      definer("f(a int4, b timestamptz)"),
    ],
    { "f(integer, timestamptz)": "" },
  ],
  [
    "dropped and made again, it starts open again",
    [`${definer("f()")} revoke all on function public.f() ${CLOSED};`, `drop function public.f(); ${definer("f()")}`],
    { "f()": "anon authenticated" },
  ],
  [
    "a revoke in a comment or in a string is not a revoke",
    [
      `${definer("f()")}
       -- revoke all on function public.f() ${CLOSED};
       /* a comment /* inside a comment */ revoke all on function public.f() ${CLOSED}; */
       comment on function public.f() is 'revoke all on function public.f() ${CLOSED};';`,
    ],
    { "f()": "anon authenticated" },
  ],
  [
    "a function that runs with the caller's own rights, which is not this test's business",
    ["create function public.f() returns int language sql as $$ select 1 $$;"],
    {},
  ],
];

describe("the scan", () => {
  it.each(CASES)("%s", (_why, files, want) => {
    const got = scan(files.map((sql, i) => ({ name: `${i}.sql`, sql })));
    expect(Object.fromEntries(got.definers.map((f) => [f.fn, f.open.join(" ")]))).toEqual(want);
    expect(got.unread).toEqual([]);
  });

  it("says so when a statement about functions is in a shape it does not follow", () => {
    const unread = (sql: string) => scan([{ name: "x.sql", sql }]).unread.length;
    for (const sql of [
      "grant execute on all functions in schema public to anon;",
      "alter default privileges in schema public grant execute on functions to anon;",
      "alter function public.f() security definer;",
      "grant execute on routine public.f() to anon;",
      "do $$ begin execute 'grant execute on function public.f() to anon'; end $$;",
    ]) {
      expect(unread(sql), sql).toBe(1);
    }
    for (const sql of [
      "create trigger t after insert on public.x for each row execute function public.g();",
      "alter function public.f() set search_path = public;",
      "grant select on public.x to anon, authenticated;",
      "do $$ begin grant insert (id) on public.profiles to authenticated; end $$;",
    ]) {
      expect(unread(sql), sql).toBe(0);
    }
  });

  it("would have caught F-32: without the file that closed them, the three are open to both", () => {
    const before = scan(FILES.filter((f) => f.name !== "20261008000100_admin_rollups.sql")).definers;
    for (const fn of [
      "analytics_daily_buckets(timestamptz, integer)",
      "shop_reviews_resync(uuid)",
      "shop_store_reviews_resync(uuid)",
    ]) {
      expect(before.find((f) => f.fn === fn)?.open, `${fn} before`).toEqual(["anon", "authenticated"]);
      expect(FOLDER.definers.find((f) => f.fn === fn)?.open, `${fn} today`).toEqual([]);
    }
  });

  it("refuses the next one: a new file that repeats F-32's mistake is named, and so is the file", () => {
    const next = {
      name: "20991231000000_next.sql",
      sql: `${definer("next_counts(p_since timestamptz)")} revoke all on function public.next_counts(timestamptz) from public;`,
    };
    expect(unexplained(scan([...FILES, next]).definers)).toContain(
      "public.next_counts(timestamptz), last defined in 20991231000000_next.sql: anon and authenticated can call it",
    );
  });

  it("holds an entry to the roles it names: a later file that opens a review function to anon is caught", () => {
    const later = {
      name: "20991231000000_later.sql",
      sql: "grant execute on function public.shop_submit_review(uuid, int, text, text, text, boolean) to anon;",
    };
    expect(unexplained(scan([...FILES, later]).definers)).toContain(
      "public.shop_submit_review(uuid, integer, text, text, text, boolean), last defined in " +
        "20260722000100_shop_review_seeds_photos.sql: anon can call it (LEFT_OPEN covers only authenticated)",
    );
  });

  it("tells overloads apart: upsert_entitlement's four argument form was dropped, the five argument one is closed", () => {
    expect(FOLDER.definers.filter((f) => f.fn.startsWith("upsert_entitlement("))).toEqual([
      {
        fn: "upsert_entitlement(uuid, boolean, timestamptz, text, timestamptz)",
        file: "20260713000000_entitlements_pro.sql",
        open: [],
      },
    ]);
  });
});
