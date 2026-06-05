// Link integrity for the Reading Hub's curated data.
//
// Every href in lib/reading/curated.ts must resolve to real, hosted content:
// a saint+work whose JSON exists, a topic file, or a council slug. A
// fabricated or dead link fails here, which keeps the "real content only"
// guarantee enforced in CI. We read the data/ JSON directly (not via the
// server-only loaders) so this runs in the plain node environment.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SAINTS } from "@/lib/saints/saints";
import { COUNCILS } from "@/lib/councils/councils";
import { POPULAR, PATHS, DEFAULT_NEXT, allCuratedHrefs } from "@/lib/reading/curated";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const SAINTS_DIR = path.join(ROOT, "data", "saints");
const TOPICS_DIR = path.join(ROOT, "data", "topics");

const councilSlugs = new Set(COUNCILS.map((c) => c.slug));

// A registered work whose body JSON also exists on disk.
function workResolves(saintSlug: string, workSlug: string): boolean {
 const saint = SAINTS.find((s) => s.slug === saintSlug);
 if (!saint) return false;
 if (!saint.works.some((w) => w.slug === workSlug)) return false;
 return fs.existsSync(path.join(SAINTS_DIR, saintSlug, `${workSlug}.json`));
}

function topicResolves(slug: string): boolean {
 return fs.existsSync(path.join(TOPICS_DIR, `${slug}.json`));
}

function councilResolves(slug: string): boolean {
 return councilSlugs.has(slug);
}

/** Resolve any curated route by its shape. Unknown shapes are treated as dead. */
function hrefResolves(href: string): boolean {
 const parts = href.replace(/^\//, "").split("/");
 if (parts[0] === "saints" && parts.length === 3) {
 return workResolves(parts[1], parts[2]);
 }
 if (parts[0] === "topics" && parts.length === 2) {
 return topicResolves(parts[1]);
 }
 if (parts[0] === "councils" && parts.length === 2) {
 return councilResolves(parts[1]);
 }
 return false;
}

describe("Reading Hub curated data", () => {
 it("every curated href resolves to real content", () => {
 const dead = allCuratedHrefs().filter((href) => !hrefResolves(href));
 expect(dead).toEqual([]);
 });

 it("POPULAR has unique hrefs", () => {
 const seen = new Set(POPULAR.map((p) => p.href));
 expect(seen.size).toBe(POPULAR.length);
 });

 it("PATHS never point a reader to a route they would already be on", () => {
 // A path's target must differ from any match anchor it carries.
 for (const p of PATHS) {
 if (p.href) expect(p.to.href).not.toBe(p.href);
 }
 });

 it("DEFAULT_NEXT is a non-empty curated fallback", () => {
 expect(DEFAULT_NEXT.length).toBeGreaterThan(0);
 });
});
