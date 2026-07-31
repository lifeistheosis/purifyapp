/**
 * Authority-file links for each saint, used as JSON-LD `sameAs`.
 *
 * `sameAs` is how a search engine or an LLM confirms that "St. Gregory the
 * Theologian" on this site is the same entity as the Gregory of Nazianzus it
 * already knows. Without it a page is a name in isolation. With it the page
 * inherits the confidence already attached to the entity.
 *
 * Every QID below was resolved through the live Wikidata API
 * (action=wbgetentities&sites=enwiki) on 2026-07-31, and every OrthodoxWiki
 * title through the live OrthodoxWiki API with redirects followed. Nothing
 * here is guessed. If a saint is added, resolve their identifiers the same
 * way rather than inferring a URL from the name.
 */

type Authority = {
  wikidata: string; // Q-number
  wikipedia: string; // en.wikipedia.org article title
  orthodoxwiki: string; // orthodoxwiki.org article title (post-redirect)
};

const AUTHORITY: Record<string, Authority> = {
  "athanasius-the-great": {
    wikidata: "Q44024",
    wikipedia: "Athanasius_of_Alexandria",
    // "Athanasius the Great" redirects here; the canonical title is used.
    orthodoxwiki: "Athanasius_of_Alexandria",
  },
  "john-chrysostom": {
    wikidata: "Q43706",
    wikipedia: "John_Chrysostom",
    orthodoxwiki: "John_Chrysostom",
  },
  "basil-the-great": {
    wikidata: "Q44258",
    wikipedia: "Basil_of_Caesarea",
    orthodoxwiki: "Basil_the_Great",
  },
  "gregory-theologian": {
    wikidata: "Q44011",
    wikipedia: "Gregory_of_Nazianzus",
    orthodoxwiki: "Gregory_the_Theologian",
  },
  "john-of-damascus": {
    wikidata: "Q51884",
    wikipedia: "John_of_Damascus",
    orthodoxwiki: "John_of_Damascus",
  },
  "seraphim-of-sarov": {
    wikidata: "Q44717",
    wikipedia: "Seraphim_of_Sarov",
    orthodoxwiki: "Seraphim_of_Sarov",
  },
  "ignatius-of-antioch": {
    wikidata: "Q44170",
    wikipedia: "Ignatius_of_Antioch",
    orthodoxwiki: "Ignatius_of_Antioch",
  },
  "maximus-the-confessor": {
    wikidata: "Q206842",
    wikipedia: "Maximus_the_Confessor",
    orthodoxwiki: "Maximus_the_Confessor",
  },
  "symeon-the-new-theologian": {
    wikidata: "Q381710",
    wikipedia: "Symeon_the_New_Theologian",
    orthodoxwiki: "Symeon_the_New_Theologian",
  },
  "augustine-of-hippo": {
    wikidata: "Q8018",
    wikipedia: "Augustine_of_Hippo",
    orthodoxwiki: "Augustine_of_Hippo",
  },
  "cyril-of-alexandria": {
    wikidata: "Q44079",
    wikipedia: "Cyril_of_Alexandria",
    orthodoxwiki: "Cyril_of_Alexandria",
  },
  "irenaeus-of-lyons": {
    wikidata: "Q182123",
    wikipedia: "Irenaeus",
    orthodoxwiki: "Irenaeus_of_Lyons",
  },
  "apostle-paul": {
    wikidata: "Q9200",
    wikipedia: "Paul_the_Apostle",
    orthodoxwiki: "Apostle_Paul",
  },
  "mary-of-egypt": {
    wikidata: "Q237583",
    wikipedia: "Mary_of_Egypt",
    orthodoxwiki: "Mary_of_Egypt",
  },
  "nicholas-the-wonderworker": {
    wikidata: "Q44269",
    wikipedia: "Saint_Nicholas",
    orthodoxwiki: "Nicholas_of_Myra",
  },
};

/** Absolute authority URLs for a saint, or [] if the saint is unmapped. */
export function sameAsFor(slug: string): string[] {
  const a = AUTHORITY[slug];
  if (!a) return [];
  return [
    `https://www.wikidata.org/wiki/${a.wikidata}`,
    `https://en.wikipedia.org/wiki/${a.wikipedia}`,
    `https://orthodoxwiki.org/${a.orthodoxwiki}`,
  ];
}
