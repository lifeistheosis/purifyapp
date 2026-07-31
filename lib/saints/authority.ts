// Identity links for saints: Wikidata, Wikipedia, OrthodoxWiki.
//
// These become `sameAs` in the structured data, which is how a search engine
// decides that Purify's "St Nicholas the Wonderworker" and Wikidata's
// Q44269 are the same person. That makes a wrong entry actively harmful and
// silent: a plausible-looking QID for the wrong Nicholas simply merges this
// saint with someone else, and nothing on the page looks broken.
//
// SO NOTHING HERE IS INFERRED. Every entry is resolved through the live
// APIs by scripts/resolve-saint-authority.mjs (Wikidata wbgetentities against
// enwiki, and the OrthodoxWiki API with redirects followed), and the script
// writes only exact matches. A saint the script cannot resolve is left out
// rather than guessed: an absent sameAs costs nothing, a wrong one is a
// false identity claim.
//
// Do not hand-edit URLs into this file. Run the script.

export type SaintAuthority = {
  /** Wikidata entity, e.g. "Q44269". */
  wikidata?: string;
  /** English Wikipedia article title, e.g. "Athanasius of Alexandria". */
  wikipedia?: string;
  /** OrthodoxWiki page title, after redirects. */
  orthodoxwiki?: string;
};

/** Keyed by saint slug. Populated by scripts/resolve-saint-authority.mjs. */
export const SAINT_AUTHORITY: Record<string, SaintAuthority> = {};

/**
 * The `sameAs` array for a saint, or undefined when we have nothing
 * verified. Undefined is the correct output for an unresolved saint: the
 * structured data then makes no identity claim at all.
 */
export function sameAsFor(slug: string): string[] | undefined {
  const a = SAINT_AUTHORITY[slug];
  if (!a) return undefined;
  const out: string[] = [];
  if (a.wikidata) out.push(`https://www.wikidata.org/wiki/${a.wikidata}`);
  if (a.wikipedia)
    out.push(
      `https://en.wikipedia.org/wiki/${encodeURIComponent(a.wikipedia.replace(/ /g, "_"))}`,
    );
  if (a.orthodoxwiki)
    out.push(
      `https://orthodoxwiki.org/${encodeURIComponent(a.orthodoxwiki.replace(/ /g, "_"))}`,
    );
  return out.length ? out : undefined;
}
