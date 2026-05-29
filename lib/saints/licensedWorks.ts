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
  amazonAsin: string;
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
