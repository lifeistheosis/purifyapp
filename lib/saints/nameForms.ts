/**
 * The forms of a saint's name that open the saint's card when they stand in a
 * text (1.8, the owner's word on names that open a profile: "full names and
 * known forms only, never a bare first name").
 *
 * A saint's own registry name gives the first form, with its "St." or "Holy"
 * taken off (St. Leo the Great is found as Leo the Great, and a "St" or
 * "Saint" before it is taken into the link). A one-word name never counts, nor
 * one with a comma, which is a title rather than a name (St. Titus, Bishop of
 * Crete). The rest are written by hand below, each a form the Fathers and the
 * histories actually use.
 *
 * Kept free of imports beyond types, like the registry itself, so
 * scripts/saint-names.mjs can load it and write the small table the readers
 * carry (nameIndex.generated.ts); the registry never reaches a page's script.
 */
import type { Saint } from "./saints";

/** Forms besides the registry name, by slug. Full names and titles only. */
export const KNOWN_FORMS: Record<string, string[]> = {
  "john-the-baptist": ["John the Baptist", "John the Forerunner"],
  "apostle-john": ["John the Theologian", "John the Evangelist", "Apostle John"],
  "apostle-matthew": ["Matthew the Evangelist", "Apostle Matthew"],
  "apostle-paul": ["St Paul", "St. Paul", "Saint Paul", "Paul the Apostle"],
  "apostle-peter": ["St Peter", "St. Peter", "Saint Peter", "Peter the Apostle"],
  "apostle-james-zebedee": ["James the son of Zebedee", "James, the son of Zebedee"],
  "apostle-james-alphaeus": ["James the son of Alphaeus", "James, the son of Alphaeus"],
  "gregory-theologian": ["Gregory of Nazianzus", "Gregory Nazianzen"],
  "athanasius-the-great": ["Athanasius of Alexandria"],
  "basil-the-great": ["Basil of Caesarea"],
  "ambrose-of-milan": ["Ambrose of Milan"],
  "jerome-of-stridon": ["Jerome of Stridon"],
  "john-of-damascus": ["John Damascene"],
  "isaac-the-syrian": ["Isaac of Nineveh"],
  "ignatius-of-antioch": ["Ignatius the God-bearer"],
  "moses-the-ethiopian": ["Moses the Black"],
  "gregory-the-dialogist": ["Gregory the Dialogist"],
  "mark-of-ephesus": ["Mark Eugenikos"],
  "nikodemos-the-hagiorite": ["Nikodemos of the Holy Mountain"],
  "theodosius-the-great": ["Theodosius the Cenobiarch"],
  "peter-of-moscow": ["Peter of Moscow"],
  "titus-of-crete": ["Titus of Crete"],
  "sixtus-of-rome": ["Sixtus of Rome"],
  "pimen-the-great": ["Abba Poemen"],
  "john-of-shanghai": ["John of Shanghai"],
  "xenia-of-petersburg": ["Xenia of Petersburg"],
  "theotokos": ["Mother of God"],
};

/**
 * Registry names that are not taken as forms, and why: another person is
 * known by the same words.
 */
export const NOT_BY_NAME: Record<string, string> = {
  "theodosius-the-great": "the emperor Theodosius I is also called Theodosius the Great",
  "theotokos": "the registry name is a title of praise, not how texts name her",
};

/** "St. Leo the Great" to "Leo the Great": the honorific before a name. */
export function nameCore(name: string): string {
  return name.replace(/^(?:The Most Holy |The Holy |Holy |Saints |Saint |Sts\. |St\. |St |The )/, "");
}

/** Every form that opens this saint, longest first. */
export function formsFor(saint: Pick<Saint, "slug" | "name">): string[] {
  const out = new Set<string>();
  const core = nameCore(saint.name);
  if (!NOT_BY_NAME[saint.slug] && core.includes(" ") && !core.includes(",")) out.add(core);
  for (const f of KNOWN_FORMS[saint.slug] ?? []) out.add(f);
  return [...out].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

/** The table the readers carry: [form, slug], longest form first. */
export function nameTable(saints: Pick<Saint, "slug" | "name">[]): [string, string][] {
  const rows: [string, string][] = [];
  const seen = new Map<string, string>();
  for (const s of saints) {
    for (const f of formsFor(s)) {
      const other = seen.get(f);
      if (other && other !== s.slug) throw new Error(`"${f}" names both ${other} and ${s.slug}`);
      if (!other) rows.push([f, s.slug]);
      seen.set(f, s.slug);
    }
  }
  return rows.sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0]));
}
