/**
 * The theology library's search, the part the page's script carries (1.8,
 * round 3 r3-04): the kinds of the library, an item of the list, and the
 * search itself. The list is built on the server (./searchIndex.ts) and
 * fetched as one file (app/theology-search.json).
 */

export type TheologySection = "Doctrine" | "Topics" | "Heresies" | "Apologetics" | "Councils" | "Fathers";

export type TheologySearchItem = {
  slug: string;
  title: string;
  href: string;
  section: TheologySection;
  summary?: string;
};

/** The order the kinds are listed in: the hub's four ways, then the councils and the Fathers. */
export const THEOLOGY_SECTIONS: readonly TheologySection[] = ["Doctrine", "Topics", "Heresies", "Apologetics", "Councils", "Fathers"];

/**
 * What a query finds, in the library's order: by the title and by the line
 * under it, as the old field searched. With no words, a kind chosen lists
 * the whole kind, and nothing chosen lists nothing.
 */
export function searchLibrary(items: readonly TheologySearchItem[], query: string, kind: TheologySection | null): TheologySearchItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((it) => {
    if (kind && it.section !== kind) return false;
    if (!q) return Boolean(kind);
    return `${it.title} ${it.summary ?? ""}`.toLowerCase().includes(q);
  });
}
