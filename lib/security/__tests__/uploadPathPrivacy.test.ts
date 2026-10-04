// No storage upload may write a path built from the reader's id.
//
// A public bucket serves every object at a URL that IS its path, to anyone.
// The Kitchen once stored a member's photos at r/<user id>/..., which put
// the Supabase auth uuid (also the RevenueCat appUserID) in every review
// photo every reader was served, quietly undoing
// 20260802000100_revoke_public_user_id.sql and
// publicColumnExposure.test.ts. This finds every .upload( call in app/,
// components/ and lib/, works out the path it writes, following the
// variables it is built from, and fails if the reader's id is in it.
//
// No route does it any more: the avatar route was the last, and went random
// with 20261008000000_avatar_random_path.sql. STILL_NAMED is kept, empty, as
// the place a known exception would be pinned with its reason, the way
// publicColumnExposure pins the tables it knowingly leaves.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN = ["app", "components", "lib"];

/** The routes that store a reader's own upload. Always a random path. */
const RANDOM_ROUTES = [
  "app/api/community/avatar/route.ts",
  "app/api/profile/banner/route.ts",
  "app/api/trapeza/upload/route.ts",
  "app/api/campaigns/image/route.ts",
];

/** Known to put the reader's id in a public path. Tracked, not accepted. None today. */
const STILL_NAMED: Record<string, string> = {};

/**
 * The routes that take the URL of an upload back from the client and store
 * it in a row. A random path proves nothing about who uploaded the file, so
 * each must ask the server's own record (lib/security/uploadOwners.ts).
 */
const ATTACH_ROUTES = [
  "app/api/trapeza/route.ts",
  "app/api/trapeza/[id]/reviews/route.ts",
  "app/api/campaigns/route.ts",
];

/** What carries the auth uuid into a path. */
const IDENTITY = [/\buser\s*[?!]?\s*\.\s*id\b/, /\buser_?id\b/i, /\buid\b/, /\bauth\.uid\b/];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__" && entry.name !== "node_modules") walk(rel, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

/** Index of the quote that closes the string opened at `start`. */
function skipString(src: string, start: number): number {
  for (let i = start + 1; i < src.length; i++) {
    if (src[i] === "\\") i++;
    else if (src[i] === src[start]) return i;
  }
  return src.length;
}

/** Index of the backtick that closes the template opened at `start`. */
function skipTemplate(src: string, start: number): number {
  let i = start + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      i += 2;
    } else if (c === "`") {
      return i;
    } else if (c === "$" && src[i + 1] === "{") {
      i += 2;
      for (let depth = 1; i < src.length && depth > 0; i++) {
        const d = src[i];
        if (d === '"' || d === "'") i = skipString(src, i);
        else if (d === "`") i = skipTemplate(src, i);
        else if (d === "{") depth++;
        else if (d === "}") depth--;
      }
    } else {
      i++;
    }
  }
  return src.length;
}

/**
 * The expression starting at `start`, up to the first of `stops` (or an
 * unopened closing bracket) outside strings, templates, comments and brackets.
 */
function readExpression(src: string, start: number, stops: string): string {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") i = src.indexOf("\n", i) === -1 ? src.length : src.indexOf("\n", i);
    else if (c === "/" && src[i + 1] === "*") i = src.indexOf("*/", i + 2) + 1 || src.length;
    else if (c === '"' || c === "'") i = skipString(src, i);
    else if (c === "`") i = skipTemplate(src, i);
    else if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      if (depth === 0) return src.slice(start, i).trim();
      depth--;
    } else if (depth === 0 && stops.includes(c)) return src.slice(start, i).trim();
  }
  return src.slice(start).trim();
}

/** Every right-hand side assigned to the variable `name` in the file. */
function assignments(src: string, name: string): string[] {
  const re = new RegExp(String.raw`(?<![.\w$])${name}\s*(?::\s*[^=;(){}]+)?=(?![=>])`, "g");
  return [...src.matchAll(re)].map((m) => readExpression(src, m.index! + m[0].length, ";"));
}

/** The path expression, and what each bare ${variable} in it was built from. */
function sources(src: string, expr: string, seen = new Set<string>()): string[] {
  const out = [expr];
  const names = /^[A-Za-z_$][\w$]*$/.test(expr)
    ? [expr]
    : [...expr.matchAll(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g)].map((m) => m[1]);
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    for (const rhs of assignments(src, name)) out.push(...sources(src, rhs, seen));
  }
  return out;
}

