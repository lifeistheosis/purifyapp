/**
 * Whether an address names a page the app does not have (1.9), for the
 * proxy, which answers it with a true 404 before anything renders.
 *
 * The pages below are rendered on request on the website and stream their
 * outline (loading.tsx) before they can say there is nothing to show; the
 * stream fixes the status at 200, so a page's own notFound() came inside a
 * 200, a page to a search engine. Measured on the main web on 2026-11-10:
 * /saints/zzz-not-a-saint, /bible/zzz/1, /bible/john/99, /councils/zzz,
 * /councils/nicaea-i/zzz, /prayers/akathists/zzz, /prayers/hours/zzz and
 * /prayers/personal/zzz all answered 200. History, the chants, Theology and
 * the plans already answered 404. Next's own advice for a 404 under
 * streaming is this: check the slug in the proxy, fast, with nothing fetched
 * (node_modules/next/dist/docs, loading.md, "Status codes").
 *
 * Each family asks the same list its page does (getBook, getCouncil,
 * getAkathist, getHour, MY_RULE_PARTS, the saints), loaded only when an
 * address of that family is asked, so no real page can be answered 404 and
 * a page added to a list is never missed. It says true only when the page
 * itself would call notFound(): an address with a dot in it (a file, which
 * public/ serves), an index, and any address of another shape are left to
 * the routes (Next answers an address no route has with a true 404 itself).
 * The shop's stores come from the database and are not checked here.
 */
export async function unknownAddress(pathname: string): Promise<boolean> {
  const parts = pathname.replace(/\/$/, "").split("/").slice(1);
  if (parts.length < 2 || parts.some((p) => !p || p.includes("."))) return false;
  const [family, a, b] = parts;
  switch (family) {
    case "saints": {
      const { unknownSaintAddress } = await import("@/lib/saints/addresses");
      return unknownSaintAddress(pathname);
    }
    case "bible": {
      // /bible/[book]/[chapter], read as the chapter's page reads it.
      if (parts.length !== 3) return false;
      const { getBook } = await import("@/lib/bible/books");
      const book = getBook(a);
      const n = Number(b);
      return !book || !Number.isInteger(n) || n < 1 || n > book.chapters;
    }
    case "councils": {
      // /councils/[slug] and /councils/[slug]/[document] (a document the app carries).
      if (parts.length > 3) return false;
      const { getCouncil } = await import("@/lib/councils/councils");
      const council = getCouncil(a);
      if (!council) return true;
      return parts.length === 3 && !council.documents.some((d) => d.slug === b && !d.href);
    }
    case "prayers": {
      if (parts.length !== 3) return false;
      if (a === "akathists") return !(await import("@/lib/prayers/akathists")).getAkathist(b);
      if (a === "hours") return !(await import("@/lib/prayers/hours")).getHour(b);
      if (a === "personal") return !((await import("@/lib/prayers/myRule")).MY_RULE_PARTS as readonly string[]).includes(b);
      return false;
    }
    default:
      return false;
  }
}
