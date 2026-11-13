import { promises as fs } from "node:fs";
import path from "node:path";

export type LicensedWork = {
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  authorRole?: "by" | "about" | "edited" | "translated";
  publisher: string;
  year?: number;
  blurb: string;
  topics?: string[];
  /**
   * The book on Amazon, through the associate link. Optional (1.9, build 95
   * note 29): a book listed only for study links to its publisher's own page
   * (`directPublisherUrl`), never to a shop that pays us.
   */
  amazonAsin?: string;
  /** Another title the book is known by, shown under its own ("Also known as ..."). */
  alsoKnownAs?: string;
  /**
   * Our own picture of the book's cover: a path on this site ("/..."), never
   * another host, which a reader's device would call as the page opens (143;
   * lib/ui/__tests__/noThirdPartyLoads.test.ts reads every file).
   */
  coverImageUrl?: string;
  directPublisherUrl?: string;
};

type LicensedWorksFile = { works: LicensedWork[] };

/**
 * Reads data/saints/{slug}/licensed-works.json. Returns [] when the file
 * is absent so saints without curated entries simply omit the section.
 */
export async function getLicensedWorks(slug: string): Promise<LicensedWork[]> {
  const file = path.join(
    process.cwd(),
    "data",
    "saints",
    slug,
    "licensed-works.json",
  );
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as LicensedWorksFile;
    return Array.isArray(parsed?.works) ? parsed.works : [];
  } catch {
    return [];
  }
}