type Site = { file: string; arg: string; resolved: boolean; built: string[]; named: boolean };

/** Every .upload( in one source file, with the path it writes. */
function uploadSites(file: string, src: string): Site[] {
  return [...src.matchAll(/\.upload\(\s*/g)].map((m) => {
    const arg = readExpression(src, m.index! + m[0].length, ",");
    const built = sources(src, arg);
    return {
      file,
      arg,
      // A bare variable assigned nowhere in the file (a parameter, say) is a
      // path this check cannot see, and so cannot vouch for.
      resolved: !/^[A-Za-z_$][\w$]*$/.test(arg) || built.length > 1,
      built,
      named: built.some((s) => IDENTITY.some((re) => re.test(s))),
    };
  });
}

const SITES = SCAN.flatMap((dir) => walk(dir)).flatMap((file) =>
  uploadSites(file, fs.readFileSync(path.join(ROOT, file), "utf8")),
);

const show = (s: Site) => `${s.file}: upload(${s.arg}) from ${s.built.slice(1).join(" | ") || s.arg}`;

describe("upload paths", () => {
  it("finds the uploads it guards, and can read each one's path", () => {
    const files = new Set(SITES.map((s) => s.file));
    for (const file of [...RANDOM_ROUTES, ...Object.keys(STILL_NAMED)]) {
      expect(files.has(file), `no .upload( found in ${file}`).toBe(true);
    }
    const unread = SITES.filter((s) => !s.resolved).map(show);
    expect(unread, "build the path where the upload can see it").toEqual([]);
  });

  it("a reader's own upload goes to a random path that never names them", () => {
    for (const file of RANDOM_ROUTES) {
      for (const site of SITES.filter((s) => s.file === file)) {
        expect(site.named, show(site)).toBe(false);
        expect(site.built.join(" "), show(site)).toMatch(/\bcrypto\.randomUUID\(\)/);
      }
    }
  });

  it("a route that stores an upload's URL asks the record whose it is", () => {
    for (const file of ATTACH_ROUTES) {
      const src = fs.readFileSync(path.join(ROOT, file), "utf8");
      expect(/\bownsUploads\(/.test(src), `${file} stores a client's URL without asking whose the file is`).toBe(true);
    }
  });

  it("no other upload path names the reader", () => {
    const offenders = SITES.filter((s) => s.named && !(s.file in STILL_NAMED)).map(show);
    expect(
      offenders,
      "A public bucket serves an object at a URL that is its path, so a path built " +
        "from user.id hands the auth uuid to anyone who sees the file. Use " +
        "crypto.randomUUID() and record the owner server-side (lib/security/uploadOwners.ts).",
    ).toEqual([]);
  });

  it("the routes pinned above still name the reader, so fixing one means unpinning it", () => {
    for (const [file, reason] of Object.entries(STILL_NAMED)) {
      expect(reason.length).toBeGreaterThan(0);
      expect(
        SITES.some((s) => s.file === file && s.named),
        `${file} no longer puts the reader's id in its path: delete it from STILL_NAMED`,
      ).toBe(true);
    }
  });

  it("would have caught the old paths, however they were written", () => {
    const named = (src: string) => uploadSites("x.ts", src).map((s) => s.named);
    // The Kitchen's, exactly as it stood: the id two variables away from the call.
    expect(
      named(
        "const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;\n" +
          "const path = `${folder}/${user.id}/${name}`;\n" +
          "await admin.storage.from(KITCHEN_BUCKET).upload(path, await file.arrayBuffer(), { upsert: false });",
      ),
    ).toEqual([true]);
    expect(named("const path = `c/${user.id}/${Date.now()}.${ext}`;\nawait bucket.upload(path, bytes);")).toEqual([true]);
    expect(named("const path = `u/${user.id}/${Date.now()}.${ext}`;\nawait bucket.upload(path, bytes);")).toEqual([true]);
    expect(named("const owner = user.id;\nconst path = `u/${owner}/x.jpg`;\nawait bucket.upload(path, bytes);")).toEqual([true]);
    expect(named("await bucket.upload(`u/${session.user.id}/x.jpg`, bytes);")).toEqual([true]);
    expect(named("let path: string = `u/${userId}`;\nawait bucket.upload(path, b);")).toEqual([true]);
    expect(named("const path = `a/${crypto.randomUUID()}.${ext}`;\nawait bucket.upload(path, bytes);")).toEqual([false]);
  });
});
