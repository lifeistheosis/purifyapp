// Builds a normalized-Greek-word -> Strong's index from the BMT NT data
// already written under data/bible/original/{nt-slug}/*.json (which carries
// tokens with Strong's numbers + morph codes), then walks every Greek LXX
// chapter under data/bible/original/{ot-slug}/*.json and rewrites each
// verse to include a tokens[] array.
//
// LXX words that match a NT-known surface form get a Strong's number (and
// thus become clickable). LXX-only words (Hebrew names, hapax legomena,
// etc.) get a token with no Strong's, VerseRow renders them as plain text.
//
// Why this approach: there's no public-domain Strong's-tagged Septuagint
// in plain text I can find. The NT-derived index covers the overlapping
// shared Greek vocabulary, which is ~70% of LXX word occurrences. Better
// than no clickability at all.
//
// Usage: node scripts/tag-lxx.mjs

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ORIG = path.join(ROOT, "data", "bible", "original");

// Subset of OT book slugs (everything under data/bible/original/ that isn't
// in this NT set).
const NT_SLUGS = new Set([
 "matthew", "mark", "luke", "john", "acts",
 "romans", "1-corinthians", "2-corinthians", "galatians", "ephesians",
 "philippians", "colossians", "1-thessalonians", "2-thessalonians",
 "1-timothy", "2-timothy", "titus", "philemon", "hebrews", "james",
 "1-peter", "2-peter", "1-john", "2-john", "3-john", "jude", "revelation",
]);

// Strip Greek diacritics + final sigma + lowercase.
function normalize(word) {
 return word
 .normalize("NFD")
 .replace(/\p{M}+/gu, "") // combining diacritics
 .toLowerCase()
 .replace(/[·;.,;:!?·]/g, "")
 .replace(/ς/g, "σ"); // final sigma -> medial
}

// Build a map: normalized NT surface form -> Strong's number.
// Counts occurrences; we pick the most frequent Strong's per surface form.
async function buildNtIndex() {
 const counts = new Map(); // normalized -> Map(strongs -> count)
 for (const slug of NT_SLUGS) {
 const dir = path.join(ORIG, slug);
 let files;
 try {
 files = await fs.readdir(dir);
 } catch {
 console.warn(`skip ${slug}: no folder`);
 continue;
 }
 for (const f of files) {
 if (!f.endsWith(".json")) continue;
 const data = JSON.parse(await fs.readFile(path.join(dir, f), "utf8"));
 for (const v of data.verses ?? []) {
 for (const t of v.tokens ?? []) {
 const k = normalize(t.w);
 if (!k) continue;
 if (!counts.has(k)) counts.set(k, new Map());
 const m = counts.get(k);
 m.set(t.s, (m.get(t.s) ?? 0) + 1);
 }
 }
 }
 }
 // Reduce to a flat map: normalized -> Strong's number (most common).
 const index = new Map();
 for (const [k, m] of counts) {
 let best = null;
 let bestN = 0;
 for (const [s, n] of m) {
 if (n > bestN) {
 best = s;
 bestN = n;
 }
 }
 if (best) index.set(k, best);
 }
 return index;
}

// Tokenize an LXX verse string into { w, s? } objects.
// Splits on whitespace; strips trailing punctuation from each token; preserves
// the original accented spelling in w.
function tokenizeLxxVerse(text, ntIndex) {
 const out = [];
 const parts = text.split(/(\s+)/); // keep whitespace separators
 for (const p of parts) {
 if (/^\s+$/.test(p)) continue;
 if (!p) continue;
 // Detach trailing punctuation so it doesn't appear in `w`. We keep it
 // by emitting as a separate untagged token so display stays faithful.
 const trail = p.match(/[·;.,;:!?·]+$/);
 const core = trail ? p.slice(0, -trail[0].length) : p;
 if (core) {
 const k = normalize(core);
 const s = ntIndex.get(k);
 out.push(s ? { w: core, s } : { w: core });
 }
 if (trail) {
 out.push({ w: trail[0] });
 }
 }
 return out;
}

async function buildOtTokens(ntIndex) {
 let chapters = 0;
 let tokensTotal = 0;
 let tokensTagged = 0;
 const slugs = (await fs.readdir(ORIG)).filter(
 (s) => !NT_SLUGS.has(s),
 );
 for (const slug of slugs) {
 const dir = path.join(ORIG, slug);
 const stat = await fs.stat(dir).catch(() => null);
 if (!stat?.isDirectory()) continue;
 const files = await fs.readdir(dir);
 for (const f of files) {
 if (!f.endsWith(".json")) continue;
 const full = path.join(dir, f);
 const data = JSON.parse(await fs.readFile(full, "utf8"));
 // Only rewrite if it doesn't already have NT-style tokens AND it's an
 // OT chapter (sourced from Septuagint).
 let changed = false;
 for (const v of data.verses ?? []) {
 if (v.tokens?.length) continue; // already tagged (shouldn't happen for OT)
 const toks = tokenizeLxxVerse(v.text, ntIndex);
 if (toks.length) {
 v.tokens = toks;
 changed = true;
 tokensTotal += toks.length;
 tokensTagged += toks.filter((t) => t.s).length;
 }
 }
 if (changed) {
 await fs.writeFile(full, JSON.stringify(data), "utf8");
 chapters++;
 }
 }
 }
 return { chapters, tokensTotal, tokensTagged };
}

(async () => {
 console.log("building NT index...");
 const idx = await buildNtIndex();
 console.log(`NT surface forms: ${idx.size}`);

 console.log("tagging LXX OT...");
 const { chapters, tokensTotal, tokensTagged } = await buildOtTokens(idx);
 const pct = tokensTotal > 0 ? Math.round((tokensTagged / tokensTotal) * 100) : 0;
 console.log(`OT chapters: ${chapters}`);
 console.log(
 `OT tokens: ${tokensTagged}/${tokensTotal} tagged (${pct}%)`,
 );
})();
