// Every page names itself (the arbiter's word of 2026-11-13, from build 95
// note 15). The website's root head (app/layout.tsx, WEBSITE_METADATA) gave
// every page that set none of its own the home page's canonical address and
// og:url ("/") and the home page's Open Graph title, and "Purify" as its title
// on X: read live on purifyapp.net the same day (The Paschal Homily, /saints,
// /bible/john/1), every one of them told a search engine it was a copy of the
// home page, and unfolded as the home page where its link was pasted.
//
// What holds: the root names no page's address but by "./", which Next.js
// reads against each page's own path, and no title or description for Open
// Graph or X, which then come from each page's own. And a page that sets an
// openGraph or alternates of its own names its address in it, because Next.js
// replaces the root's object whole rather than merging it: a reader's profile
// (/u) and a shared journal page (/p) set their own openGraph without a url,
// and so had no og:url at all.
//
// The proof that matters is the built website: a page of every route family
// fetched from `npm run build` and read, its canonical and og:url its own
// address (recorded with the commit). This holds the source to it.

import fs from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const layout = fs.readFileSync(path.join(ROOT, "app/layout.tsx"), "utf8").replace(/\r\n/g, "\n");
/** The website's root head, its code without notes. */
const website = (() => {
  const start = layout.indexOf("const WEBSITE_METADATA");
  const end = layout.indexOf("\n};", start);
  return layout
    .slice(start, end)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
})();
/** One object of the head, by its key: `openGraph: { ... }`. */
const block = (key: string) => new RegExp(`\\b${key}:\\s*\\{([^{}]*)\\}`).exec(website)?.[1] ?? null;

/** Every source file of the website's pages and what they read: app/ and lib/, tests aside. */
function sources(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__tests__" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Each `openGraph: { ... }` and `alternates: { ... }` written in the code, with the keys it names. */
function previewObjects() {
  const found: { where: string; key: "openGraph" | "alternates"; names: string[] }[] = [];
  for (const file of [...sources(path.join(ROOT, "app")), ...sources(path.join(ROOT, "lib"))]) {
    const text = fs.readFileSync(file, "utf8");
    if (!text.includes("openGraph") && !text.includes("alternates")) continue;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node: ts.Node) => {
      if (
        ts.isPropertyAssignment(node) &&
        (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
        (node.name.text === "openGraph" || node.name.text === "alternates") &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        const names = node.initializer.properties.flatMap((p) =>
          (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? [p.name.text] : [],
        );
        const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        found.push({ where: `${path.relative(ROOT, file)}:${line}`, key: node.name.text, names });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}

describe("the website's root head", () => {
  it("is found where the website reads it", () => {
    expect(website).toContain("metadataBase: new URL(SITE_URL)");
    expect(layout).toMatch(/export const metadata: Metadata = IS_STATIC_EXPORT \? APP_METADATA : WEBSITE_METADATA;/);
  });

  it("gives each page its own address as its canonical, never the home page's", () => {
    const alternates = block("alternates");
    expect(alternates).not.toBeNull();
    expect(alternates).toMatch(/canonical:\s*"\.\/"/);
    expect(alternates).not.toMatch(/canonical:\s*"\/"/);
  });

  it("gives each page its own address as its og:url, and names no page's title or description for Open Graph", () => {
    const og = block("openGraph");
    expect(og).not.toBeNull();
    expect(og).toMatch(/url:\s*"\.\/"/);
    expect(og).not.toMatch(/url:\s*"\/"/);
    expect(og).not.toMatch(/\btitle:/);
    expect(og).not.toMatch(/\bdescription:/);
  });

  it("names no title or description for X, so each page's own stand there", () => {
    const twitter = block("twitter");
    expect(twitter).not.toBeNull();
    expect(twitter).not.toMatch(/\btitle:/);
    expect(twitter).not.toMatch(/\bdescription:/);
  });
});

describe("a page that sets its own preview", () => {
  const objects = previewObjects();

  it("is found: the root and Orthodox History set theirs", () => {
    expect(objects.some((o) => o.where.startsWith("app/layout.tsx:") && o.key === "openGraph")).toBe(true);
    expect(objects.some((o) => o.where.startsWith("app/(app)/history/page.tsx:") && o.key === "alternates")).toBe(true);
  });

  it("names its own address in its openGraph, which replaces the root's whole", () => {
    expect(objects.filter((o) => o.key === "openGraph" && !o.names.includes("url")).map((o) => o.where)).toEqual([]);
  });

  it("names its own canonical in its alternates, which replaces the root's whole", () => {
    expect(objects.filter((o) => o.key === "alternates" && !o.names.includes("canonical")).map((o) => o.where)).toEqual([]);
  });
});
