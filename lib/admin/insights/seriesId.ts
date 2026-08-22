/**
 * Series identity, parsed rather than slugged.
 *
 * THE BUG THIS REPLACES. The old scheme slugged the whole CSV header and cut it
 * at 80 characters. A Google Play Console header looks like
 *
 *   Installed audience (All users, Unique users, Per interval, Daily): United States
 *
 * where the metric and its qualifiers occupy 61 characters before the dimension
 * even begins. So the cut landed on the DIMENSION, which is the only part that
 * distinguishes one column from its siblings. "All countries / regions" was
 * already being stored as `...all-countries-regio`, truncated mid-word, in real
 * data. Two long dimensions sharing a prefix would have merged into one series
 * silently.
 *
 * THE SHAPE IS RELIABLE. Every column in both of the owner's real exports fits
 *
 *   METRIC (QUALIFIERS): DIMENSION
 *
 * so identity is built from the three parts, each bounded on its own budget.
 * The dimension can no longer be the casualty of a long metric name.
 *
 * A PROPERTY WORTH NAMING: under a parsed scheme, two headers that produce the
 * same id genuinely ARE the same metric and dimension, so what would be a
 * collision under the old scheme is a correct merge under this one. That is
 * exactly what accumulating imports needs.
 *
 * QUALIFIERS ARE PART OF IDENTITY, deliberately. "Per interval, Daily" and
 * "Cumulative, Daily" are different measurements of the same thing, and folding
 * them together would sum a running total as though it were a daily count.
 */

/** Budgets, per part. Generous, and the dimension gets the most. */
const METRIC_MAX = 48;
const QUALS_MAX = 48;
const DIM_MAX = 64;

const SHAPE = /^(.+?)\s*\(([^)]*)\)\s*:\s*(.+)$/;
/** A header with a dimension but no qualifiers: "Metric: Dimension". */
const SHAPE_NO_QUALS = /^([^:(]+?)\s*:\s*(.+)$/;

export type HeaderParts = {
  metric: string;
  qualifiers: string;
  dimension: string;
  /** False when the header did not fit the Play Console shape. */
  structured: boolean;
};

export function parseHeader(header: string): HeaderParts {
  const raw = (header ?? "").trim();

  const full = SHAPE.exec(raw);
  if (full) {
    return {
      metric: full[1].trim(),
      qualifiers: full[2].trim(),
      dimension: full[3].trim(),
      structured: true,
    };
  }

  const bare = SHAPE_NO_QUALS.exec(raw);
  if (bare) {
    return {
      metric: bare[1].trim(),
      qualifiers: "",
      dimension: bare[2].trim(),
      structured: true,
    };
  }

  // Not a Play Console shape. A plain column name like "Installs" is a metric
  // with no dimension, which is a perfectly good series.
  return { metric: raw, qualifiers: "", dimension: "", structured: false };
}

function slug(s: string, max: number): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

/**
 * The identity of a series, from its header.
 *
 * Pipe separated so the three parts stay legible in a database row and in a
 * URL-free context. Nothing parses the id back apart; the parts are stored in
 * their own columns for that.
 */
export function seriesIdOf(header: string): string {
  const p = parseHeader(header);
  const id = [
    slug(p.metric, METRIC_MAX),
    slug(p.qualifiers, QUALS_MAX),
    slug(p.dimension, DIM_MAX),
  ].join("|");
  // A header of pure punctuation would slug to nothing at all. Falling back to
  // a fixed string would merge every such column into one series, so it keeps
  // whatever raw text there was.
  return id === "||" ? `raw|${slug(header, DIM_MAX)}` : id;
}

/**
 * The OLD identity, kept only to remap what it produced.
 *
 * `Series.source` stores the full original header, so an existing goal's series
 * id can be recomputed both ways from the same string and matched exactly. This
 * is what makes the migration mechanical rather than a guess.
 *
 * Delete this once no stored goal references a legacy id.
 */
export function legacySeriesId(header: string): string {
  return (header ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Old id to new id, for every header in a dataset.
 *
 * Used once, when goals written against the old scheme meet series written
 * under the new one.
 */
export function legacyIdMap(headers: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const h of headers) out.set(legacySeriesId(h), seriesIdOf(h));
  return out;
}

/**
 * A short, human label for a chart legend.
 *
 * The dimension when there is one, because that is what distinguishes this
 * column from its siblings; the metric otherwise. "All countries / regions" is
 * the total rather than a country, and saying so is more use than repeating the
 * metric name every sibling already shares.
 */
export function labelOf(header: string): string {
  const p = parseHeader(header);
  if (!p.dimension) return p.metric || header.trim();
  if (p.dimension.toLowerCase() === "all countries / regions") {
    return `${p.metric}, total`;
  }
  return p.dimension;
}
