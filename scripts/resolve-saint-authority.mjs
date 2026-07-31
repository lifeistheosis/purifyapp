// Resolves Wikidata / Wikipedia / OrthodoxWiki identities for every saint in
// the registry, through the live APIs, and rewrites lib/saints/authority.ts.
//
// WHY A SCRIPT AND NOT A HAND-WRITTEN TABLE. These URLs become `sameAs` in
// the structured data, which is how a search engine merges Purify's saint
// with an entity elsewhere. A plausible-but-wrong QID does not error; it
// silently identifies this saint as a different person. So nothing is
// inferred from a name: every entry is confirmed against the API, and a
// saint that cannot be confirmed is OMITTED rather than guessed. An absent
// sameAs costs nothing.
//
// Redirects matter. Athanasius resolves only by following enwiki's redirect
// to "Athanasius of Alexandria"; a title-equality check alone would drop him.
//
// Needs outbound network, which the agent shell does not have. Run it and
// commit the result.
//
// Usage:
//   node scripts/resolve-saint-authority.mjs            # resolve all, write
//   node scripts/resolve-saint-authority.mjs --dry-run  # report only

import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry-run");
const OUT = path.join(process.cwd(), "lib", "saints", "authority.ts");
const UA = "PurifyBot/1.0 (https://purifyapp.net; saint identity resolution)";

/** Politeness delay between API calls, ms. */
const DELAY = 250;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/**
 * Wikidata by English Wikipedia title. Uses wbgetentities against enwiki,
 * which resolves the sitelink exactly: if the title is not a real enwiki
 * article the entities map comes back with a "-1" miss rather than a
 * near-match, which is precisely the behaviour we want.
 */
async function wikidataByEnwikiTitle(title) {
  const url =
    "https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&props=sitelinks" +
    `&titles=${encodeURIComponent(title)}&format=json&origin=*`;
  const j = await getJson(url);
  const entities = j.entities ?? {};
  const id = Object.keys(entities).find((k) => k !== "-1" && !entities[k].missing);
  if (!id) return null;
  const sitelinks = entities[id].sitelinks ?? {};
  return {
    wikidata: id,
    wikipedia: sitelinks.enwiki?.title ?? title,
  };
}

/** Follow enwiki redirects so "Athanasius" becomes "Athanasius of Alexandria". */
async function enwikiCanonicalTitle(query) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&redirects=1&format=json&origin=*" +
    `&titles=${encodeURIComponent(query)}`;
  const j = await getJson(url);
  const pages = j.query?.pages ?? {};
  const key = Object.keys(pages)[0];
  if (!key || key === "-1") return null;
  return pages[key].title ?? null;
}

/** OrthodoxWiki, redirects followed. */
async function orthodoxWikiTitle(query) {
  const url =
    "https://orthodoxwiki.org/api.php?action=query&redirects=1&format=json&origin=*" +
    `&titles=${encodeURIComponent(query)}`;
  const j = await getJson(url);
  const pages = j.query?.pages ?? {};
  const key = Object.keys(pages)[0];
  if (!key || key === "-1") return null;
  return pages[key].title ?? null;
}

/**
 * Search candidates for a saint, most specific first. "St." is stripped
 * because neither wiki titles articles that way.
 */
function candidates(saint) {
  const bare = saint.name.replace(/^(St\.|Saint)\s+/i, "").trim();
  const out = [bare];
  // "St. Nicholas the Wonderworker" also lives under its see, and the slug
  // often already encodes the disambiguated form.
  const fromSlug = saint.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (fromSlug.toLowerCase() !== bare.toLowerCase()) out.push(fromSlug);
  if (saint.see) out.push(`${bare.split(" ")[0]} of ${saint.see.split(" ")[0]}`);
  return [...new Set(out)];
}

const { SAINTS } = await import("../lib/saints/saints.ts");

const resolved = {};
const unresolved = [];

for (const saint of SAINTS) {
  let hit = null;
  for (const q of candidates(saint)) {
    try {
      const canonical = await enwikiCanonicalTitle(q);
      await sleep(DELAY);
      if (!canonical) continue;
      const wd = await wikidataByEnwikiTitle(canonical);
      await sleep(DELAY);
      if (wd) {
        hit = wd;
        break;
      }
    } catch (e) {
      console.warn(`  ! ${saint.slug} "${q}": ${e.message}`);
    }
  }

  let ow = null;
  for (const q of candidates(saint)) {
    try {
      ow = await orthodoxWikiTitle(q);
      await sleep(DELAY);
      if (ow) break;
    } catch {
      /* OrthodoxWiki is optional */
    }
  }

  if (hit || ow) {
    resolved[saint.slug] = {
      ...(hit?.wikidata ? { wikidata: hit.wikidata } : {}),
      ...(hit?.wikipedia ? { wikipedia: hit.wikipedia } : {}),
      ...(ow ? { orthodoxwiki: ow } : {}),
    };
    console.log(
      `ok   ${saint.slug.padEnd(34)} ${hit?.wikidata ?? "-"}  ${hit?.wikipedia ?? ""}${ow ? `  | ow: ${ow}` : ""}`,
    );
  } else {
    unresolved.push(saint.slug);
    console.log(`MISS ${saint.slug}`);
  }
}

console.log(
  `\nresolved ${Object.keys(resolved).length} of ${SAINTS.length}; ${unresolved.length} left out on purpose`,
);
if (unresolved.length) console.log("unresolved: " + unresolved.join(", "));

if (DRY) {
  console.log("\n(dry run; nothing written)");
  process.exit(0);
}

const header = fs.readFileSync(OUT, "utf8").split("export const SAINT_AUTHORITY")[0];
const body =
  `export const SAINT_AUTHORITY: Record<string, SaintAuthority> = ${JSON.stringify(
    resolved,
    null,
    2,
  )};\n`;
const tail = fs.readFileSync(OUT, "utf8").split("};\n").slice(1).join("};\n");
fs.writeFileSync(OUT, header + body + tail);
console.log(`\nwrote ${OUT}`);
